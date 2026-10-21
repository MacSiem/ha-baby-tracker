"""WebSocket API for HA Baby Tracker."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.const import CONF_DEVICE_ID
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.dispatcher import async_dispatcher_send

from .const import (
    DATA_STORES,
    DOMAIN,
    EVENT_ENTRY_ADDED,
    signal_child_updated,
)
from .model import CATEGORIES, TIMER_BF, TIMER_SLEEP, summarize_migration_plan, validate_entry_payload
from .storage import BabyTrackerStorage, plan_local_migration
from .commands import Actor, BabyCommands, notify_update


def _stores(hass: HomeAssistant) -> dict[str, BabyTrackerStorage]:
    return hass.data[DOMAIN][DATA_STORES]


def _storage(hass: HomeAssistant, entry_id: str) -> BabyTrackerStorage:
    return _stores(hass)[entry_id]


def _commands(hass, entry_id):
    return BabyCommands(hass, _storage(hass, entry_id))


def _actor(connection):
    user = getattr(connection, 'user', None)
    return Actor(user_id=getattr(user, 'id', None))


async def _async_forward_update(hass, connection, subscription_id, data):
    if subscription_id not in connection.subscriptions:
        return
    try:
        if data.get('category') == 'access_policy':
            uid = getattr(getattr(connection, 'user', None), 'id', None)
            user = await hass.auth.async_get_user(uid) if uid else None
            if user is not None and user.is_active is True and subscription_id in connection.subscriptions:
                connection.send_event(subscription_id, {'data': {'category': 'access_policy'}})
            return
        command = _commands(hass, data.get('entry_id'))
        capabilities = await command.capabilities(_actor(connection))
        category = data.get('category')
        feature = 'feeding' if category == 'bf_sessions' else category
        if category == 'running_timers':
            visible = any(capabilities['features'][key]['read'] for key in ('feeding', 'sleep'))
        else:
            visible = capabilities['features'].get(feature, {}).get('read', False)
        if visible and subscription_id in connection.subscriptions:
            connection.send_event(subscription_id, {'data': data})
    except (PermissionError, ValueError, KeyError):
        return


def _validate_entry_schema(value: Any) -> dict[str, Any]:
    """Reject nested entry values before they reach Store or another browser."""
    try:
        return validate_entry_payload(value)
    except ValueError as err:
        raise vol.Invalid(str(err)) from err


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/subscribe"})
@callback
def _ws_subscribe(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Let authenticated household users receive child update notices."""
    @callback
    def forward(event) -> None:
        hass.async_create_task(_async_forward_update(hass, connection, msg["id"], dict(event.data)))

    connection.subscriptions[msg["id"]] = hass.bus.async_listen(EVENT_ENTRY_ADDED, forward)
    connection.send_result(msg["id"])


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
        try:
            capabilities = await _commands(hass, entry.entry_id).capabilities(_actor(connection))
        except (PermissionError, ValueError, KeyError):
            continue
        if not capabilities['can_manage'] and not any(ops.get('visible') for ops in capabilities['features'].values()):
            continue
        children.append(
            {
                "entry_id": entry.entry_id,
                "name": entry.title,
                "date_of_birth": entry.data.get("date_of_birth"),
                "device_id": device_id,
                "capabilities": capabilities,
            }
        )
    actor = _actor(connection)
    current_user = await hass.auth.async_get_user(actor.user_id) if actor.user_id else None
    current_children = []
    for child in children:
        try:
            fresh = _commands(hass, child['entry_id']).project_capabilities(
                current_user, child['capabilities']['revision'])
        except (PermissionError, KeyError, ValueError):
            continue
        if fresh['can_manage'] or any(ops.get('visible') for ops in fresh['features'].values()):
            current_children.append({**child, 'capabilities': fresh})
    connection.send_result(msg["id"], {"children": current_children})


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
        result = await _commands(hass, entry_id).get_data(_actor(connection), category,
            since=msg.get("since"))
    except PermissionError:
        connection.send_error(msg["id"], "unauthorized", "Baby access unavailable")
        return
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_payload", str(err))
        return
    connection.send_result(msg["id"], result)


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/get_export",
        vol.Required("entry_id"): str,
    }
)
@websocket_api.async_response
async def _ws_get_export(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Read a child export through the same native actor and resource boundary."""
    try:
        entry_id = _resolve_entry_id(hass, msg)
        result = await _commands(hass, entry_id).get_export(_actor(connection))
    except PermissionError:
        connection.send_error(msg["id"], "unauthorized", "Baby access unavailable")
        return
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_payload", str(err))
        return
    connection.send_result(msg["id"], result)


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/add_entry",
        vol.Optional("entry_id"): str,
        vol.Optional("child"): str,
        vol.Required("category"): vol.In(CATEGORIES),
        vol.Required("entry"): _validate_entry_schema,
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
        entry = await _commands(hass, entry_id).add_entry(_actor(connection), category, msg["entry"])
    except PermissionError:
        connection.send_error(msg["id"], "unauthorized", "Baby access unavailable")
        return
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_payload", str(err))
        return
    _notify_entry_added(hass, entry_id, category)
    connection.send_result(msg["id"], {"entry_id": entry_id, "entry": entry})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/add_entries",
        vol.Required("entry_id"): str,
        vol.Required("entries"): vol.All(
            [{vol.Required("category"): vol.In(CATEGORIES),
              vol.Required("entry"): _validate_entry_schema}],
            vol.Length(min=1, max=2),
        ),
    }
)
@websocket_api.async_response
async def _ws_add_entries(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Atomically add a household form and its optional linked record."""
    try:
        entry_id = _resolve_entry_id(hass, msg)
        entries = await _commands(hass, entry_id).add_entries(_actor(connection), msg["entries"])
    except PermissionError:
        connection.send_error(msg["id"], "unauthorized", "Baby access unavailable")
        return
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_payload", str(err))
        return
    for category in {item["category"] for item in entries}:
        _notify_entry_added(hass, entry_id, category)
    connection.send_result(msg["id"], {"entry_id": entry_id, "entries": entries})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/update_entry",
        vol.Optional("entry_id"): str,
        vol.Optional("child"): str,
        vol.Required("category"): vol.In(CATEGORIES),
        vol.Required("record_id"): str,
        vol.Required("entry"): _validate_entry_schema,
    }
)
# Open to all logged-in users: this is a family tool — a non-admin parent must
# be able to correct or remove a mistaken feeding/diaper entry (add_entry and
# timers were already open). migrate_local_data stays admin-only.
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
        entry = await _commands(hass, entry_id).update_entry(
            _actor(connection), category, msg["record_id"], msg["entry"]
        )
    except PermissionError:
        connection.send_error(msg["id"], "unauthorized", "Baby access unavailable")
        return
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_payload", str(err))
        return
    _notify_entry_added(hass, entry_id, category, operation="updated")
    connection.send_result(msg["id"], {"entry_id": entry_id, "entry": entry})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/delete_entry",
        vol.Optional("entry_id"): str,
        vol.Optional("child"): str,
        vol.Required("category"): vol.In(CATEGORIES),
        vol.Required("record_id"): str,
    }
)
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
        deleted = await _commands(hass, entry_id).delete_entry(_actor(connection), category, msg["record_id"])
    except PermissionError:
        connection.send_error(msg["id"], "unauthorized", "Baby access unavailable")
        return
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_payload", str(err))
        return
    if deleted:
        _notify_entry_added(hass, entry_id, category, operation="deleted")
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
        timer = await _commands(hass, entry_id).timer_start(
            _actor(connection), msg["kind"], start_ms=_now_ms(), side=msg.get("side")
        )
    except PermissionError:
        connection.send_error(msg["id"], "unauthorized", "Baby access unavailable")
        return
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_payload", str(err))
        return
    _notify_entry_added(hass, entry_id, "running_timers", operation="timer_started")
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
        result = await _commands(hass, entry_id).timer_stop(
            _actor(connection), msg["kind"], end_ms=_now_ms()
        )
    except PermissionError:
        connection.send_error(msg["id"], "unauthorized", "Baby access unavailable")
        return
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
        vol.Optional("dry_run", default=False): bool,
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
    entries_by_name: dict[str, list[str]] = {}
    for entry in hass.config_entries.async_entries(DOMAIN):
        entries_by_name.setdefault(entry.title, []).append(entry.entry_id)
    existing_states = {}
    try:
        for entry_id, storage in _stores(hass).items():
            command = _commands(hass, entry_id)
            await command._admin(_actor(connection))
            existing_states[entry_id] = await storage.async_get_state()
            await command._admin(_actor(connection))
    except PermissionError:
        connection.send_error(msg["id"], "unauthorized", "Administrator required")
        return
    try:
        plan = plan_local_migration(
            {"children": msg["children"], "data_by_index": msg["data_by_index"]},
            entries_by_name=entries_by_name,
            existing_states=existing_states,
        )
    except PermissionError:
        connection.send_error(msg["id"], "unauthorized", "Baby access unavailable")
        return
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_payload", str(err))
        return

    preview = summarize_migration_plan(plan)
    if msg.get("dry_run"):
        connection.send_result(msg["id"], {"preview": preview})
        return

    migrated: dict[str, Any] = {}
    for entry_id, item in plan["migrate"].items():
        categories = item.get("categories") or {}
        timers = item.get("running_timers") or {}
        if not categories and not timers:
            continue
        try:
            outcome = await _commands(hass, entry_id).migrate(
                _actor(connection), categories, timers
            )
        except PermissionError:
            connection.send_error(msg["id"], "unauthorized", "Administrator required")
            return
        except ValueError as err:
            connection.send_error(msg["id"], "save_failed", str(err))
            return
        migrated[entry_id] = outcome
        for category in outcome["migrated"]:
            _notify_entry_added(hass, entry_id, category, operation="migration")
        if outcome["migrated_timers"]:
            _notify_entry_added(hass, entry_id, "running_timers", operation="timer_started")

    connection.send_result(
        msg["id"],
        {
            "migrated": migrated,
            "unmigrated": plan["unmigrated"],
            "ambiguous": plan["ambiguous"],
            "skipped_non_empty": plan["skipped_non_empty"],
            "preview": preview,
        },
    )


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/get_feature_access",
                                  vol.Required("entry_id"): str})
