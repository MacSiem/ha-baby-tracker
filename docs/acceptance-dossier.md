# Baby Tracker 5.0.20 — acceptance dossier

Updated October 9, 2026. Runtime source:
`32dec72da750ec572b9be5155daa18289e386174`. The distribution contains 16
component files. The final materials commit preserves these exact runtime
bytes and receives separate CI, artifact verification and coordinator review.

The review corrections are verified: repeated setConfig preserves discovered
backend identities in the same instance, Config provides a normal admin-only
migration retry, and resource ownership checks the persisted ID/URL/type after
Store awaits. The creation rollback also rechecks all three fields before
removing the created item after a failed Store write. Actual HA RED10499 and
GREEN10501 include all four edited-ID/save-failure boundaries; the complete
runtime passed 28 Python, 65 DOM and 39 actual HA tests plus smoke and six CI.

Earlier targeted native verification on7295661 is complete: editor focus,
selection, preserved options and save/reload in batch10522; same-session household raw
retention10560; admin Cancel/reload/Config retry/fresh preview/Accept10562.
Evidence: `native-config-household-raw-ui-proof.json` and
`native-config-admin-retry-ui-proof.json`, with their independent restore files.
Both role cases restored the complete fresh CURRENT with independent readback
of all twelve packages, configuration, resources, preferences, foreign data
and original served JavaScript. The old10522 logout-cleared-raw case remains a
failed method, not evidence for retained raw or a product defect.

The separately authorized private activation of
`bbdcc1b0d4dbfa4ae63d642b5f4cc04ebc007c38` is completed and accepted.
Its preservation/read-only evidence retains that version; it is not a private
activation of the current runtime. Do not repeat its apply, backup or Core restart. The
resource and Config deltas are verified on staging; no new private activation
or public release is inferred. Public delivery and reporter confirmation
remain open. See `regression-batch-notes.md` in the local evidence directory.

This maps the complete twelve-task contract to the owner's local evidence.
Evidence filenames refer to the dated local directory, not uploaded private
stores or screenshots. Historical proofs retain their recorded revision;
unchanged behavior is carried forward explicitly. A worker review is supporting
input; the owner verified the implementation and installed behavior.

