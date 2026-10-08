"""Durable Lovelace ownership: user resources never become integration property."""

from copy import deepcopy
import asyncio
from unittest.mock import AsyncMock, patch

import pytest
from homeassistant.helpers.storage import Store
from homeassistant.setup import async_setup_component
from homeassistant.util.file import WriteError

from custom_components.ha_baby_tracker import async_unload_entry
from custom_components.ha_baby_tracker import frontend as card
from custom_components.ha_baby_tracker.const import (
    CARD_URL, DATA_FRONTEND_REGISTERED, DATA_PANEL_REQUESTERS,
    DATA_STORES, DOMAIN,
)
from tests_ha.test_frontend import _setup

KEY = "ha_baby_tracker.frontend"
RUNTIME_KEY = "ha_baby_tracker_frontend_ownership"


def _store(hass):
    return Store(hass, 1, KEY, private=True, atomic_writes=True)


async def _resources(hass):
    assert await async_setup_component(hass, "lovelace", {})
    resources = hass.data["lovelace"].resources
    await resources.async_load()
    resources.loaded = True
    return resources


async def _owned(hass):
    data = await _store(hass).async_load()
    return (data or {}).get("owned_resources", [])


async def test_manual_same_url_duplicates_survive_setup_reload_and_unload(hass):
    resources = await _resources(hass)
    for url in (CARD_URL, f"{CARD_URL}?v=manual"):
        await resources.async_create_item({"res_type": "module", "url": url})
    before = deepcopy(list(resources.async_items()))
    entry = await _setup(hass)
    assert list(resources.async_items()) == before
    assert await _owned(hass) == []
    assert await hass.config_entries.async_reload(entry.entry_id)
    assert list(resources.async_items()) == before
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert list(resources.async_items()) == before


async def test_owned_id_survives_runtime_restart_and_version_upgrade(hass):
    resources = await _resources(hass)
    assert await card.async_register_card(hass) == "resource"
    original = list(resources.async_items())[0]
    assert await _owned(hass) == [original]
    hass.data.pop(RUNTIME_KEY, None)
    with patch.object(card, "VERSION", "next-version"):
        assert await card.async_register_card(hass) == "resource"
    updated = list(resources.async_items())[0]
    assert updated["id"] == original["id"]
    assert updated["url"] == f"{CARD_URL}?v=next-version"
    assert await _owned(hass) == [updated]
    await card.async_unregister_card(hass)
    assert list(resources.async_items()) == []
    assert await _owned(hass) == []
    await card.async_register_card(hass)
    assert list(resources.async_items())[0]["id"] != original["id"]


@pytest.mark.parametrize("existing_first", [True, False])
async def test_hacs_and_manual_duplicates_are_preserved(hass, existing_first):
    resources = await _resources(hass)
    if not existing_first:
        await card.async_register_card(hass)
    for url in ("/hacsfiles/ha-baby-tracker/ha-baby-tracker.js?hacstag=1", CARD_URL, f"{CARD_URL}?manual=2"):
        await resources.async_create_item({"res_type": "module", "url": url})
    foreign = deepcopy([item for item in resources.async_items() if item["url"] != card.versioned_card_url()])
    assert await card.async_register_card(hass) == "existing_resource"
    assert list(resources.async_items()) == foreign
    await card.async_unregister_card(hass)
    assert list(resources.async_items()) == foreign
    assert await _owned(hass) == []


@pytest.mark.parametrize("edit", ["url", "type", "delete"])
async def test_user_edit_or_deletion_relinquishes_owned_id(hass, edit):
    resources = await _resources(hass)
    await card.async_register_card(hass)
    original = list(resources.async_items())[0]
    if edit == "delete":
        await resources.async_delete_item(original["id"])
    else:
        changes = {"url": f"{CARD_URL}?user=edited"} if edit == "url" else {"res_type": "js"}
        await resources.async_update_item(original["id"], changes)
    before = deepcopy(list(resources.async_items()))
    hass.data.pop(RUNTIME_KEY, None)
    await card.async_unregister_card(hass)
    assert list(resources.async_items()) == before
    assert await _owned(hass) == []


async def test_concurrent_registration_creates_one_durable_id(hass):
    resources = await _resources(hass)
    await asyncio.gather(*(card.async_register_card(hass) for _ in range(3)))
    items = list(resources.async_items())
    assert len(items) == 1
    assert await _owned(hass) == items


