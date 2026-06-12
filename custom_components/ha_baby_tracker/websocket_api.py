"""WebSocket API for HA Baby Tracker."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.const import CONF_DEVICE_ID
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.dispatcher import async_dispatcher_send

from .const import (
    DATA_STORES,
    DOMAIN,
    EVENT_ENTRY_ADDED,
    signal_child_updated,
)
from .model import CATEGORIES, TIMER_BF, TIMER_SLEEP
from .storage import BabyTrackerStorage, plan_local_migration


def _stores(hass: HomeAssistant) -> dict[str, BabyTrackerStorage]:
    return hass.data[DOMAIN][DATA_STORES]


def _storage(hass: HomeAssistant, entry_id: str) -> BabyTrackerStorage:
    return _stores(hass)[entry_id]


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/list_children"})
@websocket_api.async_response
async def _ws_list_children(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return configured child entries."""
    children = []
    registry = dr.async_get(hass)
    for entry in hass.config_entries.async_entries(DOMAIN):
        device_id = None
        for device in registry.devices.values():
            if (DOMAIN, entry.entry_id) in device.identifiers:
                device_id = device.id
                break
        children.append(
            {
                "entry_id": entry.entry_id,
                "name": entry.title,
                "date_of_birth": entry.data.get("date_of_birth"),
                "device_id": device_id,
            }
        )
    connection.send_result(msg["id"], {"children": children})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/get_data",
        vol.Optional("entry_id"): str,
        vol.Optional("child"): str,
        vol.Required("category"): vol.In(CATEGORIES),
        vol.Optional("since"): vol.Any(str, int, float),
    }
)
@websocket_api.async_response
async def _ws_get_data(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return one data category for a child."""
    try:
        entry_id = _resolve_entry_id(hass, msg)
        category = msg["category"]
        data = await _storage(hass, entry_id).async_get_category(
            category, since=str(msg.get("since")) if msg.get("since") is not None else None
        )
        state = await _storage(hass, entry_id).async_get_state()
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_payload", str(err))
        return
    connection.send_result(
        msg["id"],
        {
            "entry_id": entry_id,
            "category": category,
            "data": data,
            "running_timers": state["running_timers"],
        },
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/add_entry",
        vol.Optional("entry_id"): str,
        vol.Optional("child"): str,
        vol.Required("category"): vol.In(CATEGORIES),
        vol.Required("entry"): dict,
    }
)
@websocket_api.async_response
async def _ws_add_entry(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Add one entry. Household users may log entries without admin rights."""
    try:
        entry_id = _resolve_entry_id(hass, msg)
        category = msg["category"]
        entry = await _storage(hass, entry_id).async_add_entry(category, msg["entry"])
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_payload", str(err))
        return
    _notify_entry_added(hass, entry_id, category)
    connection.send_result(msg["id"], {"entry_id": entry_id, "entry": entry})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/update_entry",
        vol.Optional("entry_id"): str,
        vol.Optional("child"): str,
        vol.Required("category"): vol.In(CATEGORIES),
        vol.Required("id"): str,
        vol.Required("entry"): dict,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def _ws_update_entry(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update one entry by id."""
    try:
        entry_id = _resolve_entry_id(hass, msg)
        category = msg["category"]
        entry = await _storage(hass, entry_id).async_update_entry(
            category, msg["id"], msg["entry"]
        )
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_payload", str(err))
        return
    _notify_entry_added(hass, entry_id, category)
    connection.send_result(msg["id"], {"entry_id": entry_id, "entry": entry})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/delete_entry",
        vol.Optional("entry_id"): str,
        vol.Optional("child"): str,
        vol.Required("category"): vol.In(CATEGORIES),
        vol.Required("id"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def _ws_delete_entry(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete one entry by id."""
    try:
        entry_id = _resolve_entry_id(hass, msg)
        category = msg["category"]
        deleted = await _storage(hass, entry_id).async_delete_entry(category, msg["id"])
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_payload", str(err))
        return
    if deleted:
        _notify_entry_added(hass, entry_id, category)
    connection.send_result(msg["id"], {"entry_id": entry_id, "deleted": deleted})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/timer_start",
        vol.Optional("entry_id"): str,
        vol.Optional("child"): str,
        vol.Required("kind"): vol.In([TIMER_SLEEP, TIMER_BF]),
        vol.Optional("side"): vol.In(["left", "right"]),
    }
)
@websocket_api.async_response
async def _ws_timer_start(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Start a sleep or breastfeeding timer."""
    try:
        entry_id = _resolve_entry_id(hass, msg)
        timer = await _storage(hass, entry_id).async_start_timer(
            msg["kind"], start_ms=_now_ms(), side=msg.get("side")
        )
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_payload", str(err))
        return
    _notify_entry_added(hass, entry_id, "running_timers")
    connection.send_result(msg["id"], {"entry_id": entry_id, "timer": timer})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/timer_stop",
        vol.Optional("entry_id"): str,
        vol.Optional("child"): str,
        vol.Required("kind"): vol.In([TIMER_SLEEP, TIMER_BF]),
    }
)
@websocket_api.async_response
async def _ws_timer_stop(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Stop a sleep or breastfeeding timer."""
    try:
        entry_id = _resolve_entry_id(hass, msg)
        result = await _storage(hass, entry_id).async_stop_timer(
            msg["kind"], end_ms=_now_ms()
        )
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_payload", str(err))
        return
    _notify_entry_added(hass, entry_id, result["category"])
    connection.send_result(msg["id"], {"entry_id": entry_id, **result})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/migrate_local_data",
        vol.Required("children"): [str],
        vol.Required("data_by_index"): dict,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def _ws_migrate_local_data(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Migrate the card's localStorage dump into matching child entries."""
    entries_by_name = {
        entry.title: entry.entry_id for entry in hass.config_entries.async_entries(DOMAIN)
    }
    existing_states = {
        entry_id: await storage.async_get_state()
        for entry_id, storage in _stores(hass).items()
    }
    try:
        plan = plan_local_migration(
            {"children": msg["children"], "data_by_index": msg["data_by_index"]},
            entries_by_name=entries_by_name,
            existing_states=existing_states,
        )
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_payload", str(err))
        return

    migrated: dict[str, Any] = {}
    for entry_id, item in plan["migrate"].items():
        categories = item.get("categories") or {}
        timers = item.get("running_timers") or {}
        if not categories and not timers:
            continue
        migrated[entry_id] = await _storage(hass, entry_id).async_apply_migration(
            categories, timers
        )
        for category in categories:
            _notify_entry_added(hass, entry_id, category)
        if timers:
            _notify_entry_added(hass, entry_id, "running_timers")

    connection.send_result(
        msg["id"],
        {
            "migrated": migrated,
            "unmigrated": plan["unmigrated"],
            "skipped_non_empty": plan["skipped_non_empty"],
        },
    )


def async_register_commands(hass: HomeAssistant) -> None:
    """Register all websocket commands."""
    for handler in (
        _ws_list_children,
        _ws_get_data,
        _ws_add_entry,
        _ws_update_entry,
        _ws_delete_entry,
        _ws_timer_start,
        _ws_timer_stop,
        _ws_migrate_local_data,
    ):
        websocket_api.async_register_command(hass, handler)


def _resolve_entry_id(hass: HomeAssistant, msg: dict[str, Any]) -> str:
    if entry_id := msg.get("entry_id"):
        if entry_id in _stores(hass):
            return str(entry_id)
        raise ValueError(f"unknown entry_id: {entry_id}")
    if child := msg.get("child"):
        child_name = str(child)
        for entry in hass.config_entries.async_entries(DOMAIN):
            if entry.title == child_name:
                return entry.entry_id
        raise ValueError(f"unknown child: {child_name}")
    if device_id := msg.get(CONF_DEVICE_ID):
        registry = dr.async_get(hass)
        device = registry.async_get(str(device_id))
        if device:
            for domain, identifier in device.identifiers:
                if domain == DOMAIN:
                    return identifier
    entries = hass.config_entries.async_entries(DOMAIN)
    if len(entries) == 1:
        return entries[0].entry_id
    raise ValueError("child or entry_id is required")


def _notify_entry_added(hass: HomeAssistant, entry_id: str, category: str) -> None:
    async_dispatcher_send(hass, signal_child_updated(entry_id), category)
    hass.bus.async_fire(EVENT_ENTRY_ADDED, {"entry_id": entry_id, "category": category})


def _now_ms() -> int:
    return int(datetime.now(timezone.utc).timestamp() * 1000)
