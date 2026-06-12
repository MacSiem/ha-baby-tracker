"""Sensor entities for HA Baby Tracker."""

from __future__ import annotations

from datetime import timezone
from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.event import async_track_time_change
from homeassistant.util import dt as dt_util

from .const import DATA_STORES, DOMAIN, MANUFACTURER, MODEL, signal_child_updated
from .model import (
    CATEGORY_DIAPERS,
    CATEGORY_FEEDING,
    count_entries_on_date,
    last_entry_datetime,
)
from .storage import BabyTrackerStorage


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities
) -> None:
    """Set up sensors for one child."""
    async_add_entities(
        [
            LastEntrySensor(hass, entry, CATEGORY_FEEDING, "last_feeding", "Last feeding"),
            LastEntrySensor(hass, entry, CATEGORY_DIAPERS, "last_diaper", "Last diaper"),
            TodayCountSensor(
                hass, entry, CATEGORY_FEEDING, "feedings_today", "Feedings today"
            ),
            TodayCountSensor(
                hass, entry, CATEGORY_DIAPERS, "diapers_today", "Diapers today"
            ),
        ],
        True,
    )


class BabyTrackerSensorBase(SensorEntity):
    """Base class for child-bound baby tracker sensors."""

    _attr_has_entity_name = True

    def __init__(
        self,
        hass: HomeAssistant,
        entry: ConfigEntry,
        category: str,
        key: str,
        name: str,
    ) -> None:
        self.hass = hass
        self.entry = entry
        self.category = category
        self._attr_unique_id = f"{entry.entry_id}_{key}"
        self._attr_name = name

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


class LastEntrySensor(BabyTrackerSensorBase):
    """Timestamp sensor for the newest entry in a category."""

    _attr_device_class = SensorDeviceClass.TIMESTAMP

    async def async_update(self) -> None:
        """Update the timestamp from Store."""
        entries = await self._storage.async_get_category(self.category)
        self._attr_native_value = last_entry_datetime(entries, tz=timezone.utc)


class TodayCountSensor(BabyTrackerSensorBase):
    """Integer sensor for today's entry count."""

    async def async_update(self) -> None:
        """Update today's counter from Store."""
        now = dt_util.now()
        tz = now.tzinfo or timezone.utc
        entries = await self._storage.async_get_category(self.category)
        self._attr_native_value = count_entries_on_date(entries, now.date(), tz=tz)
