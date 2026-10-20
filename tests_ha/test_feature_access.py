"""Policy durability and shared commands against real HA auth and Store."""
import asyncio
from copy import deepcopy
from unittest.mock import AsyncMock, patch

import pytest
from homeassistant.helpers.storage import Store
from homeassistant.util.file import WriteError
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.ha_baby_tracker.commands import Actor, BabyCommands
from custom_components.ha_baby_tracker.const import DOMAIN
from custom_components.ha_baby_tracker.storage import BabyTrackerStorage


def bind(hass, entry_id):
    storage = BabyTrackerStorage(hass, entry_id)
    hass.data.setdefault(DOMAIN, {}).setdefault('stores', {})[entry_id] = storage
    return storage, BabyCommands(hass, storage)


async def test_policy_cas_is_per_child_and_survives_reload(hass, hass_admin_user):
    a, command = bind(hass, 'a')
    b, other = bind(hass, 'b')
    admin = Actor(hass_admin_user.id)
    policy = {'schema': 1, 'features': {'feeding': {'execute': {'mode': 'admin'}}}}
    saved = await command.save_policy(admin, policy, expected_revision=0)
    assert saved['revision'] == 1
    assert (await BabyTrackerStorage(hass, 'a').async_get_feature_access()) == saved
    assert (await b.async_get_feature_access())['revision'] == 0
    with pytest.raises(ValueError, match='conflict'):
        await command.save_policy(admin, policy, expected_revision=0)
    assert (await a.async_get_feature_access()) == saved
    assert (await b.async_get_state())['feeding'] == []


async def test_real_auth_policy_and_native_permission_enforce_commands(hass, hass_admin_user):
    storage, command = bind(hass, 'child')
    parent = await hass.auth.async_create_user('QA parent', group_ids=['system-users'])
    actor, admin = Actor(parent.id), Actor(hass_admin_user.id)
    await command.add_entry(actor, 'feeding', {'amount': 100})
    assert (await command.get_data(actor, 'feeding'))['data'][0]['amount'] == 100
    with pytest.raises(PermissionError):
        await command.save_policy(actor, {'schema': 1, 'features': {}}, expected_revision=0)
    await command.save_policy(admin, {'schema': 1, 'features': {
        'feeding': {'read': {'mode': 'admin'}, 'execute': {'mode': 'admin'}}}}, expected_revision=0)
    with pytest.raises(PermissionError):
        await command.get_data(actor, 'feeding')
    with pytest.raises(PermissionError):
        await command.add_entry(actor, 'feeding', {'amount': 200})
    assert len((await storage.async_get_state())['feeding']) == 1
    # Invalid user IDs never become trusted system calls.
    with pytest.raises(PermissionError):
        await command.add_entry(Actor('missing-user'), 'feeding', {'amount': 200})


async def test_failed_policy_save_keeps_confirmed_revision(hass, hass_admin_user):
    storage, command = bind(hass, 'durable')
    admin = Actor(hass_admin_user.id)
    before = await storage.async_get_feature_access()
    with patch.object(Store, '_async_write_data', AsyncMock(side_effect=WriteError('disk unavailable'))):
        with pytest.raises(ValueError, match='save'):
            await command.save_policy(admin, {'schema': 1, 'features': {
                'feeding': {'execute': {'mode': 'admin'}}}}, expected_revision=0)
    assert await BabyTrackerStorage(hass, 'durable').async_get_feature_access() == before


async def test_policy_change_and_record_commit_have_one_linear_order(hass, hass_admin_user):
    storage, command = bind(hass, 'serial')
    parent = await hass.auth.async_create_user('QA parent', group_ids=['system-users'])
    actor, admin = Actor(parent.id), Actor(hass_admin_user.id)
    admitted, release = asyncio.Event(), asyncio.Event()
    original = storage._async_save_locked
    async def pause_save(data):
        admitted.set()
        await release.wait()
        await original(data)
    with patch.object(storage, '_async_save_locked', pause_save):
        record = asyncio.create_task(command.add_entry(actor, 'feeding', {'amount': 10}))
        await admitted.wait()
        revoke = asyncio.create_task(command.save_policy(admin, {'schema': 1, 'features': {
            'feeding': {'execute': {'mode': 'admin'}}}}, expected_revision=0))
        await asyncio.sleep(0)
        assert not revoke.done()
        release.set()
        await record
        await revoke
    with pytest.raises(PermissionError):
        await command.add_entry(actor, 'feeding', {'amount': 20})
    assert [row['amount'] for row in (await storage.async_get_state())['feeding']] == [10]
