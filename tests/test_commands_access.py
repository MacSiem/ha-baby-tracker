"""Command admission, revocation and native resource permissions."""
import asyncio
from copy import deepcopy
import importlib.util
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
from unittest import IsolatedAsyncioTestCase
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1] / 'custom_components/ha_baby_tracker'
PACKAGE = '_baby_commands_test'


def load_commands():
    package = ModuleType(PACKAGE)
    package.__path__ = [str(ROOT)]
    sys.modules[PACKAGE] = package
    spec = importlib.util.spec_from_file_location(PACKAGE + '.commands', ROOT / 'commands.py')
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class CommandsTests(IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.mod = load_commands()
        self.user = SimpleNamespace(id='parent', is_active=True, is_admin=False,
            permissions=SimpleNamespace(check_entity=lambda eid,op: True, access_all_entities=lambda op: True))
        self.auth_reads = 0
        async def get_user(uid):
            self.auth_reads += 1
            return self.user if uid == self.user.id else None
        self.storage = SimpleNamespace(entry_id='a', command_lock=asyncio.Lock())
        self.policy = {'policy': self.mod.default_feature_access(), 'revision': 0, 'status': 'ready'}
        async def get_policy():
            return deepcopy(self.policy)
        self.storage.async_get_feature_access = get_policy
        self.records = []
        self.hook = None
        async def add(category, entry, *, before_save=None):
            if self.hook:
                await self.hook()
            await before_save()
            self.records.append(deepcopy(entry))
            return deepcopy(entry)
        self.storage.async_add_entry = add
        async def get_state():
            if self.hook:
                await self.hook()
            return {'feeding': [{'amount': 100}], 'diapers': [], 'running_timers': {
                'sleep': {'startTime': 1}, 'bf': {'startTime': 2}}}
        self.storage.async_get_state = get_state
        self.hass = SimpleNamespace(data={'ha_baby_tracker': {'stores': {'a': self.storage}}},
            auth=SimpleNamespace(async_get_user=get_user), state='running')
        self.commands = self.mod.BabyCommands(self.hass, self.storage)
        self.actor = self.mod.Actor(user_id='parent')
        self.native = patch.object(self.mod, 'native_entity_ids', return_value=['sensor.a'])
        self.native.start()
        self.addCleanup(self.native.stop)

    async def test_default_household_record_command_and_fresh_actor(self):
        result = await self.commands.add_entry(self.actor, 'feeding', {'amount': 100})
        self.assertEqual(result, {'amount': 100})
        self.assertEqual(self.records, [result])
        self.assertGreaterEqual(self.auth_reads, 2)

    async def test_missing_unknown_inactive_identity_cannot_write(self):
        for actor in (self.mod.Actor(user_id=None), self.mod.Actor(user_id='missing')):
            with self.assertRaises(PermissionError):
                await self.commands.add_entry(actor, 'feeding', {'amount': 1})
        self.user.is_active = False
        with self.assertRaises(PermissionError):
            await self.commands.add_entry(self.actor, 'feeding', {'amount': 1})
        self.assertEqual(self.records, [])

    async def test_revoke_during_storage_load_blocks_commit(self):
        async def revoke():
            self.user.is_active = False
        self.hook = revoke
        with self.assertRaises(PermissionError):
            await self.commands.add_entry(self.actor, 'feeding', {'amount': 1})
        self.assertEqual(self.records, [])

    async def test_native_restricted_entity_blocks_read_and_execute(self):
        self.user.permissions.check_entity = lambda eid,op: False
        with self.assertRaises(PermissionError):
            await self.commands.add_entry(self.actor, 'feeding', {'amount': 1})
        with self.assertRaises(PermissionError):
            await self.commands.get_data(self.actor, 'feeding')
        self.assertEqual(self.records, [])

    async def test_read_filters_denied_timers_and_discards_revoked_result(self):
        self.policy['policy']['features']['sleep'] = {'visible': {'mode': 'admin'}, 'read': {'mode': 'admin'}, 'execute': {'mode': 'admin'}}
        data = await self.commands.get_data(self.actor, 'feeding')
        self.assertEqual(data['data'], [{'amount': 100}])
        self.assertIsNone(data['running_timers']['sleep'])
        self.assertEqual(data['running_timers']['bf'], {'startTime': 2})
        async def revoke():
            self.policy['revision'] += 1
        self.hook = revoke
        with self.assertRaises(PermissionError):
            await self.commands.get_data(self.actor, 'feeding')

    async def test_unloaded_entry_during_read_cannot_return_records(self):
        async def unload():
            self.hass.data['ha_baby_tracker']['stores'].clear()
        self.hook = unload
        with self.assertRaises(PermissionError):
            await self.commands.get_data(self.actor, 'feeding')

    async def test_system_automation_is_explicit_and_cannot_use_selected_user_grant(self):
        actor = self.mod.Actor(user_id=None, system=True)
        await self.commands.add_entry(actor, 'feeding', {'amount': 1})
        self.policy['policy']['features']['feeding'] = {'execute': {'mode': 'selected_users', 'user_ids': ['parent']}}
        with self.assertRaises(PermissionError):
            await self.commands.add_entry(actor, 'feeding', {'amount': 2})
        self.assertEqual(self.records, [{'amount': 1}])

    async def test_execute_only_mutation_never_discloses_existing_record_or_timer(self):
        self.policy['policy']['features']['feeding'] = {'read': {'mode': 'admin'}}
        async def start(kind, *, start_ms, side, before_save):
            await before_save()
            return {'startTime': 1700000000000, 'side': 'right', 'sessions': [{'notes': 'old-private-note'}]}
        async def update(category, record_id, patch, *, before_save):
            await before_save()
            return {'id': record_id, 'notes': 'old-private-note', 'amount': 123}
        async def stop(kind, *, end_ms, before_save):
            await before_save()
            return {'category': 'bf_sessions', 'entry': {'id': 'new-record', 'side': 'right', 'notes': 'old-private-note'}}
        self.storage.async_start_timer = start
        self.storage.async_update_entry = update
        self.storage.async_stop_timer = stop
        started = await self.commands.timer_start(self.actor, 'bf', start_ms=1800000000000)
        updated = await self.commands.update_entry(self.actor, 'feeding', 'known-id', {})
        stopped = await self.commands.timer_stop(self.actor, 'bf', end_ms=1800000000000)
        self.assertEqual(started, {'redacted': True})
        self.assertEqual(updated, {'id': 'known-id', 'redacted': True})
        self.assertEqual(stopped, {'category': 'bf_sessions', 'entry': {'id': 'new-record', 'redacted': True}})
        self.assertNotIn('old-private-note', repr((started, updated, stopped)))

    async def test_export_requires_its_own_feature_read_grant(self):
        self.policy['policy']['features']['export'] = {'read': {'mode': 'admin'}}
        with self.assertRaises(PermissionError):
            await self.commands.get_export(self.actor)
        self.assertEqual((await self.commands.get_data(self.actor, 'feeding'))['data'], [{'amount': 100}])

    async def test_export_is_one_detached_snapshot_of_readable_categories_and_timers(self):
        self.policy['policy']['features']['sleep'] = {'read': {'mode': 'admin'}}
        result = await self.commands.get_export(self.actor)
        self.assertEqual(result['entry_id'], 'a')
        self.assertEqual(result['revision'], 0)
        self.assertEqual(result['data']['feeding'], [{'amount': 100}])
        self.assertNotIn('sleep', result['data'])
        self.assertIn('sleep', result['omitted_categories'])
        self.assertIsNone(result['running_timers']['sleep'])
        self.assertEqual(result['running_timers']['bf'], {'startTime': 2})
        result['data']['feeding'][0]['amount'] = 0
        self.assertEqual((await self.commands.get_data(self.actor, 'feeding'))['data'][0]['amount'], 100)

    async def test_export_rechecks_revocation_after_storage_await(self):
        async def revoke():
            self.policy['revision'] += 1
        self.hook = revoke
        with self.assertRaises(PermissionError):
            await self.commands.get_export(self.actor)

    async def test_export_does_not_bypass_native_entity_permissions(self):
        self.user.permissions.check_entity = lambda eid, op: False
        with self.assertRaises(PermissionError):
            await self.commands.get_export(self.actor)

    async def test_all_hidden_features_retain_admin_policy_repair_without_household_disclosure(self):
        import ast
        source = ROOT / 'websocket_api.py'
        tree = ast.parse(source.read_text())
        handlers = [node for node in tree.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
                    and node.name in ('_actor', '_ws_list_children')]
        for node in handlers:
            node.decorator_list = []
        self.storage._policy_data = self.policy
        names = self.mod.effective_feature_capabilities(self.policy['policy'],
            user_id=self.user.id, is_active=True, is_admin=True)
        self.policy['policy']['features'] = {name: {'visible': {'mode': 'selected_users', 'user_ids': []}}
                                            for name in names}
        entry = SimpleNamespace(entry_id='a', title='QA child', data={})
        self.hass.config_entries = SimpleNamespace(async_entries=lambda domain: [entry])
        replies = []
        connection = SimpleNamespace(user=self.user, send_result=lambda *args: replies.append(args))
        namespace = {'HomeAssistant': object, 'websocket_api': SimpleNamespace(ActiveConnection=object),
            'Any': object, 'Actor': self.mod.Actor, 'DOMAIN': 'ha_baby_tracker',
            'dr': SimpleNamespace(async_get=lambda hass: SimpleNamespace(devices={})),
            '_commands': lambda hass, entry_id: self.commands}
        exec(compile(ast.Module(body=handlers, type_ignores=[]), str(source), 'exec'), namespace)
        for admin in (True, False):
            self.user.is_admin = admin
            await namespace['_ws_list_children'](self.hass, connection, {'id': 42})
            rows = replies[-1][1]['children']
            self.assertEqual(len(rows), 1 if admin else 0)
            if admin:
                self.assertTrue(rows[0]['capabilities']['can_manage'])
                self.assertFalse(any(ops.get('visible') for ops in rows[0]['capabilities']['features'].values()))
