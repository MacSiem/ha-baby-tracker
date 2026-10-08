# Issue #1 — response drafts

The HA coordinator must review the exact remaining draft and grant its individual
posting after checking the current evidence. The correction below was already
posted on October 3; do not send it again. That posting does not approve the
remaining draft or the current candidate.
The reporter uses Zen with Home Assistant 2026.9.4 and is waiting for a release.
Do not request a candidate retest before a supported public artifact exists.

## Correction already posted — October 3, 2026

[Published comment](https://github.com/MacSiem/ha-baby-tracker/issues/1#issuecomment-5968769664), verified by readback on October 8:

Hi @webmediart-github, the update is still in progress. The candidate includes automatic card registration, and installation and first-run checks are still outstanding before release. One correction to my earlier reply: an already-open Home Assistant tab may still need a page reload, although adding a resource URL manually should no longer be necessary. I’ll post the release link and verified steps here when it’s ready.

## After version 5.0.20 is publicly available and its installation is verified

Hi @webmediart-github, version 5.0.20 is now available. Please update Baby Tracker through HACS, restart Home Assistant, and check that Baby Tracker has been added under Settings → Devices & services. If you have not added it yet, add your first child there. Then reload the Home Assistant page once and open the card with `type: custom:ha-baby-tracker`. No manual Lovelace resource URL is needed.

As noted in my October 3 update, an already-open tab can still need a reload after the first child is added.

When you have a chance, could you confirm whether the card opens in Zen on your Home Assistant installation? If it still shows “Custom element not found”, please send the exact error and any console messages mentioning `ha-baby-tracker`, without personal child data. I will keep this issue open until your original error is confirmed resolved.

## Source and limits

- [Original report and discussion](https://github.com/MacSiem/ha-baby-tracker/issues/1).
- [September 24 promise](https://github.com/MacSiem/ha-baby-tracker/issues/1#issuecomment-5805418259).
- [Reporter environment and decision to wait](https://github.com/MacSiem/ha-baby-tracker/issues/1#issuecomment-5911372301).
- The current public release at review time is v5.0.15. Repository and installed development versions are not evidence of a public release.
- The remaining draft is conditional. Do not post it until the stated release and verification conditions are true. It does not claim that Zen has already been verified.
