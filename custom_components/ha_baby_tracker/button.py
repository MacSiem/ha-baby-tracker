"""One-tap diaper entries use the same confirmed command as the card."""
from homeassistant.components.button import ButtonEntity
from homeassistant.util import dt as dt_util
from .commands import notify_update
from .native import BabyNativeEntity


async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities([DiaperButton(hass, entry, kind) for kind in ('wet', 'dirty')])


class DiaperButton(BabyNativeEntity, ButtonEntity):
    def __init__(self, hass, entry, kind):
        super().__init__(hass, entry, f'diaper_{kind}')
        self.kind = kind
        self._attr_icon = 'mdi:water' if kind == 'wet' else 'mdi:emoticon-poop'

    async def async_press(self):
        now = dt_util.now()
        await self.async_native_command('add_entry', 'diapers', {
            'type': self.kind, 'time': now.strftime('%H:%M'), 'timestamp': int(now.timestamp() * 1000)})
        notify_update(self.hass, self.entry.entry_id, 'diapers')
