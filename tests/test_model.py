"""Pure behavior tests for HA Baby Tracker model helpers."""

from __future__ import annotations

import importlib.util
import unittest
from datetime import date, datetime, timezone
from pathlib import Path


def _load_model():
    path = (
        Path(__file__).resolve().parents[1]
        / "custom_components/ha_baby_tracker/model.py"
    )
    if not path.exists():
        raise AssertionError("custom_components/ha_baby_tracker/model.py should exist")
    spec = importlib.util.spec_from_file_location("ha_baby_tracker_model", path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


class StorageCapTest(unittest.TestCase):
    """Verify Store category trimming behavior."""

    def setUp(self) -> None:
        self.model = _load_model()

    def test_trim_entries_removes_oldest_by_timestamp_without_reordering_survivors(self) -> None:
        entries = [
            {"id": "newest", "timestamp": 4000},
            {"id": "oldest", "timestamp": 1000},
            {"id": "middle", "timestamp": 3000},
            {"id": "older", "timestamp": 2000},
        ]

        trimmed, removed = self.model.trim_entries(entries, cap=2)

        self.assertEqual(2, removed)
        self.assertEqual(["newest", "middle"], [item["id"] for item in trimmed])


class MigrationMappingTest(unittest.TestCase):
    """Verify localStorage migration plan behavior."""

    def setUp(self) -> None:
        self.model = _load_model()

    def test_build_migration_plan_maps_index_to_exact_child_name_and_returns_unmatched(self) -> None:
        payload = {
            "children": ["Ala", "Ben", "Unmatched"],
            "data_by_index": {
                "0": {
                    "feeding": {"Ala": [{"timestamp": 1000, "type": "bottle"}]},
                    "diapers": {"Ala": [{"timestamp": 2000, "type": "wet"}]},
                    "_runningTimers": {
                        "sleep": {"startTime": 3000, "baby": 0},
                        "bf": {"startTime": 4000, "side": "left", "sessions": []},
                    },
                },
                "1": {
                    "breastfeeding": [
                        {"side": "right", "duration": 45, "timestamp": 5000}
                    ],
                    "growth": {"Ben": [{"date": "2026-06-12", "value": 8.1}]},
                },
                "2": {
                    "feeding": {"Unmatched": [{"timestamp": 6000, "type": "solid"}]}
                },
            },
        }

        plan = self.model.build_migration_plan(
            payload,
            entries_by_name={"Ala": "entry_ala", "Ben": "entry_ben"},
            existing_states={
                "entry_ala": self.model.default_state(),
                "entry_ben": self.model.default_state(),
            },
        )

        self.assertEqual(["Unmatched"], plan["unmigrated"])
        self.assertEqual(["diapers", "feeding"], sorted(plan["migrate"]["entry_ala"]["categories"]))
        self.assertEqual(
            {"startTime": 3000, "baby": 0},
            plan["migrate"]["entry_ala"]["running_timers"]["sleep"],
        )
        bf_session = plan["migrate"]["entry_ben"]["categories"]["bf_sessions"][0]
        self.assertEqual("right", bf_session["side"])
        self.assertEqual(45, bf_session["duration"])
        self.assertEqual(5000, bf_session["timestamp"])
        self.assertTrue(bf_session["id"])

    def test_build_migration_plan_skips_non_empty_target_categories(self) -> None:
        existing = self.model.default_state()
        existing["feeding"] = [{"timestamp": 1, "type": "bottle"}]
        payload = {
            "children": ["Ala"],
            "data_by_index": {
                "0": {
                    "feeding": {"Ala": [{"timestamp": 1000, "type": "breast"}]},
                    "diapers": {"Ala": [{"timestamp": 2000, "type": "wet"}]},
                }
            },
        }

        plan = self.model.build_migration_plan(
            payload,
            entries_by_name={"Ala": "entry_ala"},
            existing_states={"entry_ala": existing},
        )

        self.assertEqual({"entry_ala": ["feeding"]}, plan["skipped_non_empty"])
        self.assertNotIn("feeding", plan["migrate"]["entry_ala"]["categories"])
        self.assertIn("diapers", plan["migrate"]["entry_ala"]["categories"])


class DailyCounterTest(unittest.TestCase):
    """Verify sensor counter date bucketing."""

    def setUp(self) -> None:
        self.model = _load_model()

    def test_count_entries_on_date_uses_timestamp_ts_and_date_fields(self) -> None:
        entries = [
            {"timestamp": int(datetime(2026, 6, 12, 8, tzinfo=timezone.utc).timestamp() * 1000)},
            {"ts": int(datetime(2026, 6, 12, 9, tzinfo=timezone.utc).timestamp() * 1000)},
            {"date": "2026-06-12"},
            {"timestamp": int(datetime(2026, 6, 11, 23, tzinfo=timezone.utc).timestamp() * 1000)},
            {"date": "2026-06-13"},
        ]

        result = self.model.count_entries_on_date(
            entries, date(2026, 6, 12), tz=timezone.utc
        )

        self.assertEqual(3, result)


class TimerMathTest(unittest.TestCase):
    """Verify timer start/stop duration math."""

    def setUp(self) -> None:
        self.model = _load_model()

    def test_stop_sleep_timer_rounds_duration_minutes(self) -> None:
        entry = self.model.build_sleep_entry_from_timer(
            start_ms=1_780_000_000_000,
            end_ms=1_780_000_389_000,
            tz=timezone.utc,
        )

        self.assertEqual(6, entry["duration"])
        self.assertEqual(1_780_000_000_000, entry["startTime"])
        self.assertEqual(1_780_000_389_000, entry["endTime"])
        self.assertEqual("2026-05-28", entry["date"])

    def test_stop_bf_timer_records_seconds_and_side(self) -> None:
        session = self.model.build_bf_session_from_timer(
            {"startTime": 1_780_000_000_000, "side": "right"},
            end_ms=1_780_000_075_000,
        )

        self.assertEqual("right", session["side"])
        self.assertEqual(75, session["duration"])
        self.assertEqual(1_780_000_075_000, session["timestamp"])


class CopyEntryDefaultsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.model = _load_model()

    def test_copy_entry_defaults_timestamp_to_now_ms(self) -> None:
        before = int(datetime.now(tz=timezone.utc).timestamp() * 1000)
        clean = self.model.copy_entry_with_id({"type": "bottle", "amount": "90 ml"})
        after = int(datetime.now(tz=timezone.utc).timestamp() * 1000)
        self.assertTrue(before <= clean["timestamp"] <= after)
        self.assertTrue(clean["id"])

    def test_copy_entry_preserves_existing_timestamp(self) -> None:
        clean = self.model.copy_entry_with_id(
            {"type": "wet", "timestamp": 1234567890123}
        )
        self.assertEqual(1234567890123, clean["timestamp"])


if __name__ == "__main__":
    unittest.main()
