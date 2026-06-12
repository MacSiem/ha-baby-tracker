# HA Baby Tracker v5.0.0 Migration Report

Status: completed local implementation and requested static verification.

Report path: `/Users/maciej/repos/ha-baby-tracker/codex-runs/baby-tracker-migration-report.md`

## Scope

Goal: migrate `ha-baby-tracker` from a Lovelace-only plugin to a Home Assistant integration following the approved v5 architecture.

Edited only inside `/Users/maciej/repos/ha-baby-tracker`.

Out of scope not added: reminders, notifications, photos, multi-home sync, chart changes, and export-format changes.

## Changed Files

- `.github/workflows/hacs.yml` - changed HACS category to `integration`.
- `.github/workflows/hassfest.yml` - added hassfest workflow.
- `CHANGELOG.md` - added `[5.0.0] - 2026-06-12`.
- `README.md` - rewrote installation, services, sensors, migration, and privacy/storage docs for the integration.
- `hacs.json` - switched to integration-style `content_in_root: false`, no root JS filename.
- `ha-baby-tracker.js` - surgical backend adapter, migration prompt, WS data layer, event refresh, and conditional storage copy.
- `custom_components/ha_baby_tracker/**` - new integration package.
- `tests/**` - pure `unittest` suite runnable with `python3 tests`.
- `codex-runs/baby-tracker-migration-report.md` - this report.

## Integration Summary

- Config flow creates one config entry per child with required `name` and optional `date_of_birth`.
- Unique ID is a slugified child name; duplicate names abort via Home Assistant config-entry unique ID handling.
- Each entry creates a device with manufacturer `HA Tools` and model `Baby Tracker`.
- Store key is `ha_baby_tracker.{entry_id}`, version `1`.
- Store shape is:

```json
{
  "feeding": [],
  "lactation": [],
  "diapers": [],
  "sleep": [],
  "growth": [],
  "bf_sessions": [],
  "running_timers": {
    "sleep": null,
    "bf": null
  }
}
```

- Soft cap is 10,000 entries per category. The oldest entries are trimmed and logged once at INFO level per cap application.
- Removing a config entry removes that child's Store file.
- Frontend is served via `async_register_static_paths` and `add_extra_js_url`; setup logs `Registered ha_baby_tracker frontend`.

## Services

Added:

- `ha_baby_tracker.log_feeding`
- `ha_baby_tracker.log_diaper`
- `ha_baby_tracker.log_sleep`

Services support `child`, `entry_id`, or `device_id` resolution. If exactly one child is configured, the service also resolves that child by default.

After each write, the integration dispatches child entity updates and fires:

```text
ha_baby_tracker_entry_added
```

with:

```json
{"entry_id": "...", "category": "..."}
```

## Websocket API

Domain prefix: `ha_baby_tracker/`.

Added:

- `list_children`
- `get_data`
- `add_entry`
- `update_entry` - admin only
- `delete_entry` - admin only
- `timer_start`
- `timer_stop`
- `migrate_local_data` - admin only

Per architecture, add/timer logging commands do not require admin.

## Sensors

Per child:

- `sensor last_feeding` - timestamp
- `sensor last_diaper` - timestamp
- `sensor diapers_today` - integer
- `sensor feedings_today` - integer
- `binary_sensor sleeping`

All read from Store on update/startup and use dispatcher refresh plus midnight `async_track_time_change`.

## Tests Added

Pure Python tests cover:

- Store trim/cap oldest-entry behavior.
- Migration index -> exact child name -> entry mapping.
- Unmatched child handling.
- Idempotent `skipped_non_empty` category behavior.
- Today counter bucketing.
- Timer stop duration math for sleep and breastfeeding.

## Verification

Commands run from `/Users/maciej/repos/ha-baby-tracker`:

```text
python3 -m py_compile custom_components/ha_baby_tracker/*.py
```

Result: exit 0, no output.

```text
python3 tests
```

Result: exit 0.

```text
Ran 6 tests in 0.008s

OK
```

```text
node --check ha-baby-tracker.js
```

Result: exit 0, no output.

Additional bundle syntax check run earlier:

