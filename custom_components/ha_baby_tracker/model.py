"""Pure data helpers for HA Baby Tracker.

This module intentionally has no Home Assistant imports so it can be tested with
``python3 tests`` outside a Home Assistant runtime.
"""

from __future__ import annotations

from copy import deepcopy
from datetime import date, datetime, timezone, tzinfo
from typing import Any
from uuid import uuid4


CATEGORY_FEEDING = "feeding"
CATEGORY_LACTATION = "lactation"
CATEGORY_DIAPERS = "diapers"
CATEGORY_SLEEP = "sleep"
CATEGORY_GROWTH = "growth"
CATEGORY_BF_SESSIONS = "bf_sessions"
CATEGORIES = (
    CATEGORY_FEEDING,
    CATEGORY_LACTATION,
    CATEGORY_DIAPERS,
    CATEGORY_SLEEP,
    CATEGORY_GROWTH,
    CATEGORY_BF_SESSIONS,
)
LOCAL_CATEGORY_KEYS = {
    CATEGORY_FEEDING: ("feeding",),
    CATEGORY_LACTATION: ("lactation",),
    CATEGORY_DIAPERS: ("diapers",),
    CATEGORY_SLEEP: ("sleep",),
    CATEGORY_GROWTH: ("growth",),
    CATEGORY_BF_SESSIONS: ("bf_sessions", "breastfeeding"),
}
MAX_CATEGORY_ENTRIES = 10_000
TIMER_SLEEP = "sleep"
TIMER_BF = "bf"


def default_state() -> dict[str, Any]:
    """Return the default persisted Store shape for one child."""
    return {
        CATEGORY_FEEDING: [],
        CATEGORY_LACTATION: [],
        CATEGORY_DIAPERS: [],
        CATEGORY_SLEEP: [],
        CATEGORY_GROWTH: [],
        CATEGORY_BF_SESSIONS: [],
        "running_timers": {TIMER_SLEEP: None, TIMER_BF: None},
    }


def normalize_state(raw: Any) -> dict[str, Any]:
    """Merge arbitrary stored data into the supported Store shape."""
    state = default_state()
    if not isinstance(raw, dict):
        return state
    for category in CATEGORIES:
        value = raw.get(category)
        state[category] = deepcopy(value) if isinstance(value, list) else []
    timers = raw.get("running_timers") or raw.get("_runningTimers")
    if isinstance(timers, dict):
        state["running_timers"] = {
            TIMER_SLEEP: deepcopy(timers.get(TIMER_SLEEP)),
            TIMER_BF: deepcopy(timers.get(TIMER_BF)),
        }
    return state


def category_or_raise(category: str) -> str:
    """Return a valid category or raise a ValueError."""
    if category not in CATEGORIES:
        raise ValueError(f"invalid category: {category}")
    return category


def validate_entry_payload(entry: dict[str, Any]) -> dict[str, Any]:
    """Return an entry copy containing only JSON scalar values."""
    if not isinstance(entry, dict):
        raise ValueError("entry must be an object")
    clean: dict[str, Any] = {}
    for key, value in entry.items():
        if not isinstance(key, str):
            raise ValueError("entry keys must be strings")
        if value is not None and not isinstance(value, (str, int, float, bool)):
            raise ValueError(f"entry field '{key}' must be a scalar value")
        clean[key] = deepcopy(value)
    return clean


def copy_entry_with_id(entry: dict[str, Any]) -> dict[str, Any]:
    """Return a clean entry copy, preserving the card shape and adding id if absent.

    Also defaults ``timestamp`` (JS-style epoch milliseconds, matching the
    card's ``Date.now()``) when the caller omitted it, so today-counters and
    timestamp sensors always see new entries.
    """
    clean = validate_entry_payload(entry)
    clean.setdefault("id", uuid4().hex)
    if not clean.get("timestamp"):
        clean["timestamp"] = int(
            datetime.now(tz=timezone.utc).timestamp() * 1000
        )
    return clean


def trim_entries(
    entries: list[dict[str, Any]], cap: int = MAX_CATEGORY_ENTRIES
) -> tuple[list[dict[str, Any]], int]:
    """Trim oldest entries over cap while preserving survivor order."""
    if cap < 0:
        raise ValueError("cap must be >= 0")
    count = len(entries)
    if count <= cap:
        return deepcopy(entries), 0
    remove_count = count - cap
    oldest_indices = {
        idx
        for idx, _entry in sorted(
            enumerate(entries), key=lambda item: (_entry_sort_ms(item[1], item[0]), item[0])
        )[:remove_count]
    }
    return [deepcopy(entry) for idx, entry in enumerate(entries) if idx not in oldest_indices], remove_count


