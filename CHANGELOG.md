# Changelog

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
