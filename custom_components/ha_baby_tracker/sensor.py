"""Sensor entities for HA Baby Tracker."""

from __future__ import annotations

from datetime import timedelta, timezone
from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import UnitOfTime
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.event import async_track_time_change, async_track_time_interval
from homeassistant.util import dt as dt_util

from .const import DATA_STORES, DOMAIN, MANUFACTURER, MODEL, signal_child_updated
from .model import (
    CATEGORY_DIAPERS,
    CATEGORY_FEEDING,
    count_entries_on_date,
    last_entry_datetime,
)
from .storage import BabyTrackerStorage
from .daily import daily_summary, feeding_records


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
            DailyDurationSensor(hass, entry, 'sleep', 'sleep_today', 'Sleep today', 'sleep_hours', UnitOfTime.HOURS),
            DailyDurationSensor(hass, entry, CATEGORY_FEEDING, 'since_last_feeding', 'Since last feeding', 'feeding_elapsed_minutes', UnitOfTime.MINUTES),
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
        state = await self._storage.async_get_state()
        entries = feeding_records(state) if self.category == CATEGORY_FEEDING else state[self.category]
        self._attr_native_value = last_entry_datetime(entries, tz=timezone.utc)


class TodayCountSensor(BabyTrackerSensorBase):
    """Measurement of the logged entries in the current local day."""

    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, hass, entry, category, key, name):
        super().__init__(hass, entry, category, key, name)
        self._attr_native_unit_of_measurement = 'feedings' if category == CATEGORY_FEEDING else 'diapers' 

    async def async_update(self) -> None:
        """Update today's counter from Store."""
        now = dt_util.now()
        tz = now.tzinfo or timezone.utc
        state = await self._storage.async_get_state()
        summary = daily_summary(state, now.date(), tz=tz, now=now)
        self._attr_native_value = summary['feedings' if self.category == CATEGORY_FEEDING else 'diapers']


class DailyDurationSensor(BabyTrackerSensorBase):
    """Recorded sleep or elapsed time since confirmed intake, never a guess."""
    _attr_device_class = SensorDeviceClass.DURATION
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_suggested_display_precision = 2

    def __init__(self, hass, entry, category, key, name, metric, unit):
        super().__init__(hass, entry, category, key, name)
        self.metric = metric
        self._attr_native_unit_of_measurement = unit

    async def async_added_to_hass(self):
        await super().async_added_to_hass()
        if self.metric == 'feeding_elapsed_minutes':
            self.async_on_remove(async_track_time_interval(self.hass, self._handle_midnight, timedelta(minutes=1)))

    async def async_update(self):
        now = dt_util.now()
        state = await self._storage.async_get_state()
        self._attr_native_value = daily_summary(state, now.date(), tz=now.tzinfo or timezone.utc, now=now)[self.metric]
