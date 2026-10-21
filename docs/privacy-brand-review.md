# Privacy requirement: unofficial integration and branding

Reviewed October 8, 2026 against the shared privacy task's own Baby Tracker scope.
README and NOTICE identify this as an independent, unofficial community
integration and do not claim affiliation or endorsement.

The official [Home Assistant Brands requirements](https://github.com/home-assistant/brands/blob/master/README.md#image-specification)
prohibit Home Assistant branded images as custom integration images because
they can suggest official status. The repository's Baby Tracker banner and
integration icons were inspected: they use the Baby Tracker name and a purple
gradient, without the Home Assistant logo. The README compatibility badge links
to Home Assistant; it is not used as the integration's icon.

The official [Home Assistant terms, section 9](https://www.home-assistant.io/tos/)
retain trademark rights and do not grant a trademark licence. The project MIT
licence applies to this project's code, without a claim to those marks.

The Anthropic name-policy part of the shared task refers to
`ha-claude-assistant`. It is not applicable to Baby Tracker: this product uses
neither the Claude/Anthropic name nor their runtime API or SDK. That other
product's requirement and the shared task's global status remain open to their
respective owners.

The separate README Privacy/Data section still describes server and browser
storage, access by authenticated household accounts, exports, logs/backups and
the external support link. Branding review does not replace those controls.

## Candidate 5.3 scope review — October 21, 2026

Runtime 7de5b25 retains the existing banner, integration icons, NOTICE and MIT
licence; this update changes no brand asset or affiliation claim. The earlier
branding source review above retains its stated date and scope.

Per-child feature policies now distinguish visibility, reading and execution.
Native 146/147 verified household actions, execute-only redaction, revocation,
explicit named-user denial even for administrators, and handled HA service
denials. Administrative policy repair remains separate. These rules do not
promise per-feature filtering of Home Assistant's global entity state stream.
The README explains that boundary, shared-origin local fallback, plaintext
reviewed export and the effect of deleting a child entry.

All 22 non-renderer component files are unchanged from the candidate on which
those native denials were verified. The final renderer changes retain escaped
record labels and add no transport. Source inspection finds no Sentry SDK,
telemetry/analytics client, external script or font import. Sentry is N/A for
this integration; deployment exposure and real-user error counts remain unknown.
No household Store, credentials or raw configuration are exported as evidence.
The three new public screenshots contain only synthetic QA diary content.
