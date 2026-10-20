"""Pure feature policy: independent operations and current authenticated actors."""
import copy
import importlib.util
from pathlib import Path
import unittest


PATH = Path(__file__).resolve().parents[1] / 'custom_components/ha_baby_tracker/feature_access.py'
spec = importlib.util.spec_from_file_location('baby_feature_access_under_test', PATH)
access = importlib.util.module_from_spec(spec)
spec.loader.exec_module(access)


def policy(feature='feeding', **operations):
    return {'schema': 1, 'features': {feature: operations}}


def allowed(value=None, feature='feeding', operation='read', **actor):
    identity = {'user_id': 'alice', 'is_active': True, 'is_admin': False}
    identity.update(actor)
    return access.feature_access_allowed(
        access.default_feature_access() if value is None else value,
        feature, operation, **identity)


class FeatureAccessTest(unittest.TestCase):
    def test_defaults_preserve_household_records_and_admin_panel(self):
        expected = {
            'feeding': {'visible': True, 'read': True, 'execute': True},
            'lactation': {'visible': True, 'read': True, 'execute': True},
            'diapers': {'visible': True, 'read': True, 'execute': True},
            'sleep': {'visible': True, 'read': True, 'execute': True},
            'growth': {'visible': True, 'read': True, 'execute': True},
            'history': {'visible': True, 'read': True},
            'export': {'visible': True, 'read': True},
            'panel': {'visible': False},
        }
        self.assertEqual(access.effective_feature_capabilities(
            access.default_feature_access(), user_id='alice', is_active=True,
            is_admin=False), expected)
        for feature, operations in expected.items():
            for operation, household in operations.items():
                with self.subTest(feature=feature, operation=operation):
                    self.assertIs(allowed(feature=feature, operation=operation), household)
                    self.assertTrue(allowed(feature=feature, operation=operation, is_admin=True))
        self.assertEqual(access.default_feature_access(), {'schema': 1, 'features': {}})

    def test_operation_rules_are_independent_and_missing_inherits(self):
        value = policy(visible={'mode': 'admin'}, execute={'mode': 'selected_users'})
        self.assertFalse(allowed(value, operation='visible'))
        self.assertTrue(allowed(value, operation='read'))
        self.assertFalse(allowed(value, operation='execute'))
        value = policy(visible={'mode': 'household'}, read={'mode': 'admin'})
        self.assertTrue(allowed(value, operation='visible'))
        self.assertFalse(allowed(value, operation='read'))
        self.assertTrue(allowed(value, operation='execute'))
        self.assertTrue(allowed(policy(read={'mode': 'inherit'})))
        self.assertFalse(allowed(policy('panel', visible={'mode': 'inherit'}),
                                 'panel', 'visible'))
        self.assertTrue(allowed(policy('panel', visible={'mode': 'household'}),
                                'panel', 'visible'))

    def test_selected_users_revocation_and_admin_follow_explicit_rule(self):
        value = policy(read={'mode': 'selected_users', 'user_ids': ['alice']})
        self.assertTrue(allowed(value))
        self.assertTrue(allowed(value, is_admin=True))
        self.assertFalse(allowed(value, user_id='bob'))
        self.assertFalse(allowed(value, user_id='bob', is_admin=True))
        self.assertFalse(allowed(value, is_active=False))
        value['features']['feeding']['read']['user_ids'].clear()
        self.assertFalse(allowed(value))
        self.assertFalse(allowed(value, is_admin=True))
        self.assertFalse(allowed(policy(read={'mode': 'selected_users'}), is_admin=True))
        self.assertTrue(allowed(policy(read={'mode': 'admin'}), is_admin=True))

    def test_actor_is_current_active_and_strictly_typed(self):
        for uid in (None, '', ' alice', 'alice ', True, 7, 'a\x00b', 'a\x85b', 'x' * 129):
            with self.subTest(uid=uid):
                self.assertFalse(allowed(user_id=uid, is_admin=True))
        for active in (False, None, 1, 'true'):
            self.assertFalse(allowed(is_active=active, is_admin=True))
        for admin in (False, None, 1, 'true'):
            self.assertFalse(allowed(feature='panel', operation='visible', is_admin=admin))
        selected = policy(read={'mode': 'selected_users', 'user_ids': ['stale-user']})
        self.assertFalse(allowed(selected, user_id='stale-user', is_active=False))
        self.assertFalse(allowed(selected, user_id='new-user'))

    def test_normalization_detaches_data_without_mutating_caller(self):
        value = policy(read={'mode': 'selected_users', 'user_ids': ['bob', 'alice', 'bob']})
        before = copy.deepcopy(value)
        clean = access.validate_feature_access(value)
        self.assertEqual(clean['features']['feeding']['read']['user_ids'], ['alice', 'bob'])
        self.assertTrue(allowed(value))
        access.effective_feature_capabilities(value, user_id='alice', is_active=True, is_admin=False)
        self.assertEqual(value, before)
        clean['features']['feeding']['read']['user_ids'].append('eve')
        self.assertEqual(value, before)
        fresh = access.default_feature_access()
        fresh['features']['feeding'] = {}
        self.assertEqual(access.default_feature_access()['features'], {})

    def test_capabilities_have_only_supported_booleans_and_no_allowlist(self):
        value = policy(read={'mode': 'selected_users', 'user_ids': ['alice']})
        projection = access.effective_feature_capabilities(
            value, user_id='alice', is_active=True, is_admin=False)
        self.assertEqual(set(projection), {'feeding', 'lactation', 'diapers', 'sleep',
                                           'growth', 'history', 'export', 'panel'})
        self.assertEqual(projection['feeding'], {'visible': True, 'read': True, 'execute': True})
        self.assertEqual(projection['history'], {'visible': True, 'read': True})
        self.assertEqual(projection['export'], {'visible': True, 'read': True})
        self.assertEqual(projection['panel'], {'visible': False})
        self.assertNotIn('alice', repr(projection))
        self.assertTrue(all(type(flag) is bool for ops in projection.values() for flag in ops.values()))
        for uid, active in ((None, True), ('alice', False)):
            flags = access.effective_feature_capabilities(
                value, user_id=uid, is_active=active, is_admin=True)
            self.assertFalse(any(flag for ops in flags.values() for flag in ops.values()))

    def test_management_and_unknown_operations_cannot_be_granted_by_policy(self):
        for feature in ('settings', 'management', 'migration', 'policy', 'feature_access', '', None, []):
            self.assertFalse(allowed(feature=feature, is_admin=True))
        for operation in ('delete', 'manage', '', None, []):
            self.assertFalse(allowed(operation=operation, is_admin=True))
        for feature, operation in (('history', 'execute'), ('export', 'execute'),
                                   ('panel', 'read'), ('panel', 'execute')):
            self.assertFalse(allowed(feature=feature, operation=operation, is_admin=True))
        for feature in ('management', 'migration', 'policy', 'settings'):
            self.assert_invalid(policy(feature, visible={'mode': 'household'}))

    def assert_invalid(self, value):
        for check in (
            lambda: access.validate_feature_access(value),
            lambda: access.feature_access_allowed(value, 'feeding', 'read',
                user_id='alice', is_active=True, is_admin=True),
            lambda: access.effective_feature_capabilities(value,
                user_id='alice', is_active=True, is_admin=True),
        ):
            with self.assertRaisesRegex(ValueError, '^invalid_feature_access$'):
                check()

    def test_malformed_policy_is_rejected_even_for_admin(self):
        values = (None, [], {}, {'schema': 1}, {'schema': True, 'features': {}},
                  {'schema': 1.0, 'features': {}}, {'schema': 2, 'features': {}},
                  {'schema': 1, 'features': []}, {'schema': 1, 'features': {}, 'validated': True},
                  policy('unknown'), policy('history', execute={'mode': 'household'}),
                  policy(read=[]), policy(read={}), policy(read={'mode': None}),
                  policy(read={'mode': []}), policy(read={'mode': 'all'}),
                  policy(read={'mode': 'household', 'user_ids': []}),
                  policy(read={'mode': 'admin', 'extra': True}),
                  policy(read={'mode': 'selected_users', 'user_ids': [], 'extra': True}))
        for value in values:
            with self.subTest(value=value):
                self.assert_invalid(value)

    def test_user_allowlists_have_bounded_valid_opaque_ids(self):
        for ids in ('alice', ('alice',), None, [True], [7], [''], [' alice'], ['alice '],
                    ['a\nb'], ['a\x7fb'], ['a\x85b'], ['x' * 129], ['alice'] * 129):
            self.assert_invalid(policy(read={'mode': 'selected_users', 'user_ids': ids}))
        for uid in ('user:opaque/ą', 'x' * 128):
            self.assertTrue(allowed(policy(read={'mode': 'selected_users', 'user_ids': [uid]}), user_id=uid))
        ids = [str(index) for index in range(128)]
        self.assertTrue(allowed(policy(read={'mode': 'selected_users', 'user_ids': ids}), user_id='127'))

    def test_bounded_json_rejects_cycles_depth_bytes_and_non_json(self):
        cycle = {}
        cycle['self'] = cycle
        nested = []
        cursor = nested
        for _ in range(70):
            child = []
            cursor.append(child)
            cursor = child
        for value in (cycle, nested, [None] * 65537, {'x' * 65537: None},
                      {'x': 'y' * 65537}, {'x': '\x00' * 12000},
                      {'x': float('nan')}, {'x': float('inf')}, {'x': object()},
                      {1: {}}, {'x': b'bytes'}, {'x': ('tuple',)}, {'x': 1 << 70000}):
            self.assert_invalid(value)
        ids = [str(index).zfill(4) + 'x' * 124 for index in range(128)]
        self.assert_invalid({'schema': 1, 'features': {
            feature: {operation: {'mode': 'selected_users', 'user_ids': ids}
                      for operation in ('visible', 'read', 'execute')}
            for feature in ('feeding', 'lactation', 'diapers')}})

    def test_shared_input_lists_do_not_become_aliases_in_normalized_policy(self):
        rule = {'mode': 'selected_users', 'user_ids': ['alice']}
        value = policy(read=rule, visible=rule)
        clean = access.validate_feature_access(value)
        clean['features']['feeding']['read']['user_ids'].clear()
        self.assertEqual(clean['features']['feeding']['visible']['user_ids'], ['alice'])
        self.assertEqual(rule['user_ids'], ['alice'])
