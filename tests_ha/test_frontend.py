"""Baby Tracker UI registration with multiple entries in Home Assistant."""

from __future__ import annotations

from homeassistant.components import frontend
from homeassistant.const import CONF_NAME
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.ha_baby_tracker.const import (
    CARD_URL,
    CONF_SHOW_PANEL,
    DOMAIN,
    PANEL_URL_PATH,
    VERSION,
)


async def _setup(hass: HomeAssistant, name: str = "Demo", *, panel: bool = False) -> MockConfigEntry:
    assert await async_setup_component(hass, "http", {})
    assert await async_setup_component(hass, "lovelace", {})
    entry = MockConfigEntry(
        domain=DOMAIN, title=name, data={CONF_NAME: name},
        options={CONF_SHOW_PANEL: panel}, unique_id=name.lower(),
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def test_first_child_gets_one_resource_and_no_sidebar_by_default(hass: HomeAssistant) -> None:
    await _setup(hass)
    resources = list(hass.data["lovelace"].resources.async_items())
    assert [(item["url"], item["type"]) for item in resources] == [
        (f"{CARD_URL}?v={VERSION}", "module")
    ]
    assert PANEL_URL_PATH not in hass.data[frontend.DATA_PANELS]


async def test_opted_in_panel_is_admin_only(hass: HomeAssistant) -> None:
    await _setup(hass, panel=True)
    panel = hass.data[frontend.DATA_PANELS][PANEL_URL_PATH]
    assert panel.require_admin is True
    assert panel.config["_panel_custom"]["name"] == "ha-baby-tracker"


async def test_enabling_option_registers_panel_after_entry_reload(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    hass.config_entries.async_update_entry(entry, options={CONF_SHOW_PANEL: True})
    await hass.async_block_till_done()
    assert hass.data[frontend.DATA_PANELS][PANEL_URL_PATH].require_admin is True


async def test_second_child_keeps_single_resource_and_panel_until_last_unload(hass: HomeAssistant) -> None:
    first = await _setup(hass, "Demo A", panel=True)
    second = await _setup(hass, "Demo B", panel=True)
    assert len(list(hass.data["lovelace"].resources.async_items())) == 1
    assert await hass.config_entries.async_unload(first.entry_id)
    assert PANEL_URL_PATH in hass.data[frontend.DATA_PANELS]
    assert len(list(hass.data["lovelace"].resources.async_items())) == 1
    assert await hass.config_entries.async_unload(second.entry_id)
    assert PANEL_URL_PATH not in hass.data[frontend.DATA_PANELS]
    assert list(hass.data["lovelace"].resources.async_items()) == []


async def test_existing_hacs_resource_is_preserved(hass: HomeAssistant) -> None:
    assert await async_setup_component(hass, "lovelace", {})
    resources = hass.data["lovelace"].resources
    await resources.async_load()
    resources.loaded = True
    hacs_url = "/hacsfiles/ha-baby-tracker/ha-baby-tracker.js?hacstag=1"
    await resources.async_create_item({"res_type": "module", "url": hacs_url})
    await _setup(hass)
    assert [item["url"] for item in resources.async_items()] == [hacs_url]


async def test_taken_panel_path_survives_opted_in_entry_unload(hass: HomeAssistant) -> None:
    assert await async_setup_component(hass, "frontend", {})
    frontend.async_register_built_in_panel(
        hass, "iframe", sidebar_title="Other", sidebar_icon="mdi:web",
        frontend_url_path=PANEL_URL_PATH, config={"url": "/x"},
    )
    entry = await _setup(hass, panel=True)
    assert hass.data[frontend.DATA_PANELS][PANEL_URL_PATH].component_name == "iframe"
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert PANEL_URL_PATH in hass.data[frontend.DATA_PANELS]
