# First-run resource review

Updated October 9, 2026. The final runtime package is 5.0.20 at
`32dec72da750ec572b9be5155daa18289e386174` (16 files). Later changes to this
review and the screenshots do not change those component bytes.

The integration creates one versioned Lovelace module resource when the first
child is configured in storage mode. No manual resource URL is required. An
already-open Home Assistant document can retain its earlier resource list;
README correctly asks the user to reload once before opening the new card.

## Cause

Home Assistant 2026.9.4 specifies frontend `20260826.7` in its
[frontend manifest](https://github.com/home-assistant/core/blob/2026.9.4/homeassistant/components/frontend/manifest.json).
That frontend's
[Lovelace panel](https://github.com/home-assistant/frontend/blob/20260826.7/src/panels/lovelace/ha-panel-lovelace.ts)
fetches resource URLs behind a module-level `resourcesLoaded` flag. Creating a
resource later does not reset that flag in the existing browser document.

Adding `frontend.add_extra_js_url` alone would not establish a fix. Core's
[URL manager](https://github.com/home-assistant/core/blob/2026.9.4/homeassistant/components/frontend/__init__.py)
broadcasts changes to clients subscribed to `frontend/subscribe_extra_js`.
The reviewed frontend tag contains no subscriber to that command; its
[index template](https://github.com/home-assistant/frontend/blob/20260826.7/src/html/index.html.template)
imports extra modules during page load. A backend notification test by itself
would therefore miss the browser behavior.

## Installed native evidence

On Home Assistant 2026.9.4, a separately owned document opened before the first
child did not discover the card immediately after native setup. One real page
reload made the card available in the native card catalog. A fresh document
also loaded the YAML-mode fallback. The first-run entrypoints retain their historical qualification. Later resource
ownership corrections are separately verified by real HA RED10499→GREEN10501
and ordinary last-child cleanup in10560/10562; no zero-reload promise is inferred.

The October 8 lifecycle batch verified duplicate cleanup, preservation of a
manual resource, two children, last-child disable/re-enable/removal and an
occupied panel URL. YAML extra-JS/static registrations remain in the Core
process until restart; their immediate removal is not claimed. The optional
panel is off by default, appears to an administrator when enabled and is not
available to a household account.

A subsequent public v5.0.15 installation used the actual HACS Download button
and native first-child/card setup. Upgrading through supported HACS APIs to
the exact candidate retained all six record categories, a linked pair and both
active timers. The native card showed the same records and timers after reload.
Candidate SHA selection/download used the API; the native release selector did
not offer a usable choice for that unreleased commit. This does not establish
native download of the eventual public tag, which is checked after publication.

The former browser-permissions failure was repaired and independently verified
before these native cases. It is historical and is not a current blocker.
Evidence: `native-resources-ui-proof.json`, `native-resources-first-run-proof.json`,
`hacs-native-public-first-card.txt`, `hacs-native-upgrade-after.json` and
`native-final-copy-ui-proof.json` in the owner's dated local evidence directory.
Both later isolated batches restored their complete fresh CURRENT snapshots
and independently verified all packages and runtime data.

The correction was already posted on October 3. The remaining exact reply is
in [the response drafts](issue-1-response-drafts.md). It is posted only after the
public release and installation checks, and does not claim the reporter's Zen
installation has already been verified.
