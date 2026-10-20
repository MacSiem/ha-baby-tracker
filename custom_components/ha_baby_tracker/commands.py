"""One child command boundary for cards, services and native entity actions."""
from __future__ import annotations

from dataclasses import dataclass
from copy import deepcopy

from .feature_access import default_feature_access, effective_feature_capabilities, feature_access_allowed
from .model import entry_timestamp_ms

DOMAIN = 'ha_baby_tracker'


@dataclass(frozen=True)
class Actor:
    """Server-created identity. Only a real HA service context may be system."""
    user_id: str | None
    system: bool = False


def native_entity_ids(hass, entry_id):
    from homeassistant.helpers import entity_registry as er
    registry = er.async_get(hass)
    return [entry.entity_id for entry in er.async_entries_for_config_entry(registry, entry_id)]


class BabyCommands:
    """Keep policy changes and admitted mutations in one per-child lane."""
    def __init__(self, hass, storage):
        self.hass, self.storage = hass, storage
        self.entry_id = storage.entry_id

    def _current(self):
        return (self.hass.data.get(DOMAIN, {}).get('stores', {}).get(self.entry_id) is self.storage
                and self.hass.state != 'stopping')

    async def _guard(self, actor, features, operation, snapshot, *, admin=False):
        if not isinstance(actor, Actor) or not self._current():
            raise PermissionError('Baby access unavailable')
        if actor.system:
            # HA server automations carry no individual identity. They retain
            # legacy household actions only; selected-user/admin grants cannot
            # be impersonated by choosing a service payload user_id.
            if actor.user_id is not None or admin or operation != 'execute':
                raise PermissionError('Baby automation access unavailable')
            user = None
        else:
            if not isinstance(actor.user_id, str) or not actor.user_id:
                raise PermissionError('An authenticated user is required')
            user = await self.hass.auth.async_get_user(actor.user_id)
            if user is None or user.is_active is not True:
                raise PermissionError('Baby access unavailable')
        current = await self.storage.async_get_feature_access()
        if (not self._current() or current['status'] != 'ready'
                or current['revision'] != snapshot['revision']):
            raise PermissionError('Baby access changed')
        if admin:
            if user is None or user.is_active is not True or user.is_admin is not True:
                raise PermissionError('Administrator required')
            return user
        policy = current['policy']
        for feature in features:
            if actor.system:
                rule = policy.get('features', {}).get(feature, {}).get(operation, {})
                if rule.get('mode', 'inherit') not in ('inherit', 'household'):
                    raise PermissionError('Baby automation requires household access')
                uid, active, is_admin = '__ha_automation__', True, False
            else:
                uid, active, is_admin = user.id, user.is_active, user.is_admin
            if not feature_access_allowed(policy, feature, operation,
                    user_id=uid, is_active=active, is_admin=is_admin):
                raise PermissionError('Baby feature access denied')
        if user is not None:
            # HA's entity registry and permissions remain the resource authority.
            # Until an entity exists, a restricted actor has no grantable source.
            native_operation = 'control' if operation == 'execute' else 'read'
            ids = native_entity_ids(self.hass, self.entry_id)
            if (not ids and not user.permissions.access_all_entities(native_operation)
                    or any(not user.permissions.check_entity(eid, native_operation) for eid in ids)):
                raise PermissionError('Baby resource access denied')
        return user

    async def _mutate(self, actor, features, action):
        async with self.storage.command_lock:
            policy = await self.storage.async_get_feature_access()
            async def before_save():
                await self._guard(actor, features, 'execute', policy)
            await before_save()
            result = await action(before_save)
            await before_save()
            return result

    async def add_entry(self, actor, category, entry):
        return await self._mutate(actor, [_feature(category)],
            lambda guard: self.storage.async_add_entry(category, entry, before_save=guard))

    async def add_entries(self, actor, entries):
        return await self._mutate(actor, [_feature(item['category']) for item in entries],
            lambda guard: self.storage.async_add_entries(entries, before_save=guard))

    async def update_entry(self, actor, category, record_id, entry):
        return await self._mutate(actor, [_feature(category)],
            lambda guard: self.storage.async_update_entry(category, record_id, entry, before_save=guard))

    async def delete_entry(self, actor, category, record_id):
        return await self._mutate(actor, [_feature(category)],
            lambda guard: self.storage.async_delete_entry(category, record_id, before_save=guard))

    async def timer_start(self, actor, kind, *, start_ms, side=None):
        return await self._mutate(actor, [_timer_feature(kind)],
            lambda guard: self.storage.async_start_timer(kind, start_ms=start_ms, side=side, before_save=guard))

    async def timer_stop(self, actor, kind, *, end_ms):
        return await self._mutate(actor, [_timer_feature(kind)],
            lambda guard: self.storage.async_stop_timer(kind, end_ms=end_ms, before_save=guard))

    async def get_data(self, actor, category, *, since=None):
        feature = _feature(category)
        async with self.storage.command_lock:
            policy = await self.storage.async_get_feature_access()
            await self._guard(actor, [feature], 'read', policy)
            state = await self.storage.async_get_state()
            data = deepcopy(state[category])
            if since is not None:
                from .storage import _parse_since_ms
                stamp = _parse_since_ms(str(since))
                if stamp is not None:
                    data = [row for row in data if (entry_timestamp_ms(row) or 0) >= stamp]
            timers = {}
            for kind in ('sleep', 'bf'):
                try:
                    await self._guard(actor, [_timer_feature(kind)], 'read', policy)
                    timers[kind] = deepcopy(state['running_timers'].get(kind))
                except PermissionError:
                    timers[kind] = None
            await self._guard(actor, [feature], 'read', policy)
            return {'entry_id': self.entry_id, 'category': category, 'data': data,
                    'running_timers': timers}

    async def capabilities(self, actor):
        policy = await self.storage.async_get_feature_access()
        user = await self._guard(actor, [], 'read', policy)
        result = effective_feature_capabilities(policy['policy'], user_id=user.id,
            is_active=user.is_active, is_admin=user.is_admin)
        return {'revision': policy['revision'], 'features': result, 'can_manage': user.is_admin is True}

    async def get_policy(self, actor):
        policy = await self.storage.async_get_feature_access()
        # Invalid configuration must still be repairable by a current admin.
        await self._admin(actor)
        return policy

    async def _admin(self, actor):
        if not isinstance(actor, Actor) or actor.system or not actor.user_id or not self._current():
            raise PermissionError('Administrator required')
        user = await self.hass.auth.async_get_user(actor.user_id)
        if user is None or user.is_active is not True or user.is_admin is not True or not self._current():
            raise PermissionError('Administrator required')

    async def save_policy(self, actor, policy, *, expected_revision):
        async with self.storage.command_lock:
            await self._admin(actor)
            return await self.storage.async_save_feature_access(policy,
                expected_revision=expected_revision, before_save=lambda: self._admin(actor))

    async def migrate(self, actor, categories, timers):
        async with self.storage.command_lock:
            await self._admin(actor)
            return await self.storage.async_apply_migration(categories, timers,
                before_save=lambda: self._admin(actor))


def _feature(category):
    if category == 'bf_sessions':
        return 'feeding'
    if category not in ('feeding', 'lactation', 'diapers', 'sleep', 'growth'):
        raise ValueError('Unknown Baby category')
    return category


def _timer_feature(kind):
    if kind == 'bf':
        return 'feeding'
    if kind == 'sleep':
        return 'sleep'
    raise ValueError('Unknown Baby timer')
