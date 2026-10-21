"""Shared child identity and authenticated native action context."""
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.exceptions import Unauthorized
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

    async def async_native_command(self, command, *args, **kwargs):
        """Map command policy denials to HA's native service error contract."""
        try:
            return await getattr(self.commands, command)(self.actor(), *args, **kwargs)
        except PermissionError as err:
            raise Unauthorized(context=getattr(self, '_context', None),
                entity_id=self.entity_id) from err
