"""Native switch controls the existing durable sleep timer."""
from homeassistant.components.switch import SwitchEntity
from homeassistant.core import callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.util import dt as dt_util
from .commands import notify_update
from .const import signal_child_updated
from .native import BabyNativeEntity


async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities([SleepSwitch(hass, entry)])


class SleepSwitch(BabyNativeEntity, SwitchEntity):
    _attr_icon = 'mdi:sleep'

    def __init__(self, hass, entry):
        super().__init__(hass, entry, 'sleep')

    async def async_added_to_hass(self):
        self.async_on_remove(async_dispatcher_connect(self.hass,
            signal_child_updated(self.entry.entry_id), self._changed))
        await self._refresh()

    @callback
    def _changed(self, category=None):
        self.hass.async_create_task(self._refresh())

    async def _refresh(self):
        state = await self.storage.async_get_state()
        self._attr_is_on = bool(state['running_timers'].get('sleep'))
        self.async_write_ha_state()

    async def async_turn_on(self, **kwargs):
        await self.async_native_command('timer_start', 'sleep', start_ms=int(dt_util.utcnow().timestamp() * 1000))
        notify_update(self.hass, self.entry.entry_id, 'running_timers', operation='timer_started')
        await self._refresh()

    async def async_turn_off(self, **kwargs):
        result = await self.async_native_command('timer_stop', 'sleep', end_ms=int(dt_util.utcnow().timestamp() * 1000), only_if_running=True)
        if result.get('entry') is not None:
            notify_update(self.hass, self.entry.entry_id, 'sleep')
        await self._refresh()
