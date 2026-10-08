const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require(require.resolve('jsdom', { paths: [process.cwd()] }));

test('title editing retains focus and selection when HA returns the edited config', () => {
  const dom = new JSDOM('', { runScripts: 'dangerously' });
  try {
    dom.window.eval(readFileSync(join(process.cwd(), 'custom_components/ha_baby_tracker/www/ha-baby-tracker.js'), 'utf8'));
    const editor = dom.window.document.createElement('ha-baby-tracker-editor');
    const original = { type: 'custom:ha-baby-tracker', title: 'Before', show_support: false, babies: [{ name: 'Demo' }] };
    editor.setConfig(original);
    dom.window.document.body.append(editor);
    const events = [];
    editor.addEventListener('config-changed', event => events.push(event));
    const input = editor.shadowRoot.querySelector('#cf_title');
    input.value = '<title> & "quoted"';
    input.focus();
    input.setSelectionRange(2, 5);
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    editor.setConfig(events[0].detail.config);
    assert.equal(editor.shadowRoot.querySelector('#cf_title'), input, 'HA preview must keep the editing input');
    assert.equal(editor.shadowRoot.activeElement, input);
    assert.equal(input.selectionStart, 2);
    assert.equal(input.selectionEnd, 5);
    assert.equal(events[0].detail.config.title, '<title> & "quoted"');
    assert.equal(events[0].detail.config.show_support, false);
    assert.equal(events[0].detail.config.babies[0].name, 'Demo');
    assert.equal(events[0].bubbles, true);
    assert.equal(events[0].composed, true);
    assert.equal(original.title, 'Before');
    editor.setConfig({ ...original, title: 'From HA' });
    assert.equal(editor.shadowRoot.querySelector('#cf_title').value, 'From HA');
    assert.equal(editor.shadowRoot.querySelectorAll('img,script').length, 0);
  } finally {
    dom.window.close();
  }
});
