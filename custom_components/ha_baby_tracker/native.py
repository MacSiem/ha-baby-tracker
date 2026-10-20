"""Shared child identity and authenticated native action context."""
from homeassistant.helpers.entity import DeviceInfo
from .commands import Actor, BabyCommands
from .const import DOMAIN, DATA_STORES, MANUFACTURER, MODEL


class BabyNativeEntity:
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, hass, entry, key):
        self.hass, self.entry = hass, entry
        self._attr_unique_id = f'{entry.entry_id}_{key}'
        self._attr_translation_key = key

    @property
    def device_info(self):
        return DeviceInfo(identifiers={(DOMAIN, self.entry.entry_id)},
            manufacturer=MANUFACTURER, model=MODEL, name=self.entry.title)

    @property
    def storage(self):
        return self.hass.data[DOMAIN][DATA_STORES][self.entry.entry_id]

    @property
    def commands(self):
        return BabyCommands(self.hass, self.storage)

    def actor(self):
        uid = getattr(getattr(self, '_context', None), 'user_id', None)
        # HA's native service layer supplies context; None is an explicitly
        # documented server automation, never a client payload identity.
        return Actor(user_id=uid, system=uid is None)