```text
node --check custom_components/ha_baby_tracker/www/ha-baby-tracker.js
```

Result: exit 0, no output.

```text
python3 -m json.tool custom_components/ha_baby_tracker/manifest.json >/dev/null
python3 -m json.tool hacs.json >/dev/null
python3 -m json.tool custom_components/ha_baby_tracker/translations/en.json >/dev/null
python3 -m json.tool custom_components/ha_baby_tracker/translations/pl.json >/dev/null
```

Result: exit 0, no output.

```text
git diff --check
```

Result: exit 0, no output.

```text
rg -n <token/private-key/private-IP/password-assignment patterns> README.md CHANGELOG.md hacs.json ha-baby-tracker.js custom_components/ha_baby_tracker tests .github/workflows
```

Result: exit 1 with no matches. Interpreted as clean.

Brand dimensions:

```text
icon.png 256x256
icon@2x.png 512x512
logo.png 256x256
logo@2x.png 512x512
```

Frontend bundle equality:

```text
cmp -s ha-baby-tracker.js custom_components/ha_baby_tracker/www/ha-baby-tracker.js
```

Result: exit 0.

## Legacy Mode Verification Reasoning

No live HA/browser runtime verification was performed in this worker session. Legacy no-backend mode was verified by code inspection plus `node --check`:

- Backend detection only runs through `hass.callWS({type: "ha_baby_tracker/list_children"})`.
- If WS is unavailable, fails, or returns no children, `_backendAvailable` remains `false`.
- In that state, `_loadData()` and `_saveData()` execute the existing localStorage paths.
- Feeding, lactation, diapers, sleep, and growth methods still mutate the same existing in-memory maps and call `_saveData()`.
- Backend add/timer calls are no-ops unless `_backendAvailable` is true.
- Rendering/display/chart code, including WHO percentile/chart logic, was not rewritten.

Therefore the five existing data tabs keep their legacy storage behavior when no backend is present.

## Design Notes

- `integration_type` is `service`. Home Assistant's manifest docs define `integration_type` per config entry; `device` is for one physical device per config entry. This integration provides a service/backend plus one logical child device per entry, so `service` matches the family templates and avoids overstating a physical-device integration.
- `iot_class` is `calculated` because the integration computes entities from Store data and timers without polling a physical device or cloud API.
- Backend entries preserve the card's existing fields and add an `id` when absent. The extra `id` enables `update_entry` and `delete_entry` without changing the rendered fields.
- The repo did not contain a root `icon.png`; brand assets were generated from existing `banner.png` as a rounded square crop. This is the only deviation from the prompt wording "generate from existing repo icon.png".

Reference docs checked:

- Home Assistant manifest docs: https://developers.home-assistant.io/docs/creating_integration_manifest/
- Repo family patterns from `ha-frigate-privacy` and `ha-tools-email-integration`.

## Risks

- Not live-tested in a Home Assistant runtime; websocket registration, config flow UI, service target behavior, and frontend loading still need coordinator/runtime validation.
- `migrate_local_data` requires admin. Non-admin household users can log data but cannot migrate old localStorage data.
- Services accept a `device_id` field and also work with the device selector field. HA service-target UI behavior should be confirmed in live HA.
- The card keeps immediate local UI mutation before async backend confirmation. A failed backend write can briefly appear in the UI until the next backend refresh.

## Follow-Up

- Coordinator should run HA runtime smoke after install: config flow per child, frontend log line, Lovelace card load, WS list/get/add/timer roundtrip, services, sensors, entry removal Store cleanup.
- Coordinator should run HACS/hassfest GitHub actions after review and commit.
- Coordinator handles Obsidian/Notion/Telegram per prompt.

## State

git_state: changed_uncommitted

```text
 M .github/workflows/hacs.yml
 M CHANGELOG.md
 M README.md
 M ha-baby-tracker.js
 M hacs.json
?? .github/workflows/hassfest.yml
?? custom_components/
?? tests/
```

github_state: not_touched

durable_capture: repo-local report only; coordinator handles Obsidian/Notion/Telegram

telegram_state: not_applicable_coordinator_handles

instruction_sync: not_applicable