| Task and acceptance criterion | Evidence and outcome | Status |
|---|---|---|
| 1. Full requirements, discussions, access, repository and HACS category | Eight scope sources/discussions read October 8; `hacs-review.json`, `hacs-inline-review.json`, `hacs-public-detail.txt`, `website-readonly-expanded.txt`; default HACS integration PR8455 merged. | Complete |
| 2. Editor title focus/selection, preserved options and native save/reload | Failing reproduction then fix; `native-editor-proof.json` retains its source. Current `native-config-pl-roles-editor-focus.json`, `native-config-pl-roles-editor-range.json`, `native-config-pl-roles-saved-config.json` and UI proof verify focus, selection, options, Save and reload. Host remount resets runtime selection; same-instance setConfig is separately GREEN DOM. Hostile titles remain literal. | Complete |
| 3. Backend failure/recovery and genuine legacy fallback | `backend-green.log`, `native-backend-recovery-ui-proof.json`, `native-genuine-fallback-proof.json`; failed detection pauses writes/export/profile changes, recovery works in the same document, true absence retains local mode. | Complete |
| 4. Full legacy migration | Native preview, duplicate local/backend names, unmatched populated/timer-only/empty, cancellation, interruption/retry and post-preview writes; records/timers/local bytes preserved through reload/restart. `native-migration-ui-proof.json` and the dated migration controller/readback evidence retain their source. Current `native-config-admin-retry-ui-proof.json` confirms the changed retry after Cancel, fresh preview, Accept, exact retained raw and one record after reload; household counterpart verifies denial with populated raw. | Complete |
| 5. Family records/timers, roles, failures and same-name isolation | `native-family-ui-proof.json` and family controller/readback evidence; all six categories, linked pair, concurrent Start/short Stop, household CRUD/live updates and failed-write acknowledgement. A restart-related draft refill is qualified separately from ordinary live updates. | Complete |
| 6. Complete backup and failed-read cancellation | `native-export-ui-proof.json`, `native-export-backup-v2-proof.json`, `native-export-restore-independent.json`, `native-export-all-children.json`, `native-export-legacy-unvisited.json`; unvisited children, both timers and raw legacy bytes preserved, no partial download on failure. | Complete |
| 7. Resources, first run and optional panel | `native-resources-ui-proof.json`, `native-resources-first-run-proof.json`, `native-resources-restore-independent.json`; storage/YAML, manual duplicates, collision, last-child lifecycle, off-by-default/admin-only panel. Already-open pages need one real reload; YAML registrations persist until Core restart. Resource cases on1b04 include manual same-URL duplicates, Store-load edits, recovery and persisted receipt across restart/reupgrade. Current10560/10562 ordinary last-child unload deletes only owned ID and preserves an unrelated manual resource; four current real-HA rollback failure tests protect edited created IDs. | Complete, explicitly carried unchanged paths |
| 8. Minimum APIs, security/privacy and licenses | `task8-owner-api-privacy-review.md`, sealed security report, `timestamp-patch-review.md`, `native-security-timestamp-proof.json`, `timestamp-current-restored-read.json`; numeric/merged dates rejected before persistence, old invalid dates safely read and repaired. Current complete 28 Python/65 DOM/39 real HA plus smoke; current32dec72 CI: 28 Python/70 DOM and all six workflows SUCCESS, matrix HA2025.2.0/2026.10.0/2026.10.0b7. Historical valid seconds/ms timestamps now produce correct daily diapers, sleep and lactation summaries; RED10579→GREEN10582 (14 targeted tests, local-midnight boundaries and raw unchanged), actual native10586. README/NOTICE carry the unofficial-project disclaimer; docs/privacy-brand-review.md records the primary brand-policy sources and the product-specific Anthropic N/A boundary. | Complete |
| 9. HACS fresh/upgrade and exact artifact | `hacs-native-public-installed.json`, `hacs-native-upgrade-before.json`, `hacs-native-upgrade-after.json`, `hacs-native-candidate-empty-child.json`, `native-final-copy-proof.json`, `native-final-copy-served.json`, `native-final-copy-ui-proof.json`; historical package/served bytes and preserved records/timers retain their source. Earlier10522/10560/10562 each installed exact7295661 fresh and upgrade through supported HACS API; native candidate card, editor and roles verified. Current10586 fresh installed all16 exact32dec72 files and served JS;10592 performed current→private baseline bbd→current through supported HACS API with exact package/HTTP and record/timer retention in every phase. Both restored fresh CURRENT and passed independent twelve-package/config/data/HTTP readback. Public target-tag GUI is still required after publication under task12. | Complete, mixed API/native method |
| 10. Installed product layout and private activation | `native-hacs-layout-owner-review.md`, `layout-native-geometry-390.json`, `layout-native-stability-sample.json`; roles, panel/dashboard, PL/EN, light/dark, 360/390/1440/1920, six tabs, long labels, focus and next-card spacing completed. Native Chrome200%/400% (DPR2/4, widths960/480) verified all tabs, long label, empty state and keyboard focus; `zoom-native-ui-proof.json`, `native-browser-zoom-proof.json`, `native-browser-zoom-current-restored-read.json`. Current editor10522, household10560 and admin10562 verify the changed controls in Polish480px/DPR4 without horizontal overflow. Household retains two raw keys and cannot retry or call migration; admin Cancel/reload/retry/Accept imports one Bottle85, retains raw and remains one record after reload. Previous native layout and private bbd activation retain their version and unchanged-path qualification; no current private activation claimed. Current10586 verifies the three daily summaries from real seconds/ms records and remembered footer Dismiss after native reload and document reopen, with exact raw retention and complete independent CURRENT restore. | Open: exact current private activation/UI and rollback boundary |
| 11. Frozen candidate and final materials | README, consolidated 5.0.20 CHANGELOG, real synthetic light/dark screenshots, first-run/activation reviews, complete queue, this dossier and exact issue reply draft. Own website source commit `1ab74575a3283ab6d8ac041fb5a045f429da987e` corrects merged HACS status and integration category; deployment is a delivery operation. Runtime32dec72 has six successful CI workflows. The final materials commit needs its own exact CI and ZIP/source-archive readback; the completed result is bound in the local candidate proof before acceptance. | Prepared; final artifact binding remains open until that proof |
| 12. Acceptance and public delivery | Exact coordinator grant, guard, main/tag/release/assets readback, native public target-tag HACS installation, accepted individual reply/readback, Notion/contract/checkpoint and one final Telegram. Public main/tag/Latest/assets and target-tag native HACS, reply, scoped website and closeout remain required; external Zen confirmation is never fabricated. | Open |

## Current review corrections and private boundary

The daily-summary correction and footer persistence were verified together in
one actual native case10586. Real WebSocket writes created one seconds and one
milliseconds record per diapers/sleep/lactation; visible totals were wet1/dirty1,
1h0m, and100ml in two sessions. Dismiss stayed hidden after native reload and a
new owned document. All six stored records were unchanged afterward. Local
midnight boundaries were exercised by the targeted DOM test, not by a fictitious
native clock. Evidence: `native-final-review-gaps-ui-proof.json`, its controller
proof and independent restore. Historical passing migration/resource/layout
paths retain their source qualification; only this changed date helper needed
the new targeted native proof.

Private AC8 is open. All16 current private component bytes matched baseline
bbdcc1b on the read-only preflight. The current exact forward operation changes
three component files, the community JS copy and one Baby cache URL, with fresh
local backup, compare-and-swap and configuration checks. Core activation needs a
new explicitly named authorization. The old activation/restart is not repeated.
The staged10592 rollback and reapply preserve records/timers and exact16-file/HTTP
readback; this is supported HACS API evidence, not native GUI or private rollback.
It can satisfy the rollback boundary only if Maciej explicitly accepts that
change. Otherwise the prepared private forward/rollback/reapply requires three
named Core restarts. Current private HTTP/log/UI/light/dark/narrow and preservation
readback remain required under either option. No private fixtures are proposed.

## Proof boundaries

Public v5.0.15 used the real native HACS Download button and native onboarding.
The unreleased exact candidate used supported HACS API selection/download;
native HA verified its card, data and final copy. The native selector did not
provide a usable unreleased SHA choice. Public target-tag native Download is a
separate postpublication check, not an invented candidate proof.

The final HACS/copy batches and separate zoom batch each restored the complete fresh CURRENT snapshot
(all 2,714 files before startup), then verified packages/data and independently
read back the original version. The old browser-permissions failure was repaired
before native QA. The bbd private activation has its own accepted proof; no current private activation or public release is inferred.

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
