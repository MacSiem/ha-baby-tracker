// Embed the one canonical model inside the card closure; no runtime global/import.
const fs = require('node:fs');
const crypto = require('node:crypto');
const source = fs.readFileSync('shared/ha-baby-rhythm.js', 'utf8');
const hash = crypto.createHash('sha256').update(source).digest('hex');
const body = source.replace(/\nif \(typeof module[^\n]*\n?$/, '\n');
const block = `// BEGIN BABY RHYTHM V53 source-sha256=${hash}\n${body}// END BABY RHYTHM V53`;
const target = 'custom_components/ha_baby_tracker/www/ha-baby-tracker.js';
const current = fs.readFileSync(target, 'utf8');
const pattern = /\/\/ BEGIN BABY RHYTHM V53[^]*?\/\/ END BABY RHYTHM V53/;
const updated = pattern.test(current) ? current.replace(pattern, block)
 : current.replace('class HaBabyTracker extends HTMLElement {', `${block}\n\nclass HaBabyTracker extends HTMLElement {`);
if (process.argv.includes('--check')) {
 if (updated !== current) throw Error('Canonical Baby rhythm model needs embedding');
} else if (updated !== current) fs.writeFileSync(target, updated);
