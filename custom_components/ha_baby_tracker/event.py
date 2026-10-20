"""Actual committed journal entries, without record content or startup replay."""
from homeassistant.components.event import EventEntity
from homeassistant.core import callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from .const import signal_child_record_added
from .native import BabyNativeEntity


async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities([EntryEvent(hass, entry)])


class EntryEvent(BabyNativeEntity, EventEntity):
    _attr_name = 'Entry'
    _attr_event_types = ['feeding', 'diaper', 'sleep']
    _attr_icon = 'mdi:notebook-plus-outline'

    def __init__(self, hass, entry):
        super().__init__(hass, entry, 'entry')

    async def async_added_to_hass(self):
        self.async_on_remove(async_dispatcher_connect(self.hass,
            signal_child_record_added(self.entry.entry_id), self._recorded))

    @callback
    def _recorded(self, category):
        kind = {'feeding': 'feeding', 'bf_sessions': 'feeding', 'diapers': 'diaper', 'sleep': 'sleep'}.get(category)
        if kind:
            self._trigger_event(kind)
            self.async_write_ha_state()
