# First-run resource review

Reviewed on October 2, 2026 against candidate runtime commit
`3e3e065303717158ad96bb4013997cc5e9003315`, unchanged at documentation commit
`ca54a2c5c0701807ccc41c27a67eaef61091c163`.

The integration creates a versioned Lovelace module resource when the first
child is configured. This removes the need for a manual resource URL. It does
not guarantee that an already-open dashboard loads that new module immediately.
README therefore instructs the user to reload once after adding the first child.

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

## Evidence boundary

The existing Home Assistant tests prove resource creation, version updates,
preservation of an existing HACS copy, and removal after the last child unloads.
They do not prove that an already-open page imports a newly added resource.
An earlier partial native observation also required a reload before the card
appeared. It is not accepted as completed native first-run QA because browser
permission verification for that staging environment remains unresolved.

No first-run or issue slot is closed by this review. The public promise that
the next release would remove the reload step needs the explicit correction
prepared in [the response drafts](issue-1-response-drafts.md). Native installation,
roles, migration and the reporter's Zen result remain separate acceptance work.
