"""Record commands preserve numeric request ids and target the requested record."""
import ast
import asyncio
from copy import deepcopy
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest

ROOT = Path(__file__).resolve().parents[1]

class RecordCommandTests(unittest.TestCase):
    def test_update_validates_merged_legacy_record_before_persistence(self):
        async def run():
            model_path = ROOT / "custom_components/ha_baby_tracker/model.py"
            spec = importlib.util.spec_from_file_location("timestamp_model", model_path)
            model = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(model)
            source = ROOT / "custom_components/ha_baby_tracker/storage.py"
            tree = ast.parse(source.read_text())
            cls = next(n for n in tree.body if isinstance(n, ast.ClassDef))
            method = next(n for n in cls.body if isinstance(n, ast.AsyncFunctionDef)
                          and n.name == "async_update_entry")
            ns = {"Any": object, "deepcopy": deepcopy,
                  "category_or_raise": model.category_or_raise,
                  "validate_entry_payload": model.validate_entry_payload}
            exec(compile(ast.Module(body=[method], type_ignores=[]), str(source), "exec"), ns)
            persisted = {"feeding": [{"id": "legacy", "timestamp": 1700000000000,
                                      "ts": 10**20, "amount": 100}]}
            async def load():
                return deepcopy(persisted)
            async def save(data):
                persisted.clear()
                persisted.update(deepcopy(data))
            storage = SimpleNamespace(_lock=asyncio.Lock(),
                _ensure_loaded_locked=load, _async_save_locked=save)
            with self.assertRaises(ValueError):
                await ns["async_update_entry"](storage, "feeding", "legacy", {"amount": 190})
            self.assertEqual(100, persisted["feeding"][0]["amount"])
            fixed = await ns["async_update_entry"](storage, "feeding", "legacy", {"ts": 1700000000})
            self.assertEqual(1700000000, fixed["ts"])
            self.assertEqual(fixed, persisted["feeding"][0])
        asyncio.run(run())

    def test_update_and_delete_target_record_and_keep_request_id(self):
        async def run():
            calls, replies = [], []
            async def update(category, record_id, patch):
                calls.append(("update", category, record_id))
                return {**patch, "id": record_id}
            async def delete(category, record_id):
                calls.append(("delete", category, record_id))
                return True
            store = SimpleNamespace(async_update_entry=update, async_delete_entry=delete)
            connection = SimpleNamespace(send_result=lambda *args: replies.append(args), send_error=lambda *args: self.fail(str(args)))
            source = ROOT / "custom_components/ha_baby_tracker/websocket_api.py"
            tree = ast.parse(source.read_text())
            handlers = [n for n in tree.body if isinstance(n, ast.AsyncFunctionDef) and n.name in {"_ws_update_entry", "_ws_delete_entry"}]
            for handler in handlers: handler.decorator_list = []
            ns = {"HomeAssistant": object, "websocket_api": SimpleNamespace(ActiveConnection=object), "Any": object, "_resolve_entry_id": lambda h,m:"child", "_storage": lambda h,e:store, "_notify_entry_added": lambda *a:None}
            exec(compile(ast.Module(body=handlers,type_ignores=[]),str(source),"exec"),ns)
            await ns["_ws_update_entry"](None, connection, {"id":7,"record_id":"record-a","category":"feeding","entry":{"amount":190}})
            await ns["_ws_delete_entry"](None, connection, {"id":8,"record_id":"record-a","category":"feeding"})
            self.assertEqual(calls, [("update","feeding","record-a"),("delete","feeding","record-a")])
            self.assertEqual([r[0] for r in replies], [7,8])
            self.assertEqual(replies[0][1]["entry"]["amount"],190)
            self.assertTrue(replies[1][1]["deleted"])
        asyncio.run(run())
