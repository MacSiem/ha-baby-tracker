# Changelog

## 5.3.0 (candidate)

- Keep explanatory text and field labels at 14px, technical hints at 12px, and Tile within one native 56px row including the Home Assistant border.

- Recent journals now sort saved event/measurement dates instead of import order and respect HA display dates and clocks without changing stored records.
- The Sleep tab uses the shared HA-day midnight split and overlap union; incomplete sleep remains unknown. Diaper and lactation today panels use the same HA calendar.
- Long Tile titles stay in one row with their complete tooltip; mobile navigation retains readable text and selected-state contrast.

- Fixed first-load History readiness after asynchronous backend discovery.
- Kept Compact inside its native four-row Sections allocation at narrow widths; all three labelled actions remain available as accessible icon buttons.
- Increased control text to 14px and corrected primary action contrast in both Home Assistant schemes.
- Native entity policy denials now use Home Assistant's Unauthorized service response while preserving command admission and data.

- Add per-child household access with separate visibility, read and execute rules, revision-checked policy saves, fresh native HA authorization and guarded export snapshots. Preserve the independent administrator repair path.
- Add per-child Tile and Compact cards, a retained Full diary, visual configuration and stable child selection. Open existing entry forms in a native-owned diary dialog, keeping dialog tab navigation local and restoring focus on close.
- Follow HA date, time and time-zone preferences without changing stored calendar days or exact timestamps. Show seven-day rhythm charts and matching tables, split sleep across HA days/DST and keep unknown coverage explicit.
- Expose native daily measurements, diaper buttons, a persistent sleep switch and confirmed entry events through the existing command boundary. Preserve device and entity identities.
- Offer explicit dashboard placement with an inert preview, native dialog ownership across own save remount, one readback after a lost response and exact session-scoped Undo protected from foreign edits. Lovelace compare-before-save is not atomic CAS.
- Enable the policy-filtered sidebar for newly configured children, preserve existing panel settings and URL collisions, and keep denied children out of panel discovery. Keep local browser mode for confirmed absence of the integration.
- Preserve denied-read redaction, stale-response fences, unknown write results, existing forms, timers, migration and reviewed legacy export compatibility.

## 5.1.1 (2026-10-16)

- Keep unfamiliar saved type and side values readable in history, feeding, diaper, growth and lactation lists. Values such as `constructor` and `__proto__` now use the existing raw-label or bullet fallback instead of inherited JavaScript properties.
- Preserve the original saved records, known localized labels and escaped text; this display correction does not migrate or rewrite child data.
- Show the saved numeric value without an assumed unit when a growth measurement has an unfamiliar type; known weight, height and head circumference units remain unchanged.
- Correct the Config instructions to name this integration as the card's automatic registration provider.
- Keep unfamiliar breastfeeding sides readable in recent sessions, recognize both sides, and distinguish missing duration from a saved zero. Escape arbitrary side labels and localize fractional seconds.
- Label the child's name and date of birth in the initial setup form in Polish and English.

## 5.1.0 (2026-10-15)

- Recover server records after Home Assistant startup/reconnect; failed reads remain unconfirmed instead of showing empty totals.
- Keep active timers visible above history filters and use a localized, stable title editor.
- Keep internal cache keys anonymous even when names and birth dates are included in an export.

- Add current/previous Monday–Sunday summaries from saved records. Linked breastfeeding pairs count once; unknown volumes, durations and dates stay explicit. Running timers do not invent saved totals.
- Show weight in kg and height in cm on separate interactive, dated charts with matching Chart/Data views, numeric axes, period filters, keyboard selection and responsive resizing.
- Add full saved-record history with local-day and type filters, older/newest pagination, explicit unknown dates, and reset/empty states. Child changes preserve isolation and active timers.
- Review JSON exports in a native dialog with an editable filename and exact preview. Names and birth dates are opt-in for each export; notes, raw identifiers and arbitrary browser data are excluded. Preserve six categories, readable legacy measurements and both running timers; unreadable legacy entries stay explicitly omitted. This is a reviewed export, not a raw Store backup.
- Preserve the open export dialog, filename, focus and frozen preview during ordinary card updates. A download handoff stays unconfirmed until independently verified.
- Improve touch targets, narrow-container navigation, child-switch focus and truthful save/migration outcomes in Polish and English.

## 5.0.20 (2026-10-08)

