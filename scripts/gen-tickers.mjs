/* Round-trip export of the news ticker headlines, the companion to gen-text.mjs.
   Generates ticker-headlines.txt from content.js: every headline gets a stable ID
   so the file can be hand-edited and synced back.
   Run: node scripts/gen-tickers.mjs   (writes ticker-headlines.txt)

   Sections follow scene order, so reordering scenes in content.js reorders this file. */
import fs from 'node:fs';

const window = {};
eval(fs.readFileSync('content.js', 'utf8'));
const D = window.WTSS;

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const BAR = '='.repeat(64);
const L = [];

const sections = [['home', 'HOME'], ...D.scenes.map((s, i) => [s.id, `SCENE ${ROMAN[i]}  —  ${s.title.toUpperCase()}`])]
  .filter(([key]) => Array.isArray(D.tickers[key]) && D.tickers[key].length);

const total = sections.reduce((n, [key]) => n + D.tickers[key].length, 0);

L.push(
  'WHEN THE SEA SLOWS  —  NEWS TICKER HEADLINES',
  `Generated from content.js.  ${total} headlines across ${sections.length} sections.`,
  '',
  'HOW TO EDIT',
  '  - Change the text after each ID (e.g. "DEPARTMENT-3: ...").',
  '  - Keep the ID prefixes unchanged; that is how edits map back.',
  '  - Add a headline by giving it the next free number in that section.',
  '  - Delete a headline by removing its whole line.',
  '  - Send the file back and content.js will be updated to match.',
  '',
);

sections.forEach(([key, title]) => {
  L.push('', BAR, `${title}   ·   ledger key: ${key}`, BAR);
  D.tickers[key].forEach((t, i) => L.push(`${key.toUpperCase()}-${i + 1}: ${t}`));
});

fs.writeFileSync('ticker-headlines.txt', L.join('\n') + '\n', 'utf8');
console.log(`Wrote ticker-headlines.txt — ${total} headlines across ${sections.length} sections.`);