@pytest.mark.parametrize("swallowed", [True, False])
async def test_ownership_save_failure_rolls_back_only_created_id(hass, swallowed):
    resources = await _resources(hass)
    unrelated = await resources.async_create_item({"res_type": "module", "url": "/other.js"})
    original_write = Store._async_write_data

    async def fail_ownership(self, *args, **kwargs):
        if self.key == KEY:
            raise WriteError("disk unavailable")
        return await original_write(self, *args, **kwargs)

    if swallowed:
        failure = patch.object(Store, "_async_write_data", fail_ownership)
    else:
        original_save = Store.async_save

        async def fail_save(self, *args, **kwargs):
            if self.key == KEY:
                raise OSError("disk unavailable")
            return await original_save(self, *args, **kwargs)

        failure = patch.object(Store, "async_save", fail_save)
    with failure, pytest.raises((ValueError, OSError)):
        await card.async_register_card(hass)
    assert list(resources.async_items()) == [unrelated]
    assert await _owned(hass) == []
    await card.async_register_card(hass)
    assert len(await _owned(hass)) == 1


async def test_delete_failure_retains_ownership_for_retry(hass):
    resources = await _resources(hass)
    await card.async_register_card(hass)
    before = deepcopy(list(resources.async_items()))
    with patch.object(resources, "async_delete_item", AsyncMock(side_effect=OSError("delete unavailable"))):
        with pytest.raises(OSError):
            await card.async_unregister_card(hass)
    assert list(resources.async_items()) == before
    assert await _owned(hass) == before
    await card.async_unregister_card(hass)
    assert list(resources.async_items()) == []
    assert await _owned(hass) == []


async def test_failed_last_child_unload_keeps_frontend_and_requester(hass):
    resources = await _resources(hass)
    entry = await _setup(hass, panel=True)
    before = deepcopy(list(resources.async_items()))
    bucket = hass.data[DOMAIN]
    with patch.object(hass.config_entries, "async_unload_platforms", AsyncMock(return_value=False)):
        assert not await async_unload_entry(hass, entry)
    assert entry.entry_id in bucket[DATA_STORES]
    assert entry.entry_id in bucket[DATA_PANEL_REQUESTERS]
    assert bucket[DATA_FRONTEND_REGISTERED]
    assert list(resources.async_items()) == before
    assert await _owned(hass) == before


async def test_cleanup_failure_keeps_frontend_flag_until_retry(hass):
    resources = await _resources(hass)
    entry = await _setup(hass)
    with patch.object(hass.config_entries, "async_unload_platforms", AsyncMock(return_value=True)):
        with patch.object(resources, "async_delete_item", AsyncMock(side_effect=OSError("delete unavailable"))):
            assert await async_unload_entry(hass, entry)
        assert hass.data[DOMAIN][DATA_FRONTEND_REGISTERED]
        assert len(await _owned(hass)) == 1
        assert await async_unload_entry(hass, entry)
    assert not hass.data[DOMAIN].get(DATA_FRONTEND_REGISTERED)
    assert await _owned(hass) == []
    assert list(resources.async_items()) == []


async def test_unavailable_collection_preserves_receipts_for_retry(hass):
    resources = await _resources(hass)
    await card.async_register_card(hass)
    before = deepcopy(list(resources.async_items()))
    lovelace = hass.data.pop("lovelace")
    try:
        with pytest.raises(ValueError, match="unavailable"):
            await card.async_unregister_card(hass)
        assert await _owned(hass) == before
    finally:
        hass.data["lovelace"] = lovelace
    await card.async_unregister_card(hass)
    assert list(resources.async_items()) == []
    assert await _owned(hass) == []


async def test_real_config_entry_cleanup_failure_can_retry_without_platform_double_unload(hass):
    resources = await _resources(hass)
    entry = await _setup(hass)
    with patch.object(resources, "async_delete_item", AsyncMock(side_effect=OSError("delete unavailable"))):
        assert await hass.config_entries.async_unload(entry.entry_id)
    assert hass.data[DOMAIN][DATA_FRONTEND_REGISTERED]
    assert entry.entry_id not in hass.data[DOMAIN][DATA_STORES]
    # The platforms really unloaded. A normal subsequent setup reconciles the
    # retained resource, then normal unload cleans it without FAILED_UNLOAD.
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert list(resources.async_items()) == []
    assert await _owned(hass) == []
    assert not hass.data[DOMAIN].get(DATA_FRONTEND_REGISTERED)


async def test_manual_edit_during_ownership_read_is_not_deleted(hass):
    resources = await _resources(hass)
    await card.async_register_card(hass)
    owned = deepcopy(list(resources.async_items())[0])
    original_load = Store.async_load
    edited = False

    async def edit_during_load(self, *args, **kwargs):
        nonlocal edited
        if self.key == KEY and not edited:
            edited = True
            await resources.async_update_item(owned["id"], {"url": f"{CARD_URL}?manual=during-load"})
        return await original_load(self, *args, **kwargs)

    with patch.object(Store, "async_load", edit_during_load):
        await card.async_unregister_card(hass)
    items = list(resources.async_items())
    assert len(items) == 1
    assert items[0]["id"] == owned["id"]
    assert items[0]["url"] == f"{CARD_URL}?manual=during-load"
    assert await _owned(hass) == []