- Preserve a resource edited during an ownership write failure; rollback rechecks its current ID, URL and type before deletion.
- Preserve discovered child identities, the selected child and active tab when configuration is reapplied to the same card instance. Home Assistant may recreate the preview or dashboard card during Save, which starts at the first child and Feeding tab.
- Offer an administrator a fresh migration preview from Config after cancellation, without clearing the decision marker or local data. Prevent concurrent prompts and repeat imports after completion.
- Persist exact Lovelace resource creation receipts; preserve manual same-URL resources and duplicates, retain ownership after cleanup failures, and serialize setup/last-child unload.

- Confirm server and browser-only writes before clearing forms or changing timers. Failed saves retain input, history and active timers; immediate timer stops remain stopped after reload, and failed breastfeeding side changes keep the original timer and side.
- Save linked feeding and lactation records atomically. Retrying a save does not duplicate the pair, and a second parent's Start keeps the existing timer; short Stop requests also reach the server.
- Retry failed backend discovery instead of treating a connection error as absence of the integration. Pause saving, profile changes and export until the backend is confirmed; retain genuine browser-only fallback.
- Use atomic, private Store writes with independent readback before acknowledgement. Failed writes leave cached data unchanged.
- Keep children with identical display names separate by config-entry ID. Ignore late reads after child switches or newer updates, and share live changes with authenticated household accounts.
- Validate numeric record timestamps before saving, including the full merged update. Safely read old invalid dates without disabling sensors; preserve historical seconds/milliseconds and the absolute latest event across the repeated autumn hour.
- Count daily diapers, sleep and lactation by local event date, including historical epoch seconds and milliseconds without changing stored records. Preserve local wall-clock defaults and manual sleep intervals during updates, including midnight and daylight-saving changes.
- Preview legacy migration before writing. Refuse ambiguous populated names, skip empty profiles, preserve local bytes, recheck data under the write lock and keep interrupted imports retryable without overwriting new records or duplicating imported records/timers.
- Export all configured children, including unvisited children with identical names, six record categories, running timers and raw legacy browser data. Cancel the download when a server read fails.
- Register one versioned resource in storage-mode dashboards; support YAML mode and preserve manual resources. Offer an administrator-only sidebar as an opt-in option, off by default. An already-open HA page may need one reload after the first child is added.
- Manage configured children through Home Assistant settings while retaining the legacy browser editor without a backend. Preserve focus, selection and keyboard navigation in the card editor and forms.
- Translate the main Polish forms/history labels and correct the multi-child help text. Use the matching 5.0.20 backend and bundled card; require Home Assistant 2025.2 or later.

## 5.0.15 (2026-08-28)

- Isolation: Bento CSS is component-local and cannot be captured from `window.HAToolsBentoCSS` by load order.
- Isolation: persistence is now card-local, removing `window._haToolsPersistence` load-order coupling while retaining existing localStorage keys.
- Isolation: removed the document-wide sibling-card injector and the shared global escape singleton.
- Security: every card value is converted to text before local HTML escaping.
- Tests: prevent cross-card DOM scanning and any future `window._haToolsEsc` dependency.
- UX: restored the donate footer within the Baby Tracker card's own shadow root.

## 5.0.14 (2026-08-27)

- Security: coerce every frontend value to text before HTML escaping, closing the non-string array/object bypass for persisted entries.
- Validation: reject nested entry values at the WebSocket and Store boundaries while keeping scalar strings, numbers, booleans, and null compatible.
- Reliability: avoid `charAt`/`split` crashes on malformed legacy data and render generated YAML as inert text.
- Tests: exercise hostile non-string data through feeding, diaper, sleep, growth, lactation, and generated-YAML rendering in jsdom.
- Packaging: remove the committed agent run log and ignore future `codex-runs` output.

## 5.0.13 (2026-08-21)

- Security: escape every runtime value rendered into the card's HTML, including the configured title, persisted feeding/diaper/sleep/growth data, and lactation values.
- Fix: move the bundled-card existence check off Home Assistant's event loop.
- Compatibility: require Home Assistant 2024.7.0 or later.
- Packaging: remove redundant root card and duplicate logo assets; the integration-bundled card and icon assets are authoritative.

## 5.0.12 (2026-07-18)

- Docs: remove the WHO growth-percentile claim from the README and the card getting-started tip. Growth charts plot the weight and height you log; percentile reference curves are not implemented.

