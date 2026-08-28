"""Regression checks for the HACS frontend review."""

from __future__ import annotations

import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CARD_PATH = ROOT / "custom_components/ha_baby_tracker/www/ha-baby-tracker.js"
INIT_PATH = ROOT / "custom_components/ha_baby_tracker/__init__.py"
BRAND_PATH = ROOT / "custom_components/ha_baby_tracker/brand"
AGENT_REPORT_PATH = ROOT / "codex-runs/baby-tracker-migration-report.md"


class ReviewRequirementTests(unittest.TestCase):
    def test_all_reviewed_runtime_values_are_escaped_at_html_sinks(self) -> None:
        source = CARD_PATH.read_text(encoding="utf-8")

        self.assertIn("String(s ?? '')", source)

        for expression in (
            "${_esc(title)}",
            "${_esc(f.time)}",
            "${_esc(d.time)}",
            "${_esc(s.date)}",
            "${_esc(g.date)}",
            "${_esc(g.type === 'headCirc' ? 'Head Circumference' : _titleCase(g.type))}",
            "${_esc(g.value)}",
            "${_esc(e.duration)}",
            "${_esc(e.amount)}",
            "${_esc(e.time)}",
            "${_esc(e.date)}",
        ):
            with self.subTest(expression=expression):
                self.assertIn(expression, source)

        self.assertIn("${_esc(this._generatedYaml || '')}", source)

    def test_frontend_stat_is_off_event_loop(self) -> None:
        source = INIT_PATH.read_text(encoding="utf-8")
        self.assertIn(
            "await hass.async_add_executor_job(os.path.isfile, card_path)", source
        )

    def test_floor_and_duplicate_assets_match_review(self) -> None:
        hacs = json.loads((ROOT / "hacs.json").read_text(encoding="utf-8"))
        self.assertEqual(hacs["homeassistant"], "2024.7.0")
        self.assertFalse((ROOT / "ha-baby-tracker.js").exists())
        self.assertFalse((BRAND_PATH / "logo.png").exists())
        self.assertFalse((BRAND_PATH / "logo@2x.png").exists())
        self.assertFalse(AGENT_REPORT_PATH.exists())

    def test_card_cannot_inject_into_other_custom_cards(self) -> None:
        source = CARD_PATH.read_text(encoding="utf-8")

        self.assertIn("const _esc = (s) => _escBase(_asText(s));", source)
        self.assertIn('data-source="own-card"', source)
        self.assertIn("buymeacoffee.com/macsiem", source)
        self.assertIn("this.shadowRoot.innerHTML = html + ownDonateFooter();", source)
        for marker in ("SPLIT_TAGS", "deepFindAll", "injectAll", "__haToolsSplitDonateInjector", "window._haToolsEsc"):
            with self.subTest(marker=marker):
                self.assertNotIn(marker, source)


if __name__ == "__main__":
    unittest.main()
