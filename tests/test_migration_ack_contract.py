"""Exercise the real websocket producer and model behind W4 consumer fixtures."""
import ast
import asyncio
from copy import deepcopy
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest

ROOT = Path(__file__).resolve().parents[1]


class MigrationAcknowledgementTest(unittest.TestCase):
    def test_full_and_racing_commit_reply_preserves_actual_counts_and_skips(self):
        async def run(race):
            spec = importlib.util.spec_from_file_location(
                "migration_ack_model", ROOT / "custom_components/ha_baby_tracker/model.py"
            )
            model = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(model)
            source = ROOT / "custom_components/ha_baby_tracker/websocket_api.py"
            tree = ast.parse(source.read_text())
            handler = next(node for node in tree.body
                           if isinstance(node, ast.AsyncFunctionDef)
                           and node.name == "_ws_migrate_local_data")
            handler.decorator_list = []
            state = model.default_state()

            async def get_state():
                return deepcopy(state)

            storage_source = ROOT / "custom_components/ha_baby_tracker/storage.py"
            storage_tree = ast.parse(storage_source.read_text())
            storage_class = next(node for node in storage_tree.body
                                 if isinstance(node, ast.ClassDef) and node.name == "BabyTrackerStorage")
            storage_method = next(node for node in storage_class.body
                                  if isinstance(node, ast.AsyncFunctionDef)
                                  and node.name == "async_apply_migration")
            storage_namespace = {"Any": object, "deepcopy": deepcopy,
                                 "merge_migration_slice": model.merge_migration_slice}
            exec(compile(ast.Module(body=[storage_method], type_ignores=[]),
                         str(storage_source), "exec"), storage_namespace)

            async def save(merged):
                state.clear()
                state.update(deepcopy(merged))

            storage = SimpleNamespace(_lock=asyncio.Lock(), _ensure_loaded_locked=get_state,
                                      _apply_cap_locked=lambda data, category: None,
                                      _async_save_locked=save)

            async def apply(categories, timers):
                if race:
                    state["feeding"] = [{"id": "concurrent", "timestamp": 3000}]
                return await storage_namespace["async_apply_migration"](storage, categories, timers)

            store = SimpleNamespace(async_get_state=get_state, async_apply_migration=apply)
            replies = []
            connection = SimpleNamespace(
                send_result=lambda request_id, result: replies.append((request_id, result)),
                send_error=lambda *args: self.fail(str(args)),
            )
            hass = SimpleNamespace(config_entries=SimpleNamespace(
                async_entries=lambda domain: [SimpleNamespace(title="Demo", entry_id="entry_1")]
            ))
            namespace = {"HomeAssistant": object, "Any": object, "DOMAIN": "ha_baby_tracker",
                         "websocket_api": SimpleNamespace(ActiveConnection=object),
                         "_stores": lambda h: {"entry_1": store},
                         "_storage": lambda h, entry_id: store,
                         "plan_local_migration": model.build_migration_plan,
                         "summarize_migration_plan": model.summarize_migration_plan,
                         "_notify_entry_added": lambda *args: None}
            exec(compile(ast.Module(body=[handler], type_ignores=[]), str(source), "exec"), namespace)
            await namespace["_ws_migrate_local_data"](hass, connection, {
                "id": 7, "children": ["Demo"], "data_by_index": {
                    "0": {"feeding": {"Demo": [{"timestamp": 1000}, {"timestamp": 2000}]}}
                }
            })
            self.assertEqual(replies, [(7, {
                "migrated": {"entry_1": {
                    "migrated": {} if race else {"feeding": 2},
                    "migrated_timers": [],
                    "skipped_non_empty": ["feeding"] if race else [],
                    "running_timers": {"sleep": None, "bf": None},
                }},
                "unmigrated": [], "ambiguous": [], "skipped_non_empty": {},
                "preview": {"entries": 2, "timers": 0, "targets": 1,
                            "unmigrated": [], "ambiguous": [], "skipped_non_empty": {}},
            })])
            if race:
                self.assertEqual(state["feeding"], [{"id": "concurrent", "timestamp": 3000}])
            else:
                self.assertEqual(len(state["feeding"]), 2)

        for race in (False, True):
            with self.subTest(race=race):
                asyncio.run(run(race))