## 5.0.11 (2026-07-18)

- Fix (UI): the small accent dot before section titles no longer detaches from the title text (it was pushed to the opposite edge by the header's flex space-between); it is now pinned next to the title.

## 5.0.10 (2026-07-17)

- Fix (UI): responsive tab bar — tabs stretch to fill the card width and wrap on narrow layouts instead of being pinned to content width and clipped (shared HA Tools tab styling).

## 5.0.10 (2026-07-17)

- Fix (UI): responsive tab bar — tabs stretch to fill the card width and wrap on narrow layouts instead of being pinned to content width and clipped (shared HA Tools tab styling).

## [5.0.8] - 2026-07-12

- Fix: the localStorage→Store migration prompt no longer fires for non-admin users — `migrate_local_data` is admin-only server-side, so their acceptance could only fail silently. Non-admins now get a one-time info toast that an admin can migrate the browser data.
- Fix: a failed migration websocket call now shows an error toast instead of only logging a console warning.

## [5.0.7] - 2026-07-12

- Fix: non-admin household members can now correct and delete entries — `update_entry` and `delete_entry` no longer require admin (matching `add_entry` and timers, which were already open). `migrate_local_data` stays admin-only.

## [5.0.6] - 2026-06-15

- Theme: dark/light now follows the active Home Assistant theme (luminance of --card-background-color) instead of OS prefers-color-scheme.
- Fix: preserve input focus/caret during hass-update re-renders.


## [5.0.5] - 2026-06-15

- Theme: dark/light now follows the active Home Assistant theme (luminance of --card-background-color) instead of OS prefers-color-scheme.
- Fix: preserve input focus/caret during hass-update re-renders.


## [5.0.4] - 2026-06-15

- Theme: dark/light now follows the active Home Assistant theme (luminance of --card-background-color) instead of OS prefers-color-scheme.
- Fix: preserve input focus/caret during hass-update re-renders.


## [5.0.3] - 2026-06-15

- Theme: dark/light now follows the active Home Assistant theme (luminance of --card-background-color) instead of OS prefers-color-scheme.
- Fix: preserve input focus/caret during hass-update re-renders.

## [5.0.2] - 2026-06-13

### Added
- getGridOptions() for correct sizing in HA sections (grid) layout.

# Changelog — Baby & Lactation Tracker

## [5.0.1] - 2026-06-13

### Fixed
- `add_entry` (websocket) and service writes now default `timestamp` server-side (epoch ms, matching the card's `Date.now()`) when the caller omits it, so today-counters and timestamp sensors always count new entries.

## [5.0.0] - 2026-06-12

### Major
- Migrated from a Lovelace-only plugin to a Home Assistant integration.
- Added one config entry and device per child, with server-side Store persistence.
- Added services for feeding, diaper, and sleep logging.
- Added per-child sensors for last feeding, last diaper, feedings today, diapers today, and sleeping state.
- Added websocket API for card data access, entry writes, timers, and localStorage migration.
- Bundled and auto-registered the Lovelace card through the integration frontend path.
- Added HACS integration metadata, hassfest workflow, HACS workflow, translations, and brand assets.

### Compatibility
- Legacy card localStorage fallback remains available when the backend integration is absent.
- WHO percentile and growth chart code remains client-side.

## [4.1.3] - 2026-05-12

### Fixed
- Removed Google Fonts CDN @import (1 occurrence(s)); now uses system font stack with Inter as the preferred locally-installed face.
- Normalized bare `font-family: "Inter", sans-serif` declarations to a complete cross-platform system stack.
- Privacy section in README: claim now matches behaviour (no CDN dependencies).

All notable changes to **Baby & Lactation Tracker** are documented here.

## [4.0.0] - 2026-05-10

### Major
- **Split from `MacSiem/ha-tools` monorepo** into a dedicated standalone HACS plugin.
- Bundled Bento Design System CSS inline — no shared dependency required.
- Inlined `_haToolsEsc` XSS sanitizer.
- Persistence keys migrated to per-tool namespace `ha-baby-tracker-…` (clean break — old data under `ha-tools-…` is **not** migrated automatically).
- Donation/support footer added to the panel.
- Cross-tool discovery banner removed; each tool stands on its own.

### Compatibility

- Home Assistant ≥ 2024.1.0
