"""Real WS handler: panel admission and its final policy check."""
import ast
from copy import deepcopy
from pathlib import Path
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase

SOURCE = Path(__file__).resolve().parents[1] / "custom_components/ha_baby_tracker/websocket_api.py"

class PanelDiscoveryTests(IsolatedAsyncioTestCase):
    async def run_handler(self, *, purpose="panel", visible=True, fresh=True, admin=True, conflict=False):
        node = next(n for n in ast.parse(SOURCE.read_text()).body if getattr(n, "name", None) == "_ws_list_children")
        node.decorator_list = []
        results = []
        cap = {"revision": 1, "can_manage": admin, "features": {"feeding": {"visible": True}, "panel": {"visible": visible}}}
        async def capabilities(actor): return deepcopy(cap)
        def project(user, revision):
            if conflict: raise ValueError("revision changed")
            return {**deepcopy(cap), "features": {"feeding": {"visible": True}, "panel": {"visible": fresh}}}
        async def get_user(uid): return SimpleNamespace(id=uid, is_active=True)
        entry = SimpleNamespace(entry_id="child", title="Private name", data={"date_of_birth": "2026-01-01"})
        hass = SimpleNamespace(config_entries=SimpleNamespace(async_entries=lambda domain: [entry]), auth=SimpleNamespace(async_get_user=get_user))
        connection = SimpleNamespace(send_result=lambda *args: results.append(args))
        ns = {"HomeAssistant": object, "websocket_api": SimpleNamespace(ActiveConnection=object), "Any": object,
              "DOMAIN": "ha_baby_tracker", "dr": SimpleNamespace(async_get=lambda h: SimpleNamespace(devices={})),
              "_commands": lambda h, eid: SimpleNamespace(capabilities=capabilities, project_capabilities=project),
              "_actor": lambda c: SimpleNamespace(user_id="admin" if admin else "parent")}
        exec(compile(ast.Module(body=[node], type_ignores=[]), str(SOURCE), "exec"), ns)
        await ns["_ws_list_children"](hass, connection, {"id": 1, "purpose": purpose})
        return results[0][1]["children"]

    async def test_administrator_has_no_bypass_for_explicit_panel_deny(self):
        self.assertEqual(await self.run_handler(visible=False, fresh=False), [])

    async def test_household_panel_permission_admits_only_the_scoped_child(self):
        rows = await self.run_handler(admin=False)
        self.assertEqual([row["entry_id"] for row in rows], ["child"])

    async def test_late_panel_revoke_cannot_return_the_preawait_child_dto(self):
        self.assertEqual(await self.run_handler(fresh=False), [])
        self.assertEqual(await self.run_handler(conflict=True), [])

    async def test_card_discovery_retains_the_independent_administrative_repair_path(self):
        rows = await self.run_handler(purpose="card", visible=False, fresh=False)
        self.assertEqual([row["entry_id"] for row in rows], ["child"])
