# Issue #1 — response drafts

These drafts require approval before posting. Neither draft has been sent.
The reporter uses Zen with Home Assistant 2026.9.4 and is waiting for a release.
Do not request a candidate retest before a supported public artifact exists.

## Before release

Hi @webmediart-github, yes, the update is still being prepared; version 5.0.19 has not been released yet.

I also need to correct my September 24 reply: registering a Lovelace module does not guarantee that an already-open Home Assistant tab will load it without a page reload. The current candidate registers the resource automatically, but a tab that was open before the first Baby Tracker child was added can still need one reload. You should not need to add a resource URL manually.

I am keeping this issue open while the installation and first-run checks are completed. Thank you for waiting; I will provide the released version and the verified installation steps before asking you to try again.

## After version 5.0.19 is publicly available and its installation is verified

Hi @webmediart-github, version 5.0.19 is now available. Please update Baby Tracker through HACS, restart Home Assistant, and check that Baby Tracker has been added under Settings → Devices & services. If you have not added it yet, add your first child there. Then reload the Home Assistant page once and open the card with `type: custom:ha-baby-tracker`. No manual Lovelace resource URL is needed.

I also need to correct my September 24 reply: the resource is registered automatically, but a tab that was open before the first child was added can still need a reload. I should not have promised that this step would disappear.

When you have a chance, could you confirm whether the card opens in Zen on your Home Assistant installation? If it still shows “Custom element not found”, please send the exact error and any console messages mentioning `ha-baby-tracker`, without personal child data. I will keep this issue open until your original error is confirmed resolved.

## Source and limits

- [Original report and discussion](https://github.com/MacSiem/ha-baby-tracker/issues/1).
- [September 24 promise](https://github.com/MacSiem/ha-baby-tracker/issues/1#issuecomment-5805418259).
- [Reporter environment and decision to wait](https://github.com/MacSiem/ha-baby-tracker/issues/1#issuecomment-5911372301).
- The current public release at review time is v5.0.15. Repository and installed development versions are not evidence of a public release.
- The second draft is conditional. Do not post it until the stated release and verification conditions are true. It does not claim that Zen has already been verified.
