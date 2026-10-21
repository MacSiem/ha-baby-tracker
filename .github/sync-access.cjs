// Embed the one canonical model inside the card closure; no runtime global/import.
const fs = require('node:fs');
const crypto = require('node:crypto');
for (const file of ['ha-tools-tariff-guard','ha-tools-feature-access','ha-tools-format','ha-baby-diary']) {
const source = fs.readFileSync('shared/'+file+'.js', 'utf8');
const hash = crypto.createHash('sha256').update(source).digest('hex');
const body = source.replace(/\nif \(typeof module[^\n]*\n?$/, '\n');
const block = `// BEGIN BABY ACCESS ${file} source-sha256=${hash}\n${body}// END BABY ACCESS ${file}`;
const target = 'custom_components/ha_baby_tracker/www/ha-baby-tracker.js';
const current = fs.readFileSync(target, 'utf8');
const pattern = new RegExp('// BEGIN BABY ACCESS '+file+'[^]*?// END BABY ACCESS '+file);
const updated = pattern.test(current) ? current.replace(pattern, block)
 : current.replace('class HaBabyTracker extends HTMLElement {', `${block}\n\nclass HaBabyTracker extends HTMLElement {`);
if (process.argv.includes('--check')) {
 if (updated !== current) throw Error('Canonical Baby access sources need embedding');
} else if (updated !== current) fs.writeFileSync(target, updated);

}
