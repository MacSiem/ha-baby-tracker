"""Scoped subscription rechecks access and detaches cleanly."""
import ast
import asyncio
from pathlib import Path
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase

ROOT = Path(__file__).resolve().parents[1]

class HouseholdSubscriptionTests(IsolatedAsyncioTestCase):
    async def test_household_receives_only_authorized_updates_and_unsubscribe_stops_delivery(self):
        source = ROOT / "custom_components/ha_baby_tracker/websocket_api.py"
        tree = ast.parse(source.read_text())
        handlers = [node for node in tree.body if getattr(node, 'name', None) in
                    {"_ws_subscribe", "_async_forward_update"}]
        for handler in handlers: handler.decorator_list = []
        listeners, events, results, tasks = {}, [], [], []
        def listen(kind, callback):
            listeners[kind] = callback
            return lambda: listeners.pop(kind, None)
        def task(coro):
            tasks.append(asyncio.create_task(coro))
        user = SimpleNamespace(id='parent', is_active=True)
        connection = SimpleNamespace(user=user, subscriptions={},
            send_event=lambda *args: events.append(args), send_result=lambda *args: results.append(args))
        async def get_user(uid): return user
        hass = SimpleNamespace(bus=SimpleNamespace(async_listen=listen), async_create_task=task,
                               auth=SimpleNamespace(async_get_user=get_user))
        permitted = True
        async def capabilities(actor):
            return {'features': {'feeding': {'read': permitted}}}
        ns = {"HomeAssistant": object, "websocket_api": SimpleNamespace(ActiveConnection=object),
              "Any": object, "EVENT_ENTRY_ADDED": "ha_baby_tracker_entry_added", "callback": lambda f:f,
              "_commands": lambda h,e: SimpleNamespace(capabilities=capabilities), "_actor": lambda c:'parent'}
        exec(compile(ast.Module(body=handlers,type_ignores=[]),str(source),"exec"),ns)
        ns["_ws_subscribe"](hass, connection, {"id":7,"type":"ha_baby_tracker/subscribe"})
        payload = {"entry_id":"qa-child","category":"feeding"}
        listeners["ha_baby_tracker_entry_added"](SimpleNamespace(data=payload))
        await asyncio.gather(*tasks)
        self.assertEqual(events, [(7,{"data":payload})])
        self.assertEqual(results, [(7,)])
        permitted = False
        listeners["ha_baby_tracker_entry_added"](SimpleNamespace(data=payload))
        await asyncio.gather(*tasks)
        self.assertEqual(len(events), 1)
        # Revocation invalidation reaches the user without leaking any child ID.
        listeners["ha_baby_tracker_entry_added"](SimpleNamespace(data={"entry_id":"secret-child","category":"access_policy"}))
        await asyncio.gather(*tasks)
        self.assertEqual(events[-1], (7, {"data": {"category":"access_policy"}}))
        connection.subscriptions[7]()
        self.assertFalse(listeners)
