"""HA Baby Tracker integration entry points."""

from __future__ import annotations

import logging
import os
from datetime import datetime, time, timezone
from typing import Any

import voluptuous as vol

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_DEVICE_ID, CONF_NAME, Platform
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.util import dt as dt_util

from .const import (
    DATA_FRONTEND_REGISTERED,
    DATA_SERVICES_REGISTERED,
    DATA_STORES,
    DATA_WS_REGISTERED,
    DOMAIN,
    EVENT_ENTRY_ADDED,
    MANUFACTURER,
    MODEL,
    SERVICE_LOG_DIAPER,
    SERVICE_LOG_FEEDING,
    SERVICE_LOG_SLEEP,
    VERSION,
    signal_child_updated,
)
from .model import (
    CATEGORY_DIAPERS,
    CATEGORY_FEEDING,
    CATEGORY_SLEEP,
    TIMER_SLEEP,
    build_sleep_entry_from_timer,
)
from .storage import BabyTrackerStorage
from .websocket_api import async_register_commands

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [Platform.SENSOR, Platform.BINARY_SENSOR]

_CARD_FILENAME = "ha-baby-tracker.js"
_CARD_URL_PATH = f"/{DOMAIN}/{_CARD_FILENAME}"
_CARD_PACKAGE_DIR = "www"

_CHILD_REF_SCHEMA = {
    vol.Optional("child"): str,
    vol.Optional("entry_id"): str,
    vol.Optional(CONF_DEVICE_ID): vol.Any(str, [str]),
}

_SERVICE_LOG_FEEDING_SCHEMA = vol.Schema(
    {
        **_CHILD_REF_SCHEMA,
        vol.Required("type"): vol.In(["breast", "bottle", "solid"]),
        vol.Optional("amount"): vol.Any(str, int, float),
        vol.Optional("side"): vol.In(["left", "right", "both"]),
        vol.Optional("notes"): str,
        vol.Optional("time"): vol.Any(str, int, float),
    }
)
_SERVICE_LOG_DIAPER_SCHEMA = vol.Schema(
    {
        **_CHILD_REF_SCHEMA,
        vol.Required("type"): vol.In(["wet", "dirty", "both"]),
        vol.Optional("notes"): str,
        vol.Optional("time"): vol.Any(str, int, float),
    }
)
_SERVICE_LOG_SLEEP_SCHEMA = vol.Schema(
    {
        **_CHILD_REF_SCHEMA,
        vol.Optional("action"): vol.In(["start", "stop"]),
        vol.Optional("start"): vol.Any(str, int, float),
        vol.Optional("end"): vol.Any(str, int, float),
    }
)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up HA Baby Tracker from a child config entry."""
    bucket = hass.data.setdefault(DOMAIN, {})
    stores = bucket.setdefault(DATA_STORES, {})

    storage = BabyTrackerStorage(hass, entry.entry_id)
    await storage.async_load()
    stores[entry.entry_id] = storage

    _async_register_child_device(hass, entry)

    if not bucket.get(DATA_WS_REGISTERED):
        async_register_commands(hass)
        bucket[DATA_WS_REGISTERED] = True

    await _async_register_frontend(hass)
    _async_register_services(hass)

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    _LOGGER.debug("HA Baby Tracker set up child %s (%s)", entry.title, entry.entry_id)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a child config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    hass.data.get(DOMAIN, {}).get(DATA_STORES, {}).pop(entry.entry_id, None)
    _LOGGER.debug("HA Baby Tracker unloaded child %s (%s)", entry.title, entry.entry_id)
    return unload_ok


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Remove the child's Store file when the config entry is deleted."""
    storage = BabyTrackerStorage(hass, entry.entry_id)
    await storage.async_remove()


async def _async_register_frontend(hass: HomeAssistant) -> None:
    """Register the bundled card under /ha_baby_tracker/."""
    bucket = hass.data.setdefault(DOMAIN, {})
    if bucket.get(DATA_FRONTEND_REGISTERED):
        return

    card_path = os.path.join(
        os.path.dirname(__file__), _CARD_PACKAGE_DIR, _CARD_FILENAME
    )
    if not await hass.async_add_executor_job(os.path.isfile, card_path):
        _LOGGER.error("Bundled HA Baby Tracker card missing at %s", card_path)
        return

    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(
                f"/{DOMAIN}", os.path.dirname(card_path), cache_headers=False
            )
        ]
    )
    add_extra_js_url(hass, f"{_CARD_URL_PATH}?v={VERSION}")
    bucket[DATA_FRONTEND_REGISTERED] = True
    _LOGGER.info("Registered ha_baby_tracker frontend")


