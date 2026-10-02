"""Verify durable state through the real Home Assistant Store, including failures."""

from copy import deepcopy
from unittest.mock import AsyncMock, patch

import pytest

from homeassistant.helpers.storage import Store
from homeassistant.util.file import WriteError

from custom_components.ha_baby_tracker.storage import BabyTrackerStorage


@pytest.mark.parametrize("operation", ["add", "update", "delete", "start", "stop", "migrate"])
async def test_write_failure_never_reports_success_or_changes_cached_state(hass, operation):
    storage = BabyTrackerStorage(hass, "qa-durable-child")
    record = await storage.async_add_entry("feeding", {"amount": 100})
    await storage.async_start_timer("sleep", start_ms=1700000000000)
    before = await storage.async_get_state()

    async def mutate():
        if operation == "add":
            return await storage.async_add_entry("feeding", {"amount": 200})
        if operation == "update":
            return await storage.async_update_entry("feeding", record["id"], {"amount": 200})
        if operation == "delete":
            return await storage.async_delete_entry("feeding", record["id"])
        if operation == "start":
            return await storage.async_start_timer("bf", start_ms=1700000001000, side="left")
        if operation == "stop":
            return await storage.async_stop_timer("sleep", end_ms=1700000060000)
        return await storage.async_apply_migration({"diapers": [{"type": "wet"}]}, {})

    # Store.async_save logs and swallows this exception in supported HA versions.
    # The integration must independently confirm persistence before acknowledging it.
    with patch.object(Store, "_async_write_data", AsyncMock(side_effect=WriteError("disk unavailable"))):
        with pytest.raises(ValueError, match="save"):
            await mutate()

    assert await storage.async_get_state() == before
    reloaded = BabyTrackerStorage(hass, "qa-durable-child")
    assert await reloaded.async_get_state() == before


async def test_second_parent_start_keeps_existing_timer_start_and_side(hass):
    storage = BabyTrackerStorage(hass, "qa-timer-child")
    first = await storage.async_start_timer("bf", start_ms=1700000000000, side="left")
    second = await storage.async_start_timer("bf", start_ms=1700000060000, side="right")
    assert second == first
    assert (await BabyTrackerStorage(hass, "qa-timer-child").async_get_state())["running_timers"]["bf"] == first


async def test_successful_migration_survives_a_new_storage_instance(hass):
    storage = BabyTrackerStorage(hass, "qa-migration-child")
    timer = {"startTime": 1700000000000}
    result = await storage.async_apply_migration({"feeding": [{"id": "legacy-one", "amount": 175}]}, {"sleep": timer})
    assert result["migrated"] == {"feeding": 1}
    persisted = await BabyTrackerStorage(hass, "qa-migration-child").async_get_state()
    assert persisted["feeding"][0]["amount"] == 175
    assert persisted["running_timers"]["sleep"] == timer
    await storage.async_apply_migration({"feeding": [{"id": "legacy-one", "amount": 175}]}, {"sleep": deepcopy(timer)})
    assert await BabyTrackerStorage(hass, "qa-migration-child").async_get_state() == persisted


async def test_linked_feeding_and_lactation_are_saved_together_or_not_at_all(hass):
    storage = BabyTrackerStorage(hass, "qa-linked-child")
    entries = [
        {"category": "feeding", "entry": {"type": "breast", "linkedId": "qa-link"}},
        {"category": "lactation", "entry": {"type": "breastfeed", "linkedId": "qa-link"}},
    ]
    before = await storage.async_get_state()
    with patch.object(Store, "_async_write_data", AsyncMock(side_effect=WriteError("disk unavailable"))):
        with pytest.raises(ValueError, match="save"):
            await storage.async_add_entries(entries)
    assert await storage.async_get_state() == before
    result = await storage.async_add_entries(entries)
    persisted = await BabyTrackerStorage(hass, "qa-linked-child").async_get_state()
    assert len(result) == 2
    assert len(persisted["feeding"]) == len(persisted["lactation"]) == 1
    assert persisted["feeding"][0]["linkedId"] == persisted["lactation"][0]["linkedId"]
