"""Native child entities use recorded data and the shared command policy."""
import pytest
from homeassistant.core import Context
from homeassistant.helpers import entity_registry as er
from homeassistant.exceptions import Unauthorized

from custom_components.ha_baby_tracker.commands import Actor, BabyCommands
from custom_components.ha_baby_tracker.const import DOMAIN
from tests_ha.test_frontend import _setup


def entity_id(hass, entry, domain, key):
    return er.async_get(hass).async_get_entity_id(domain, DOMAIN, f'{entry.entry_id}_{key}')


async def test_measurement_metadata_and_unknown_elapsed(hass):
    entry = await _setup(hass)
    for key, unit in (('feedings_today', 'feedings'), ('diapers_today', 'diapers')):
        state = hass.states.get(entity_id(hass, entry, 'sensor', key))
        assert state.attributes.get('state_class') == 'measurement'
        assert state.attributes.get('unit_of_measurement') == unit
    for key, unit in (('sleep_today', 'h'), ('since_last_feeding', 'min')):
        eid = entity_id(hass, entry, 'sensor', key)
        assert eid is not None
        state = hass.states.get(eid)
        assert state.attributes['device_class'] == 'duration'
        assert state.attributes['unit_of_measurement'] == unit
    assert hass.states.get(entity_id(hass, entry, 'sensor', 'since_last_feeding')).state == 'unknown'


async def test_diaper_button_and_sleep_switch_commit_once_and_publish_real_entry_event(hass, hass_admin_user):
    entry = await _setup(hass)
    storage = hass.data[DOMAIN]['stores'][entry.entry_id]
    context = Context(user_id=hass_admin_user.id)
    event_id = entity_id(hass, entry, 'event', 'entry')
    assert event_id is not None
    assert hass.states.get(event_id).state == 'unknown'
    wet = entity_id(hass, entry, 'button', 'diaper_wet')
    assert wet is not None
    await hass.services.async_call('button', 'press', {'entity_id': wet}, blocking=True, context=context)
    await hass.async_block_till_done()
    state = await storage.async_get_state()
    assert [row['type'] for row in state['diapers']] == ['wet']
    assert hass.states.get(event_id).attributes['event_type'] == 'diaper'
    switch = entity_id(hass, entry, 'switch', 'sleep')
    await hass.services.async_call('switch', 'turn_on', {'entity_id': switch}, blocking=True, context=context)
    first = (await storage.async_get_state())['running_timers']['sleep']
    await hass.services.async_call('switch', 'turn_on', {'entity_id': switch}, blocking=True, context=context)
    assert (await storage.async_get_state())['running_timers']['sleep'] == first
    await hass.services.async_call('switch', 'turn_off', {'entity_id': switch}, blocking=True, context=context)
    await hass.async_block_till_done()
    state = await storage.async_get_state()
    assert state['running_timers']['sleep'] is None and len(state['sleep']) == 1
    assert hass.states.get(event_id).attributes['event_type'] == 'sleep'
    last_event = hass.states.get(event_id).state
    await hass.services.async_call('switch', 'turn_off', {'entity_id': switch}, blocking=True, context=context)
    await hass.async_block_till_done()
    assert len((await storage.async_get_state())['sleep']) == 1
    assert hass.states.get(event_id).state == last_event


async def test_entity_user_context_does_not_bypass_explicit_policy(hass, hass_admin_user):
    entry = await _setup(hass)
    storage = hass.data[DOMAIN]['stores'][entry.entry_id]
    command = BabyCommands(hass, storage)
    await command.save_policy(Actor(hass_admin_user.id), {'schema': 1, 'features': {
        'diapers': {'execute': {'mode': 'selected_users', 'user_ids': []}},
        'sleep': {'execute': {'mode': 'selected_users', 'user_ids': []}}}}, expected_revision=0)
    wet = entity_id(hass, entry, 'button', 'diaper_wet')
    assert wet is not None
    switch = entity_id(hass, entry, 'switch', 'sleep')
    for domain, service, eid in [('button', 'press', wet), ('switch', 'turn_on', switch), ('switch', 'turn_off', switch)]:
        with pytest.raises(Unauthorized):
            await hass.services.async_call(domain, service, {'entity_id': eid}, blocking=True,
                context=Context(user_id=hass_admin_user.id))
    assert (await storage.async_get_state())['running_timers']['sleep'] is None
    assert (await storage.async_get_state())['diapers'] == []
