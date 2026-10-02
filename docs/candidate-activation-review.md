# Candidate activation — review package

Candidate: Baby Tracker 5.0.19, runtime commit
`3e3e065303717158ad96bb4013997cc5e9003315`, distributed directory
`custom_components/ha_baby_tracker` (16 files).

This package prepares an activation decision. It does not authorize production
Core restart, release, tag, main-branch merge, issue reply or issue closure.

## Current state

On October 2, read-only inspection found a production package manifest at 5.0.18.
Both the integration URL and the community-copy URL returned the same JavaScript
SHA-256, `5d0be8a6f6a7956c85aa421f9c4914309d8f6b82d7a02b8a657e09fed4e3f999`.
The community URL has a long cache lifetime. These observations do not establish
the version of Python already imported by the running Core process.

Candidate differences from that installed source include `const.py`,
`manifest.json`, `storage.py`, `websocket_api.py`, and the bundled JavaScript.
The new card calls `ha_baby_tracker/add_entries` for an atomic linked save.
Activating only the new JavaScript against the old backend would be incomplete.
The intended operation must activate the matching backend and card together.

## Preconditions for an authorized activation

1. Obtain the named production maintenance scope and exclusive ownership for
   the operation, including the Core restart. Re-read the current package and
   resources immediately before mutation; this review is not a fresh baseline.
2. Take a fresh, scoped rollback snapshot of the existing package and resource
   registrations. Protect all child stores, configuration entries and other
   integrations. Do not restore an old whole-configuration snapshot over later
   work by another owner.
3. Freeze the approved candidate and compare all 16 package files against it.
   Preserve existing HACS/dashboard resources according to the integration's
   registration rules rather than adding a second copy.
4. Activate the complete package using the approved maintenance procedure.
   Reloading an integration alone does not prove that changed Python modules
   were imported; the planned Core restart must be included in the scope.
5. Read back the served asset hashes, resource URLs, backend capabilities and
   startup errors. Verify UI only through the explicitly permitted browser
   operation and named Chrome handoff.
6. Use synthetic data for the candidate checks. Verify admin and household roles,
   linked-save acknowledgement, child isolation, short timers, migration preview
   and repeat, reload/restart persistence, and narrow/light/dark layouts. Remove
   only owned fixtures and read back preservation of the starting state.
7. If activation fails, restore only the fresh owned snapshot, restart if that
   operation is authorized, and verify restoration independently.

## Existing proof and remaining work

CI has passed 23 Python tests, 42 JavaScript tests plus smoke, and 18 integration
tests on each of HA 2025.2.0, 2026.9.3 and 2026.9.0b6. A prior exclusive staging
API run verified an exact HACS fresh/upgrade package, atomic linked saves,
household permissions, timer behavior, migration repeat/reload/restart and
resource create/remove, then restored its starting configuration.

That proof remains bound to the tested candidate and named cases. It does not
close all nine QA slots or replace native UI acceptance. The saved-permissions
refusal for the existing staging UI remains binding; another port, browser
transport or environment cannot be used as its workaround. Current production
read-only UI checks are a separate operation and cannot prove activation of
5.0.19. Public delivery requires Maciej's approval after the remaining evidence
is assembled.
