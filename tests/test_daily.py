"""Daily summaries use saved records, real intervals and the HA local timezone."""
from __future__ import annotations

from copy import deepcopy
from datetime import date, datetime, timezone
import importlib.util
from pathlib import Path
import sys
from types import ModuleType
import unittest
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1] / "custom_components/ha_baby_tracker"
WARSAW = ZoneInfo("Europe/Warsaw")


def _load_daily():
    # Load the real pure helpers without importing the HA integration __init__.
    package = "baby_daily_test_helpers"
    if package not in sys.modules:
        module = ModuleType(package)
        module.__path__ = [str(ROOT)]
        sys.modules[package] = module
    path = ROOT / "daily.py"
    if not path.exists():
        raise AssertionError("daily.py must implement the daily summary contract")
    spec = importlib.util.spec_from_file_location(package + ".daily", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def ms(value):
    return int(datetime.fromisoformat(value).timestamp() * 1000)


def interval(start, end, **extra):
    return {"startTime": ms(start), "endTime": ms(end), **extra}


class DailySummaryTests(unittest.TestCase):
    def setUp(self):
        self.daily = _load_daily()
        self.day = date(2026, 10, 20)
        self.now = datetime(2026, 10, 20, 12, tzinfo=WARSAW)

    def summary(self, state, day=None, now=None):
        return self.daily.daily_summary(state, day or self.day, tz=WARSAW, now=now or self.now)

    def test_empty_known_store_returns_zero_and_no_feeding_elapsed(self):
        self.assertEqual({"feedings": 0, "diapers": 0, "sleep_hours": 0.0,
                          "feeding_elapsed_minutes": None, "sleep_unpositioned": 0},
                         self.summary({}))

    def test_feeding_sources_count_linked_pairs_once_and_exclude_pumping(self):
        stamp = ms("2026-10-20T10:00:00+02:00")
        state = {"feeding": [{"timestamp": stamp, "linkedId": "pair", "type": "breast"},
                              {"timestamp": stamp, "type": "bottle"}],
                 "lactation": [{"ts": stamp, "linkedId": "pair", "type": "breastfeed"},
                               {"ts": stamp, "type": "breastfeed"},
                               {"ts": stamp, "type": "pump"},
                               {"ts": stamp, "type": "other"}],
                 "bf_sessions": [{"timestamp": stamp, "duration": 60},
                                 {"timestamp": stamp, "linkedId": "pair"}]}
        self.assertEqual(4, self.summary(state)["feedings"])

    def test_equal_unlinked_records_remain_distinct(self):
        record = {"timestamp": ms("2026-10-20T10:00:00+02:00"), "id": "same"}
        self.assertEqual(2, self.summary({"feeding": [record, dict(record)]})["feedings"])

    def test_timestamp_controls_local_day_despite_legacy_utc_date(self):
        stamp = ms("2026-10-19T22:30:00+00:00")
        state = {"feeding": [{"timestamp": stamp, "date": "2026-10-19"}],
                 "diapers": [{"timestamp": stamp, "date": "2026-10-19"}]}
        result = self.summary(state)
        self.assertEqual(1, result["feedings"])
        self.assertEqual(1, result["diapers"])
        self.assertEqual(0, self.summary(state, date(2026, 10, 19))["feedings"])

    def test_date_only_legacy_counts_without_inventing_feeding_clock(self):
        state = {"feeding": [{"date": "2026-10-20", "time": "08:30"}],
                 "diapers": [{"date": "2026-10-20"}, {"time": "10:30"}, {"date": "bad"}]}
        result = self.summary(state)
        self.assertEqual(1, result["feedings"])
        self.assertEqual(1, result["diapers"])
        self.assertIsNone(result["feeding_elapsed_minutes"])

    def test_latest_breastfeeding_timestamp_drives_fractional_elapsed(self):
        state = {"feeding": [{"timestamp": ms("2026-10-19T10:00:00+02:00")}],
                 "bf_sessions": [{"timestamp": ms("2026-10-20T11:58:30+02:00")}],
                 "lactation": [{"type": "pump", "ts": ms("2026-10-20T11:59:50+02:00")}]}
        self.assertEqual(1.5, self.summary(state)["feeding_elapsed_minutes"])

    def test_elapsed_can_use_previous_day_feeding(self):
        result = self.summary({"lactation": [{"type": "breastfeed", "ts": ms("2026-10-19T23:00:00+02:00")}]})
        self.assertEqual(0, result["feedings"])
        self.assertEqual(780.0, result["feeding_elapsed_minutes"])

    def test_future_latest_feeding_does_not_mask_a_confirmed_past_record(self):
        result = self.summary({"feeding": [{"timestamp": ms("2026-10-20T10:00:00+02:00")},
                                           {"timestamp": ms("2026-10-20T13:00:00+02:00")}]})
        self.assertEqual(120, result["feeding_elapsed_minutes"])
        future_only = self.summary({"feeding": [{"timestamp": ms("2026-10-20T13:00:00+02:00")}]})
        self.assertIsNone(future_only["feeding_elapsed_minutes"])

    def test_corrupt_feeding_timestamps_do_not_crash_or_create_clock(self):
        for stamp in (float("nan"), float("inf"), True, 10**100, "bad"):
            with self.subTest(stamp=stamp):
                self.assertIsNone(self.summary({"feeding": [{"timestamp": stamp}]})["feeding_elapsed_minutes"])

    def test_sleep_clips_midnight_and_unions_overlaps(self):
        state = {"sleep": [interval("2026-10-19T23:00:00+02:00", "2026-10-20T02:00:00+02:00", duration=999),
                           interval("2026-10-20T01:00:00+02:00", "2026-10-20T03:00:00+02:00"),
                           interval("2026-10-20T23:00:00+02:00", "2026-10-21T02:00:00+02:00")]}
        self.assertEqual(4.0, self.summary(state)["sleep_hours"])
        self.assertEqual(1.0, self.summary(state, date(2026, 10, 19))["sleep_hours"])
        self.assertEqual(2.0, self.summary(state, date(2026, 10, 21))["sleep_hours"])

    def test_sleep_day_is_half_open(self):
        state = {"sleep": [interval("2026-10-19T23:00:00+02:00", "2026-10-20T00:00:00+02:00"),
                           interval("2026-10-21T00:00:00+02:00", "2026-10-21T01:00:00+02:00")]}
        self.assertEqual(0.0, self.summary(state)["sleep_hours"])

    def test_full_dst_days_have_actual_23_and_25_hours(self):
        for day, start, end, hours in [
            (date(2026, 3, 29), "2026-03-29T00:00:00+01:00", "2026-03-30T00:00:00+02:00", 23.0),
            (date(2026, 10, 25), "2026-10-25T00:00:00+02:00", "2026-10-26T00:00:00+01:00", 25.0),
        ]:
            with self.subTest(day=day):
                self.assertEqual(hours, self.summary({"sleep": [interval(start, end)]}, day)["sleep_hours"])

    def test_legacy_sleep_duration_is_minutes_and_explicitly_unpositioned(self):
        state = {"sleep": [{"date": "2026-10-20", "duration": 90},
                           {"date": "2026-10-19", "duration": 45}]}
        result = self.summary(state)
        self.assertEqual(1.5, result["sleep_hours"])
        self.assertEqual(1, result["sleep_unpositioned"])

    def test_only_unknown_or_corrupt_sleep_duration_is_not_zero(self):
        for record in ({"date": "2026-10-20"}, {"date": "2026-10-20", "duration": -1},
                       {"date": "2026-10-20", "duration": float("nan")},
                       {"date": "2026-10-20", "startTime": "bad", "endTime": "bad", "duration": 60},
                       interval("2026-10-20T11:00:00+02:00", "2026-10-20T10:00:00+02:00", date="2026-10-20", duration=60)):
            with self.subTest(record=record):
                self.assertIsNone(self.summary({"sleep": [record]})["sleep_hours"])

    def test_running_timer_is_not_saved_sleep(self):
        state = {"running_timers": {"sleep": {"startTime": ms("2026-10-20T01:00:00+02:00")}}}
        self.assertEqual(0.0, self.summary(state)["sleep_hours"])

    def test_per_child_state_does_not_mutate_or_share_data(self):
        child_a = {"name": "Ala", "feeding": [{"timestamp": ms("2026-10-20T10:00:00+02:00")}],
                   "growth": [{"date": "2026-10-20", "value": 8}]}
        child_b = {"name": "Ala"}
        before = deepcopy(child_a)
        self.assertEqual(1, self.summary(child_a)["feedings"])
        self.assertEqual(0, self.summary(child_b)["feedings"])
        self.assertEqual(before, child_a)

    def test_public_feeding_records_share_count_source_without_mutating_state(self):
        stamp = ms("2026-10-20T10:00:00+02:00")
        state = {"feeding": [{"id": "feed", "timestamp": stamp, "linkedId": "pair"}],
                 "lactation": [{"id": "linked", "type": "breastfeed", "ts": stamp, "linkedId": "pair"},
                               {"id": "pump", "type": "pump", "ts": stamp},
                               {"id": "lact", "type": "breastfeed", "ts": stamp}],
                 "bf_sessions": [{"id": "bf", "timestamp": stamp}]}
        before = deepcopy(state)
        records = self.daily.feeding_records(state)
        self.assertEqual(["feed", "lact", "bf"], [record["id"] for record in records])
        self.assertEqual(len(records), self.summary(state)["feedings"])
        self.assertEqual(before, state)

    def test_mixed_known_and_unknown_sleep_is_not_a_complete_total(self):
        result = self.summary({'sleep': [
            interval('2026-10-20T01:00:00+02:00', '2026-10-20T03:00:00+02:00'),
            {'date': '2026-10-20', 'duration': 'unknown'}]})
        self.assertIsNone(result['sleep_hours'])

    def test_sleep_epoch_seconds_have_the_same_local_day_as_milliseconds(self):
        result = self.summary({'sleep': [{'startTime': ms('2026-10-19T23:00:00+02:00') / 1000,
                                          'endTime': ms('2026-10-20T02:00:00+02:00') / 1000}]})
        self.assertEqual(2.0, result['sleep_hours'])
