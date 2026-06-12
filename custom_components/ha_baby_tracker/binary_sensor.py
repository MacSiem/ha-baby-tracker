"""Binary sensor entities for HA Baby Tracker."""

from __future__ import annotations

from typing import Any

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.event import async_track_time_change

from .const import DATA_STORES, DOMAIN, MANUFACTURER, MODEL, signal_child_updated
from .model import TIMER_SLEEP
from .storage import BabyTrackerStorage


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities
) -> None:
    """Set up binary sensors for one child."""
    async_add_entities([SleepingBinarySensor(hass, entry)], True)


class SleepingBinarySensor(BinarySensorEntity):
    """Whether the child currently has a running sleep timer."""

    _attr_has_entity_name = True
    _attr_name = "Sleeping"

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        self._attr_unique_id = f"{entry.entry_id}_sleeping"

    @property
    def device_info(self) -> DeviceInfo:
        """Return the child device info."""
        return DeviceInfo(
            identifiers={(DOMAIN, self.entry.entry_id)},
            manufacturer=MANUFACTURER,
            model=MODEL,
            name=self.entry.title,
        )

    @property
    def _storage(self) -> BabyTrackerStorage:
        return self.hass.data[DOMAIN][DATA_STORES][self.entry.entry_id]

    async def async_added_to_hass(self) -> None:
        """Subscribe to Store writes and midnight rollover."""
        self.async_on_remove(
            async_dispatcher_connect(
                self.hass, signal_child_updated(self.entry.entry_id), self._handle_update
            )
        )
        self.async_on_remove(
            async_track_time_change(
                self.hass, self._handle_midnight, hour=0, minute=0, second=0
            )
        )
        await self.async_refresh()

    @callback
    def _handle_update(self, _category: str | None = None) -> None:
        self.hass.async_create_task(self.async_refresh())

    @callback
    def _handle_midnight(self, _now: Any) -> None:
        self.hass.async_create_task(self.async_refresh())

    async def async_refresh(self) -> None:
        """Refresh from Store and write state."""
        await self.async_update()
        self.async_write_ha_state()

    async def async_update(self) -> None:
        """Update sleeping state from Store."""
        state = await self._storage.async_get_state()
        self._attr_is_on = bool(state["running_timers"].get(TIMER_SLEEP))
