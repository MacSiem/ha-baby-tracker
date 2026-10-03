"""Store-backed persistence for HA Baby Tracker."""

from __future__ import annotations

import asyncio
import logging
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from homeassistant.core import CoreState, HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.storage import Store

from .const import DOMAIN, STORAGE_VERSION
from .model import (
    CATEGORY_BF_SESSIONS,
    CATEGORY_LACTATION,
    CATEGORY_SLEEP,
    MAX_CATEGORY_ENTRIES,
    TIMER_BF,
    TIMER_SLEEP,
    build_bf_session_from_timer,
    build_migration_plan,
    build_sleep_entry_from_timer,
    category_or_raise,
    copy_entry_with_id,
    entry_timestamp_ms,
    merge_migration_slice,
    normalize_state,
    trim_entries,
    validate_entry_payload,
)

_LOGGER = logging.getLogger(__name__)


class BabyTrackerStorage:
    """Thin async wrapper around Home Assistant Store for one child entry."""

    def __init__(self, hass: HomeAssistant, entry_id: str) -> None:
        """Bind storage to a Home Assistant instance and config entry."""
        self.hass = hass
        self.entry_id = entry_id
        self._store: Store[dict[str, Any]] = Store(
            hass, STORAGE_VERSION, f"{DOMAIN}.{entry_id}",
            private=True, atomic_writes=True,
        )
        self._lock = asyncio.Lock()
        self._data: dict[str, Any] | None = None

    async def async_load(self) -> dict[str, Any]:
        """Load persisted state, creating defaults when absent."""
        async with self._lock:
            data = await self._ensure_loaded_locked()
            return deepcopy(data)

    async def async_get_state(self) -> dict[str, Any]:
        """Return the complete persisted state."""
        return await self.async_load()

    async def async_get_category(
        self, category: str, *, since: str | None = None
    ) -> list[dict[str, Any]]:
        """Return one category, optionally filtered by an epoch-ms or ISO since value."""
        category = category_or_raise(category)
        data = await self.async_load()
        entries = data[category]
        since_ms = _parse_since_ms(since)
        if since_ms is None:
            return entries
        return [
            deepcopy(entry)
            for entry in entries
            if (entry_timestamp_ms(entry) or 0) >= since_ms
        ]

    async def async_add_entry(
        self, category: str, entry: dict[str, Any]
    ) -> dict[str, Any]:
        """Append one card-compatible entry."""
        saved = await self.async_add_entries([{"category": category, "entry": entry}])
        return saved[0]["entry"]

    async def async_add_entries(
        self, entries: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """Save one form and its optional linked record in a single transaction."""
        if not 1 <= len(entries) <= 2:
            raise ValueError("one or two entries are required")
        clean = [
            {"category": category_or_raise(item["category"]),
             "entry": copy_entry_with_id(item["entry"])}
            for item in entries
        ]
        async with self._lock:
            data = deepcopy(await self._ensure_loaded_locked())
            for item in clean:
                category, entry = item["category"], item["entry"]
                if category == CATEGORY_LACTATION:
                    data[category].insert(0, entry)
                else:
                    data[category].append(entry)
                self._apply_cap_locked(data, category)
            await self._async_save_locked(data)
            return deepcopy(clean)

    async def async_update_entry(
        self, category: str, entry_id: str, patch: dict[str, Any]
    ) -> dict[str, Any]:
        """Update one entry by id."""
        category = category_or_raise(category)
        if not entry_id:
            raise ValueError("entry_id is required")
        clean_patch = validate_entry_payload(patch)
        async with self._lock:
            data = deepcopy(await self._ensure_loaded_locked())
            for idx, existing in enumerate(data[category]):
                if str(existing.get("id")) == entry_id:
                    updated = deepcopy(existing)
                    updated.update(clean_patch)
                    updated["id"] = entry_id
                    data[category][idx] = updated
                    await self._async_save_locked(data)
                    return deepcopy(updated)
        raise ValueError("entry not found")

    async def async_delete_entry(self, category: str, entry_id: str) -> bool:
        """Delete one entry by id."""
        category = category_or_raise(category)
        if not entry_id:
            raise ValueError("entry_id is required")
        async with self._lock:
            data = deepcopy(await self._ensure_loaded_locked())
            before = len(data[category])
            data[category] = [
                entry for entry in data[category] if str(entry.get("id")) != entry_id
            ]
            deleted = len(data[category]) != before
            if deleted:
                await self._async_save_locked(data)
            return deleted

    async def async_start_timer(
        self, kind: str, *, start_ms: int, side: str | None = None
    ) -> dict[str, Any]:
        """Persist a running timer."""
        if kind == TIMER_SLEEP:
            timer = {"startTime": start_ms}
        elif kind == TIMER_BF:
            timer = {"startTime": start_ms, "side": side or "left", "sessions": []}
        else:
            raise ValueError("kind must be sleep or bf")

        async with self._lock:
            data = deepcopy(await self._ensure_loaded_locked())
            if existing := data["running_timers"].get(kind):
                return deepcopy(existing)
            data["running_timers"][kind] = timer
            await self._async_save_locked(data)
            return deepcopy(timer)

    async def async_stop_timer(self, kind: str, *, end_ms: int) -> dict[str, Any]:
        """Stop a running timer and write the resulting entry."""
        async with self._lock:
            data = deepcopy(await self._ensure_loaded_locked())
            timer = data["running_timers"].get(kind)
            if not isinstance(timer, dict) or not timer.get("startTime"):
                raise ValueError(f"{kind} timer is not running")

            if kind == TIMER_SLEEP:
                entry = copy_entry_with_id(
                    build_sleep_entry_from_timer(
                        start_ms=int(timer["startTime"]),
                        end_ms=end_ms,
                        tz=timezone.utc,
                    )
                )
                data[CATEGORY_SLEEP].append(entry)
                self._apply_cap_locked(data, CATEGORY_SLEEP)
                category = CATEGORY_SLEEP
            elif kind == TIMER_BF:
                entry = copy_entry_with_id(
                    build_bf_session_from_timer(timer, end_ms=end_ms)
                )
                data[CATEGORY_BF_SESSIONS].append(entry)
                self._apply_cap_locked(data, CATEGORY_BF_SESSIONS)
                category = CATEGORY_BF_SESSIONS
            else:
                raise ValueError("kind must be sleep or bf")

            data["running_timers"][kind] = None
            await self._async_save_locked(data)
            return {"category": category, "entry": deepcopy(entry)}

    async def async_apply_migration(
        self, categories: dict[str, list[dict[str, Any]]], running_timers: dict[str, Any]
    ) -> dict[str, Any]:
        """Merge a pre-validated localStorage migration slice into this store."""
        async with self._lock:
            data = await self._ensure_loaded_locked()
            merged, outcome = merge_migration_slice(data, categories, running_timers)
            for category in outcome["migrated"]:
                self._apply_cap_locked(merged, category)
                outcome["migrated"][category] = len(merged[category])
            await self._async_save_locked(merged)
            return {**outcome, "running_timers": deepcopy(merged["running_timers"])}

    async def async_remove(self) -> None:
        """Remove this child's Store file."""
        async with self._lock:
            await self._store.async_remove()
            self._data = None

    async def _ensure_loaded_locked(self) -> dict[str, Any]:
        """Load storage while the caller holds the lock."""
        if self._data is None:
            loaded = await self._store.async_load()
            self._data = normalize_state(loaded)
        return self._data

    async def _async_save_locked(self, data: dict[str, Any]) -> None:
        """Acknowledge a mutation only after Store can read back the saved state."""
        # Store defers writes during shutdown and logs some write errors without
        # raising. Neither case is a durable acknowledgement to the card.
        if self.hass.state is CoreState.stopping:
            raise ValueError("Cannot save while Home Assistant is stopping")
        try:
            await self._store.async_save(data)
            # A fresh Store cannot return this instance's pending write buffer.
            # async_save invalidates HA's preload cache before attempting a write.
            persisted = await Store(
                self.hass, STORAGE_VERSION, f"{DOMAIN}.{self.entry_id}",
                private=True, atomic_writes=True,
            ).async_load()
            if persisted != data:
                raise ValueError("Storage save could not be confirmed")
        except (HomeAssistantError, OSError, ValueError) as err:
            self._data = None
            raise ValueError("Storage save failed; retry after checking Home Assistant storage") from err
        self._data = deepcopy(data)

    def _apply_cap_locked(self, data: dict[str, Any], category: str) -> None:
        """Apply the soft cap to one category while the caller holds the lock."""
        entries = data.get(category) or []
        trimmed, removed = trim_entries(entries, MAX_CATEGORY_ENTRIES)
        if removed:
            _LOGGER.info(
                "Trimmed %s oldest %s entries for child entry %s",
                removed,
                category,
                self.entry_id,
            )
            data[category] = trimmed


def plan_local_migration(
    payload: dict[str, Any],
    *,
    entries_by_name: dict[str, str | list[str]],
    existing_states: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Expose migration planning from the pure model to HA-facing modules."""
    return build_migration_plan(
        payload,
        entries_by_name=entries_by_name,
        existing_states=existing_states,
    )


def _parse_since_ms(since: str | None) -> int | None:
    if not since:
        return None
    try:
        return int(float(since))
    except (TypeError, ValueError):
        pass
    try:
        value = since.replace("Z", "+00:00")
        return int(datetime.fromisoformat(value).timestamp() * 1000)
    except (AttributeError, ValueError):
        return None