def build_migration_plan(
    payload: dict[str, Any],
    *,
    entries_by_name: dict[str, str],
    existing_states: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Plan localStorage migration by child index -> exact child name -> entry id."""
    children = payload.get("children") or []
    data_by_index = payload.get("data_by_index") or {}
    plan: dict[str, Any] = {
        "migrate": {},
        "unmigrated": [],
        "skipped_non_empty": {},
    }
    if not isinstance(children, list) or not isinstance(data_by_index, dict):
        raise ValueError("payload must contain children list and data_by_index object")

    for index, child_name_raw in enumerate(children):
        child_name = str(child_name_raw)
        entry_id = entries_by_name.get(child_name)
        if not entry_id:
            plan["unmigrated"].append(child_name)
            continue

        raw = data_by_index.get(str(index)) or data_by_index.get(index) or {}
        if not isinstance(raw, dict):
            raw = {}
        existing = normalize_state(existing_states.get(entry_id))
        migrate_item = plan["migrate"].setdefault(
            entry_id, {"name": child_name, "categories": {}, "running_timers": {}}
        )

        for category in CATEGORIES:
            entries = _extract_local_category(raw, category, child_name)
            if not entries:
                continue
            if existing.get(category):
                plan["skipped_non_empty"].setdefault(entry_id, []).append(category)
                continue
            migrate_item["categories"][category] = [
                copy_entry_with_id(entry) for entry in entries if isinstance(entry, dict)
            ]

        timers = _extract_local_timers(raw, index)
        for kind, timer in timers.items():
            if not timer:
                continue
            if existing.get("running_timers", {}).get(kind):
                key = f"running_timers.{kind}"
                plan["skipped_non_empty"].setdefault(entry_id, []).append(key)
                continue
            migrate_item["running_timers"][kind] = deepcopy(timer)

    plan["skipped_non_empty"] = {
        entry_id: sorted(categories)
        for entry_id, categories in plan["skipped_non_empty"].items()
    }
    return plan


def count_entries_on_date(
    entries: list[dict[str, Any]], target_date: date, *, tz: tzinfo = timezone.utc
) -> int:
    """Count entries that belong to a local date."""
    return sum(1 for entry in entries if entry_date(entry, tz=tz) == target_date)


def entry_date(entry: dict[str, Any], *, tz: tzinfo = timezone.utc) -> date | None:
    """Return the date represented by an entry, if known."""
    for field in ("date",):
        value = entry.get(field)
        if isinstance(value, str) and len(value) >= 10:
            try:
                return date.fromisoformat(value[:10])
            except ValueError:
                pass
    ms = entry_timestamp_ms(entry)
    if ms is None:
        return None
    return datetime.fromtimestamp(ms / 1000, tz).date()


def entry_timestamp_ms(entry: dict[str, Any]) -> int | None:
    """Return an epoch-ms timestamp from the card's known timestamp fields."""
    for key in ("timestamp", "ts", "startTime", "endTime"):
        value = entry.get(key)
        if isinstance(value, (int, float)):
            return _normalize_epoch_ms(value)
    time_value = entry.get("time")
    if isinstance(time_value, str) and "T" in time_value:
        try:
            dt = datetime.fromisoformat(time_value.replace("Z", "+00:00"))
            return int(dt.timestamp() * 1000)
        except ValueError:
            return None
    return None


def last_entry_datetime(
    entries: list[dict[str, Any]], *, tz: tzinfo = timezone.utc
) -> datetime | None:
    """Return the newest timestamp as a datetime."""
    timestamps = [entry_timestamp_ms(entry) for entry in entries]
    known = [value for value in timestamps if value is not None]
    if not known:
        return None
    return datetime.fromtimestamp(max(known) / 1000, tz)


def build_sleep_entry_from_timer(
    *, start_ms: int, end_ms: int, tz: tzinfo = timezone.utc
) -> dict[str, Any]:
    """Return the card-compatible sleep entry for a stopped timer."""
    duration_minutes = round((end_ms - start_ms) / 60_000)
    return {
        "startTime": start_ms,
        "endTime": end_ms,
        "duration": duration_minutes,
        "date": datetime.fromtimestamp(start_ms / 1000, tz).date().isoformat(),
        "timestamp": end_ms,
    }


def build_bf_session_from_timer(timer: dict[str, Any], *, end_ms: int) -> dict[str, Any]:
    """Return the card-compatible breastfeeding session for a stopped timer."""
    start_ms = int(timer.get("startTime") or end_ms)
    return {
        "side": str(timer.get("side") or "left"),
        "duration": round((end_ms - start_ms) / 1000),
        "timestamp": end_ms,
    }


def _extract_local_category(
    raw: dict[str, Any], category: str, child_name: str
) -> list[dict[str, Any]]:
    for key in LOCAL_CATEGORY_KEYS[category]:
        value = raw.get(key)
        if isinstance(value, list):
            return deepcopy(value)
        if isinstance(value, dict):
            exact = value.get(child_name)
            if isinstance(exact, list):
                return deepcopy(exact)
    return []


def _extract_local_timers(raw: dict[str, Any], index: int) -> dict[str, Any]:
    timers = raw.get("running_timers") or raw.get("_runningTimers") or {}
    result = {TIMER_SLEEP: None, TIMER_BF: None}
    if not isinstance(timers, dict):
        return result
    sleep = timers.get(TIMER_SLEEP)
    if isinstance(sleep, dict) and sleep.get("startTime"):
        timer_baby = sleep.get("baby")
        if timer_baby is None or int(timer_baby) == index:
            result[TIMER_SLEEP] = deepcopy(sleep)
    bf = timers.get(TIMER_BF)
    if isinstance(bf, dict) and bf.get("startTime"):
        result[TIMER_BF] = deepcopy(bf)
    return result


def _entry_sort_ms(entry: dict[str, Any], fallback_index: int) -> int:
    value = entry_timestamp_ms(entry)
    if value is not None:
        return value
    return fallback_index


def _normalize_epoch_ms(value: int | float) -> int:
    """Accept epoch seconds or milliseconds and return milliseconds."""
    numeric = int(value)
    if numeric < 10_000_000_000:
        return numeric * 1000
    return numeric
