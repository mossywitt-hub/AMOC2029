/* Pre-deploy sanity check for the static site.
   Catches the failure modes that would silently break the live page:
   a content.js that no longer parses, a broken inline <script> in index.html,
   or a [footnote-key] marker with no matching entry.
   Run locally with `node scripts/validate.mjs`; also runs in CI on every push. */
import fs from 'node:fs';

let failed = 0;
const ok = (m) => console.log('✓ ' + m);
const bad = (m) => { console.error('✗ ' + m); failed = 1; };

/* 1) content.js parses and defines window.WTSS */
let D;
try {
  const src = fs.readFileSync('content.js', 'utf8');
  const window = {};
  eval(src);
  D = window.WTSS;
  if (!D) throw new Error('window.WTSS is undefined after evaluating content.js');
  ok('content.js parses and defines window.WTSS');
} catch (e) {
  bad('content.js failed to parse: ' + e.message);
  process.exit(1); // nothing else is checkable without D
}

/* 2) expected top-level shape */
for (const k of ['introTop', 'introBelow', 'footnotes', 'scenes', 'tickers', 'memo', 'endings']) {
  if (D[k] == null) bad('content.js missing top-level key: ' + k);
}
if (Array.isArray(D.scenes) && D.scenes.length) ok('scenes present: ' + D.scenes.length);
else bad('scenes missing or empty');

/* 3) every inline <script> block in index.html parses */
try {
  const html = fs.readFileSync('index.html', 'utf8');
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  blocks.forEach((b) => { new Function(b); });
  ok('index.html: ' + blocks.length + ' inline script block(s) parse');
} catch (e) {
  bad('index.html inline script failed to parse: ' + e.message);
}

/* 4) every [footnote-key] marker resolves to a footnotes entry
      (mirrors buildFnOrder()'s traversal so it never false-positives on
      bracketed text in tickers/memo/endings, which are not run through fnify) */
const keys = new Set(Object.keys(D.footnotes || {}));
const used = new Set();
const scan = (t) => {
  if (typeof t !== 'string') return;
  for (const m of t.matchAll(/\[([a-z][a-z0-9-]*)\]/g)) used.add(m[1]);
};
(D.introTop || []).forEach(scan);
(D.introBelow || []).forEach(scan);
(D.whyWeWrote || []).forEach((w) => { if (typeof w === 'string') scan(w); else if (w && w.bullets) w.bullets.forEach(scan); });
(D.amoc101 || []).forEach((a) => { if (typeof a === 'string') scan(a); });
(D.scenes || []).forEach((sc) => {
  (sc.body || []).forEach((it) => {
    if (typeof it === 'string') scan(it);
    else if (it && it.italic) scan(it.italic);
    else if (it && it.technote && it.technote.body) it.technote.body.forEach(scan);
  });
  if (sc.tech) (Array.isArray(sc.tech) ? sc.tech : [sc.tech]).forEach((t) => { if (t && t.body) t.body.forEach(scan); });
});
const dangling = [...used].filter((k) => !keys.has(k));
if (dangling.length) bad('footnote markers with no entry: ' + dangling.join(', '));
else ok('footnote markers all resolve (' + used.size + ' in use, ' + keys.size + ' defined)');

console.log(failed ? '\nVALIDATION FAILED' : '\nAll checks passed');
process.exit(failed);