@websocket_api.async_response
async def _ws_get_feature_access(hass, connection, msg):
    try:
        command = _commands(hass, _resolve_entry_id(hass, msg))
        result = await command.get_policy(_actor(connection))
    except PermissionError:
        connection.send_error(msg['id'], 'unauthorized', 'Administrator required')
        return
    except ValueError as err:
        connection.send_error(msg['id'], 'invalid_payload', str(err))
        return
    connection.send_result(msg['id'], result)


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/set_feature_access",
    vol.Required("entry_id"): str, vol.Required("policy"): dict,
    vol.Required("expected_revision"): vol.All(int, vol.Range(min=0))})
@websocket_api.async_response
async def _ws_set_feature_access(hass, connection, msg):
    try:
        entry_id = _resolve_entry_id(hass, msg)
        result = await _commands(hass, entry_id).save_policy(_actor(connection), msg['policy'],
            expected_revision=msg['expected_revision'])
    except PermissionError:
        connection.send_error(msg['id'], 'unauthorized', 'Administrator required')
        return
    except ValueError as err:
        connection.send_error(msg['id'], 'invalid_payload', str(err))
        return
    _notify_entry_added(hass, entry_id, 'access_policy', operation="policy")
    connection.send_result(msg['id'], result)


def async_register_commands(hass: HomeAssistant) -> None:
    """Register all websocket commands."""
    for handler in (
        _ws_subscribe,
        _ws_list_children,
        _ws_get_data,
        _ws_get_export,
        _ws_add_entry,
        _ws_add_entries,
        _ws_update_entry,
        _ws_delete_entry,
        _ws_timer_start,
        _ws_timer_stop,
        _ws_migrate_local_data,
        _ws_get_feature_access,
        _ws_set_feature_access,
    ):
        websocket_api.async_register_command(hass, handler)


def _resolve_entry_id(hass: HomeAssistant, msg: dict[str, Any]) -> str:
    if entry_id := msg.get("entry_id"):
        if entry_id in _stores(hass):
            return str(entry_id)
        raise ValueError(f"unknown entry_id: {entry_id}")
    if child := msg.get("child"):
        child_name = str(child)
        matches = [entry.entry_id for entry in hass.config_entries.async_entries(DOMAIN)
                   if entry.title == child_name and entry.entry_id in _stores(hass)]
        if len(matches) == 1:
            return matches[0]
        raise ValueError("Use entry_id for unknown or ambiguous child name")
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


def _notify_entry_added(hass: HomeAssistant, entry_id: str, category: str, *, operation='added') -> None:
    notify_update(hass, entry_id, category, operation=operation)


def _now_ms() -> int:
    return int(datetime.now(timezone.utc).timestamp() * 1000)
