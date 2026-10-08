# Candidate activation — review package

Baby Tracker 5.0.20: runtime source
`174cc78a8a887d595f8a2559e4d84a5b697b6640`, 16 component files.
Package SHA-256: `b082458feba090bb753981c5fd24bee49f1d370ac2299afc0b2420f118743c83`.
This review prepares a concrete operation. It does not authorize a production
Core restart, public release/tag/main merge, reply or issue closure.

## Current read-only baseline

The October 8 readback found Core 2026.10.0b1 and an installed source manifest
at 5.0.18. It read package metadata, file hashes and Baby's existing manual-panel
asset URL, without reading child stores, writing files or restarting anything.
A source manifest does not establish which Python version Core has imported.

The candidate changes six existing component files: `const.py`, `manifest.json`,
`model.py`, `storage.py`, `websocket_api.py` and `www/ha-baby-tracker.js`.
Two additional existing brand images are outside the candidate inventory and
are preserved. Matching integration/community JavaScript copies, existing gzip
copies and the one Baby manual-panel URL must be handled together. Activating
only the JavaScript would leave new atomic-write commands without their backend.

## Proposed named maintenance scope

1. Freeze the accepted runtime and validate every expected component byte.
   Re-read the production source, panel/resource URLs and active Core immediately
   before mutation; the readback above is not a future write baseline.
2. Take a fresh local rollback snapshot of intended files and Baby resource
   registrations. Store private data locally only; preserve child stores, config
   entries, other integration packages and subsequent work by other owners.
3. Compare-and-swap only those six component files, matching existing community
   JS/gzip copies and the exact Baby URL within the current YAML. Preserve extra
   brand files and every unrelated YAML byte. Do not restore an old whole config.
4. Run configuration validation before and after the scoped update. On failure,
   restore only intended files while their bytes still match the owned update.
5. Perform one explicitly authorized Core restart to import the matching backend
   and card. This is not a Core upgrade or a routine ZHA integration reload.
6. Read back all expected package files, both served assets and versioned URLs,
   loaded integration/entity preservation and backend capabilities. Check local
   hashes/counts of original household records and timers without exposing their
   contents in screenshots or public evidence. Use only owned synthetic fixtures
   for new behavior and remove them after checking preservation.
7. Restore only the fresh owned file/resource snapshot if activation fails;
   any recovery restart must also be included in the granted maintenance scope.

No production mutation has been performed for 5.0.20. The separately named
backend/Core scope remains required, while source/UI/material work continues.

## Current candidate evidence

The timestamp fix passed reproduction before/after tests for unsafe dates,
merged updates and the repeated autumn hour. The full local suite had 28 Python
and 63 JavaScript tests. CI on the final runtime is green for tests, hassfest,
validation, HACS and both HA runtime workflows. Its exact HA matrix covers
2025.2.0, 2026.10.0 and 2026.10.0b7 with real Store/WebSocket/sensor tests.
A fresh live HACS case rejected unsafe dates for administrator and household
roles and retained an old invalid 64-bit timestamp through restart with healthy
sensors, then verified its repair. Sealed security findings and their practical
integer-range qualification remain in the local owner evidence.

Public v5.0.15 fresh Download and onboarding were tested through native HACS/HA.
Exact candidate HACS API upgrade retained six categories, a native linked pair
and both active timers; the native card displayed them after reload. Final
copy-only fresh HACS download matched all 16 files and the served JavaScript,
with the corrected Polish text visible in actual HA. SHA selection/download was
API: native release selection/download of the unreleased commit is not claimed.
The final public target tag is checked separately after publication.

Installed administrator/household layout, panel/dashboard, PL/EN, light/dark,
wide/narrow, all six tabs, empty/populated profiles, long labels, keyboard focus
and next-card separation were checked. A short 50-sample DOM observation during
an active timer retained draft text, textarea identity and height; it is not a
complete performance or availability guarantee. Actual native Chrome zoom
at200%/400% confirmed DPR2/4, widths960/480, all six tabs without horizontal
overflow, a long synthetic label, empty state and visible native Tab focus.
Original100% was restored. New production activation/preservation remains open.

The final HACS, copy and zoom batches restored complete fresh CURRENT snapshots, all
packages and runtime data, then independently read back the prior version.
Historical proofs keep their original versions. The former staging permission
failure was repaired before native QA and is not a current blocker.

The [acceptance queue](qa-acceptance-queue.md) retains every slot and assigned AC.
After complete acceptance, the coordinator grants the exact delivery commit,
artifacts and individual replies. A current-turn grant and successful publish
guard are required; this review and green CI are not that grant.