def _async_register_services(hass: HomeAssistant) -> None:
    """Register child logging services once per HA process."""
    bucket = hass.data.setdefault(DOMAIN, {})
    if bucket.get(DATA_SERVICES_REGISTERED):
        return

    async def _handle_log_feeding(call: ServiceCall) -> None:
        entry_id = _resolve_entry_id(hass, call.data)
        storage = _storage(hass, entry_id)
        entry_time = _parse_service_time(call.data.get("time"))
        entry: dict[str, Any] = {
            "type": call.data["type"],
            "time": entry_time.strftime("%H:%M"),
            "amount": str(call.data.get("amount", "")),
            "notes": call.data.get("notes", ""),
            "timestamp": _datetime_ms(entry_time),
        }
        if side := call.data.get("side"):
            entry["side"] = side
        await storage.async_add_entry(CATEGORY_FEEDING, entry)
        _notify_entry_added(hass, entry_id, CATEGORY_FEEDING)

    async def _handle_log_diaper(call: ServiceCall) -> None:
        entry_id = _resolve_entry_id(hass, call.data)
        storage = _storage(hass, entry_id)
        entry_time = _parse_service_time(call.data.get("time"))
        entry = {
            "type": call.data["type"],
            "time": entry_time.strftime("%H:%M"),
            "notes": call.data.get("notes", ""),
            "timestamp": _datetime_ms(entry_time),
        }
        await storage.async_add_entry(CATEGORY_DIAPERS, entry)
        _notify_entry_added(hass, entry_id, CATEGORY_DIAPERS)

    async def _handle_log_sleep(call: ServiceCall) -> None:
        entry_id = _resolve_entry_id(hass, call.data)
        storage = _storage(hass, entry_id)
        action = call.data.get("action")
        start = call.data.get("start")
        end = call.data.get("end")

        if start is not None and end is not None:
            start_ms = _datetime_ms(_parse_service_time(start))
            end_ms = _datetime_ms(_parse_service_time(end))
            if end_ms <= start_ms:
                raise ValueError("end must be after start")
            await storage.async_add_entry(
                CATEGORY_SLEEP,
                build_sleep_entry_from_timer(
                    start_ms=start_ms,
                    end_ms=end_ms,
                    tz=timezone.utc,
                ),
            )
            _notify_entry_added(hass, entry_id, CATEGORY_SLEEP)
            return

        if action == "start":
            start_ms = _datetime_ms(_parse_service_time(start))
            await storage.async_start_timer(TIMER_SLEEP, start_ms=start_ms)
            _notify_entry_added(hass, entry_id, "running_timers")
            return

        if action == "stop":
            end_ms = _datetime_ms(_parse_service_time(end))
            result = await storage.async_stop_timer(TIMER_SLEEP, end_ms=end_ms)
            _notify_entry_added(hass, entry_id, result["category"])
            return

        raise ValueError("log_sleep requires action start/stop or explicit start+end")

    hass.services.async_register(
        DOMAIN,
        SERVICE_LOG_FEEDING,
        _handle_log_feeding,
        schema=_SERVICE_LOG_FEEDING_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_LOG_DIAPER,
        _handle_log_diaper,
        schema=_SERVICE_LOG_DIAPER_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_LOG_SLEEP,
        _handle_log_sleep,
        schema=_SERVICE_LOG_SLEEP_SCHEMA,
    )
    bucket[DATA_SERVICES_REGISTERED] = True


def _async_register_child_device(hass: HomeAssistant, entry: ConfigEntry) -> None:
    registry = dr.async_get(hass)
    registry.async_get_or_create(
        config_entry_id=entry.entry_id,
        identifiers={(DOMAIN, entry.entry_id)},
        manufacturer=MANUFACTURER,
        model=MODEL,
        name=entry.title,
    )


def _storage(hass: HomeAssistant, entry_id: str) -> BabyTrackerStorage:
    return hass.data[DOMAIN][DATA_STORES][entry_id]


def _resolve_entry_id(hass: HomeAssistant, data: dict[str, Any]) -> str:
    if entry_id := data.get("entry_id"):
        if entry_id in hass.data.get(DOMAIN, {}).get(DATA_STORES, {}):
            return str(entry_id)
        raise ValueError(f"unknown entry_id: {entry_id}")

    if child := data.get("child"):
        child_name = str(child)
        for entry in hass.config_entries.async_entries(DOMAIN):
            if entry.title == child_name:
                return entry.entry_id
        raise ValueError(f"unknown child: {child_name}")

    device_ids = data.get(CONF_DEVICE_ID)
    if isinstance(device_ids, str):
        device_ids = [device_ids]
    if device_ids:
        registry = dr.async_get(hass)
        for device_id in device_ids:
            device = registry.async_get(str(device_id))
            if not device:
                continue
            for domain, identifier in device.identifiers:
                if domain == DOMAIN:
                    return identifier
        raise ValueError("device_id does not belong to HA Baby Tracker")

    entries = hass.config_entries.async_entries(DOMAIN)
    if len(entries) == 1:
        return entries[0].entry_id
    raise ValueError("child, entry_id, or device_id is required")


def _notify_entry_added(hass: HomeAssistant, entry_id: str, category: str) -> None:
    async_dispatcher_send(hass, signal_child_updated(entry_id), category)
    hass.bus.async_fire(EVENT_ENTRY_ADDED, {"entry_id": entry_id, "category": category})


def _parse_service_time(value: Any = None) -> datetime:
    now = dt_util.now()
    if value is None or value == "":
        return now
    if isinstance(value, (int, float)):
        numeric = int(value)
        if numeric > 10_000_000_000:
            numeric = numeric // 1000
        return datetime.fromtimestamp(numeric, tz=timezone.utc)
    raw = str(value).strip()
    if "T" in raw:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=now.tzinfo)
    parsed_time = time.fromisoformat(raw)
    return datetime.combine(now.date(), parsed_time, tzinfo=now.tzinfo)


def _datetime_ms(value: datetime) -> int:
    if value.tzinfo is None:
        value = value.replace(tzinfo=dt_util.now().tzinfo)
    return int(value.timestamp() * 1000)
