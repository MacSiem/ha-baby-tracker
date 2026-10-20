"""Pure per-child daily summaries for saved Baby Tracker records.

Sleep totals are known saved duration: running timers are deliberately separate.
Legacy durations without endpoints contribute only to their known calendar day;
``sleep_unpositioned`` identifies those records for consumers without inventing an
hourly position. If a relevant sleep duration is unknown the full total is None.
"""
from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone, tzinfo
from math import isfinite
import re
from typing import Any

from .model import entry_date, entry_timestamp_ms, normalize_state


def feeding_records(state: Any) -> list[dict[str, Any]]:
    """Return saved intake records, deduplicating only explicit linked IDs.

    Bottle/solid/breast records, lactation breastfeeds and completed breastfeeding
    sessions share this source. Pumping and other lactation records are excluded.
    The caller supplies one child's Store; names never determine identity here.
    """
    saved = normalize_state(state)
    combined = [
        *saved["feeding"],
        *(entry for entry in saved["lactation"]
          if isinstance(entry, dict) and entry.get("type") == "breastfeed"),
        *saved["bf_sessions"],
    ]
    records: list[dict[str, Any]] = []
    seen: set[str | int | float] = set()
    for entry in combined:
        if not isinstance(entry, dict):
            continue
        link = entry.get("linkedId")
        # Producers use nonempty strings; legacy scalar IDs remain comparable.
        linked = isinstance(link, (str, int, float)) and not isinstance(link, bool) and bool(link)
        if linked:
            if link in seen:
                continue
            seen.add(link)
        records.append(entry)
    return records


def _timestamp(entry: dict[str, Any]) -> int | None:
    """Use model timestamp compatibility without guessing naive ISO offsets."""
    # HH:MM is a form display field, not a dated instant. The model already
    # ignores it. ISO fallback must likewise carry an explicit timezone.
    value = entry.get("time")
    if isinstance(value, str) and "T" in value:
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            parsed = None
        if parsed is None or parsed.tzinfo is None:
            entry = {key: value for key, value in entry.items() if key != "time"}
    return entry_timestamp_ms(entry)


def _day(entry: dict[str, Any], tz: tzinfo) -> date | None:
    """Prefer the recorded instant to legacy date strings (often UTC dates)."""
    stamp = _timestamp(entry)
    if stamp is not None:
        try:
            return datetime.fromtimestamp(stamp / 1000, tz).date()
        except (ValueError, OverflowError, OSError):
            pass
    # Only the persisted calendar date is a valid fallback; never a form clock.
    return entry_date({"date": entry.get("date")}, tz=tz)


def _endpoint(value: Any) -> float | None:
    """Read actual card startTime/endTime values as milliseconds."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    try:
        number = float(value)
        if not isfinite(number):
            return None
        datetime.fromtimestamp(number / 1000, timezone.utc)
    except (ValueError, OverflowError, OSError):
        return None
    return number


def _minutes(value: Any) -> float | None:
    """Match saved card durations, including its supported decimal strings."""
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        return None
    if isinstance(value, str):
        if not re.fullmatch(r"\d+(?:[.,]\d+)?", value.strip()):
            return None
        value = value.strip().replace(",", ".")
    try:
        number = float(value)
    except (ValueError, OverflowError):
        return None
    return number if isfinite(number) and number >= 0 else None


def daily_summary(
    state: Any, target_date: date, *, tz: tzinfo, now: datetime
) -> dict[str, int | float | None]:
    """Summarize one child's saved records for a local HA calendar day.

    ``now`` must be an aware datetime. Elapsed feeding time is independent of
    target_date and unknown if the newest real feeding instant is in the future.
    Sleep endpoints override stored rounded duration and are unioned before
    adding unpositioned legacy minutes. A missing relevant duration leaves the
    complete total unknown, including mixtures with known saved intervals.
    """
    saved = normalize_state(state)
    feedings = feeding_records(saved)
    stamps = [stamp for entry in feedings if (stamp := _timestamp(entry)) is not None]
    elapsed: float | None = None
    if stamps and now.tzinfo is not None and now.utcoffset() is not None:
        delta = now.timestamp() * 1000 - max(stamps)
        if delta >= 0:
            elapsed = delta / 60_000

    # Convert each local midnight independently: adding 24h on the UTC axis
    # would give the wrong boundary on the spring/fall DST transition days.
    start = datetime.combine(target_date, time.min, tzinfo=tz).timestamp() * 1000
    end = datetime.combine(target_date + timedelta(days=1), time.min, tzinfo=tz).timestamp() * 1000
    intervals: list[tuple[float, float]] = []
    legacy_minutes = 0.0
    unpositioned = 0
    known_duration = False
    unknown_duration = False
    for entry in saved["sleep"]:
        if not isinstance(entry, dict):
            unknown_duration = True
            continue
        local_day = _day(entry, tz)
        if "startTime" in entry or "endTime" in entry:
            sleep_start = _endpoint(entry.get("startTime"))
            sleep_end = _endpoint(entry.get("endTime"))
            if sleep_start is None or sleep_end is None or sleep_end < sleep_start:
                # A corrupted explicit interval must not be rescued by its
                # duration field: that would place uncertain sleep on a day.
                endpoint_days = set()
                for value in (sleep_start, sleep_end):
                    if value is not None:
                        try:
                            endpoint_days.add(datetime.fromtimestamp(value / 1000, tz).date())
                        except (ValueError, OverflowError, OSError):
                            pass
                if local_day in (None, target_date) or target_date in endpoint_days:
                    unknown_duration = True
                continue
            clipped_start, clipped_end = max(start, sleep_start), min(end, sleep_end)
            if clipped_end > clipped_start:
                intervals.append((clipped_start, clipped_end))
                known_duration = True
            elif sleep_start == sleep_end and start <= sleep_start < end:
                known_duration = True
            continue
        if local_day != target_date:
            if local_day is None:
                unknown_duration = True
            continue
        duration = _minutes(entry.get("duration"))
        if duration is None:
            unknown_duration = True
            continue
        legacy_minutes += duration
        unpositioned += 1
        known_duration = True

    union_ms = 0.0
    previous_end: float | None = None
    for sleep_start, sleep_end in sorted(intervals):
        union_ms += max(0.0, sleep_end - max(sleep_start, previous_end if previous_end is not None else sleep_start))
        previous_end = max(previous_end if previous_end is not None else sleep_end, sleep_end)
    sleep_hours = (union_ms / 60_000 + legacy_minutes) / 60
    if unknown_duration:
        sleep_hours = None
    return {
        "feedings": sum(_day(entry, tz) == target_date for entry in feedings),
        "diapers": sum(_day(entry, tz) == target_date for entry in saved["diapers"] if isinstance(entry, dict)),
        "sleep_hours": sleep_hours,
        "feeding_elapsed_minutes": elapsed,
        "sleep_unpositioned": unpositioned,
    }
