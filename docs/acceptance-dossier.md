# Baby Tracker 5.0.20 — acceptance dossier

Updated October 8, 2026. Runtime source:
`174cc78a8a887d595f8a2559e4d84a5b697b6640`. The distribution contains 16
component files. Later materials commits preserve those bytes; the final
repository commit receives its own CI check and exact release grant.

This maps the complete twelve-task contract to the owner's local evidence.
Evidence filenames refer to the dated local directory, not uploaded private
stores or screenshots. Historical proofs retain their recorded revision;
unchanged behavior is carried forward explicitly. A worker review is supporting
input; the owner verified the implementation and installed behavior.

| Task and acceptance criterion | Evidence and outcome | Status |
|---|---|---|
| 1. Full requirements, discussions, access, repository and HACS category | Eight scope sources/discussions read October 8; `hacs-review.json`, `hacs-inline-review.json`, `hacs-public-detail.txt`, `website-readonly-expanded.txt`; default HACS integration PR8455 merged. | Complete |
| 2. Editor title focus/selection, preserved options and native save/reload | Failing reproduction then fix; `native-editor-proof.json`, native editor snapshots and saved configuration. Hostile titles remain literal. | Complete |
| 3. Backend failure/recovery and genuine legacy fallback | `backend-green.log`, `native-backend-recovery-ui-proof.json`, `native-genuine-fallback-proof.json`; failed detection pauses writes/export/profile changes, recovery works in the same document, true absence retains local mode. | Complete |
| 4. Full legacy migration | Native preview, duplicate local/backend names, unmatched populated/timer-only/empty, cancellation, interruption/retry and post-preview writes; records/timers/local bytes preserved through reload/restart. `native-migration-ui-proof.json` and the dated migration controller/readback evidence. | Complete |
| 5. Family records/timers, roles, failures and same-name isolation | `native-family-ui-proof.json` and family controller/readback evidence; all six categories, linked pair, concurrent Start/short Stop, household CRUD/live updates and failed-write acknowledgement. A restart-related draft refill is qualified separately from ordinary live updates. | Complete |
| 6. Complete backup and failed-read cancellation | `native-export-ui-proof.json`, `native-export-backup-v2-proof.json`, `native-export-restore-independent.json`, `native-export-all-children.json`, `native-export-legacy-unvisited.json`; unvisited children, both timers and raw legacy bytes preserved, no partial download on failure. | Complete |
| 7. Resources, first run and optional panel | `native-resources-ui-proof.json`, `native-resources-first-run-proof.json`, `native-resources-restore-independent.json`; storage/YAML, manual duplicates, collision, last-child lifecycle, off-by-default/admin-only panel. Already-open pages need one real reload; YAML registrations persist until Core restart. | Complete |
| 8. Minimum APIs, security/privacy and licenses | `task8-owner-api-privacy-review.md`, sealed security report, `timestamp-patch-review.md`, `native-security-timestamp-proof.json`, `timestamp-current-restored-read.json`; numeric/merged dates rejected before persistence, old invalid dates safely read and repaired. Local 28 Python/63 JS tests; final CI matrix HA2025.2.0/2026.10.0/2026.10.0b7. | Complete |
| 9. HACS fresh/upgrade and exact artifact | `hacs-native-public-installed.json`, `hacs-native-upgrade-before.json`, `hacs-native-upgrade-after.json`, `hacs-native-candidate-empty-child.json`, `native-final-copy-proof.json`, `native-final-copy-served.json`, `native-final-copy-ui-proof.json`; package/served bytes exact and records/timers preserved. | Complete, mixed API/native method |
| 10. Installed product layout and private activation | `native-hacs-layout-owner-review.md`, `layout-native-geometry-390.json`, `layout-native-stability-sample.json`; roles, panel/dashboard, PL/EN, light/dark, 360/390/1440/1920, six tabs, long labels, focus and next-card spacing completed. Actual browser zoom and new private backend/card activation/preservation remain required. | Open |
| 11. Frozen candidate and final materials | README, consolidated 5.0.20 CHANGELOG, real synthetic light/dark screenshots, first-run/activation reviews, complete queue, this dossier and exact issue reply draft. Own website source commit `1ab74575a3283ab6d8ac041fb5a045f429da987e` corrects merged HACS status and integration category; deployment is a delivery operation. The owner verifies the final materials commit CI/readback before acceptance. | Materials prepared; final CI/readback required |
| 12. Acceptance and public delivery | Exact coordinator grant, guard, main/tag/release/assets readback, native public target-tag HACS installation, accepted individual reply/readback, Notion/contract/checkpoint and one final Telegram. All remain required; external Zen confirmation is never fabricated. | Open |

## Proof boundaries

Public v5.0.15 used the real native HACS Download button and native onboarding.
The unreleased exact candidate used supported HACS API selection/download;
native HA verified its card, data and final copy. The native selector did not
provide a usable unreleased SHA choice. Public target-tag native Download is a
separate postpublication check, not an invented candidate proof.

The final two staging batches each restored the complete fresh CURRENT snapshot
(all 2,714 files before startup), then verified packages/data and independently
read back the original version. The old browser-permissions failure was repaired
before native QA. No production activation or public release is inferred.

Screenshots show only synthetic QA Alex/QA Sam. Household records are available
to authenticated household accounts; legacy data is scoped to browser origin
and profile. Exports are plaintext and support links are user-initiated. Local
HA entities, logs and backups retain their ordinary privacy implications.
The sealed scan's static `1e20` example is not a proven orjson round trip; the
live old-invalid-date preservation/repair case used representable `1e18`.
The brief 50-sample DOM check is not a complete performance guarantee.

The [full nine-slot/seven-scope queue](qa-acceptance-queue.md) retains each
assigned acceptance requirement. The [activation review](candidate-activation-review.md)
prepares fresh scoped backup, compare-and-swap and named Core restart; it gives
no permission. The [reply draft](issue-1-response-drafts.md) is conditional on
actual release/readback and approval. Issue #1 stays open for reporter confirmation.
