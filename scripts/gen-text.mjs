/* Round-trip editorial-text export, mirroring ticker-headlines.txt.
   Generates site-text.txt from content.js: every editable prose element gets a
   stable ID so the file can be hand-edited and synced back into content.js.
   Run: node scripts/gen-text.mjs   (writes site-text.txt)

   Scope: intro, all scene bodies (+ tech notes, italics; graphics as locked
   markers), both endings, the three annexes, the memo, the complex-systems note.
   Out of scope (edited directly): footnotes, resources straplines, tickers
   (their own file), the ledger, and UI strings that live in index.html. */
import fs from 'node:fs';

const window = {};
eval(fs.readFileSync('content.js', 'utf8'));
const D = window.WTSS;

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII'];
const BAR = '='.repeat(64);
const L = [];
const head = (title, key) => { L.push('', BAR, key ? `${title}   ·   key: ${key}` : title, BAR); };
const emU = s => typeof s === 'string' ? s.replace(/<em>(.*?)<\/em>/g, '_$1_') : s;
const line = (id, text) => L.push(text === undefined ? id : `${id}: ${emU(text)}`);

L.push(
  'WHEN THE SEA SLOWS  —  EDITORIAL TEXT',
  'Generated from content.js. Edit the text after each ID, keep the IDs, send it back to sync.',
  '',
  'HOW TO EDIT',
  '  - Change the text after the colon. Keep every ID and |tag| exactly as-is.',
  '  - [bracketed] words in the prose are footnote markers — leave them in place.',
  '  - Wrap a word in _underscores_ to italicise it (e.g. _absolutely_).',
  '  - Delete an element by removing its whole line (and its .N sub-lines).',
  '  - Add one by giving it the next free number in that section.',
  '',
  'TAG LEGEND',
  '  KEY-N:            a normal paragraph',
  '  KEY-N |italic|:   an italic/pull line',
  '  KEY-N |heading|:  a sub-heading',
  '  KEY-N |quote|:    a block quote',
  '  KEY-N |tech|:     a Technical-detail note title; its paragraphs follow as KEY-N.1, KEY-N.2 …',
  '  KEY-N |graphic|:  a locked graphic block (tabloid/memo/etc.) — nothing to edit, do not remove',
  '  KEY-N |divider|:  a scene section break (* * *) — locked, do not remove',
  '  KEY |dateline|:   a scene dateline, e.g. November 2029 — editable',
  '  KEY-N |figure|:   a figure image — edit the caption after the colon; the image file itself is fixed',
  '  KEY |title| / |label| / |intro| / |section| / |name| / |bio|:  single fields',
);

/* ---- scene body ---- */
function emitScene(i) {
  const sc = D.scenes[i];
  const K = sc.id.toUpperCase();
  head(`SCENE ${ROMAN[i]}  —  ${sc.title.toUpperCase()}`, sc.id);
  line(`${K} |title|`, sc.title);
  if (sc.dateline) line(`${K} |dateline|`, sc.dateline);
  sc.body.forEach((el, j) => {
    const id = `${K}-${j + 1}`;
    if (typeof el === 'string') line(id, el);
    else if (el.italic) line(`${id} |italic|`, el.italic);
    else if (el.technote) {
      line(`${id} |tech|`, el.technote.title);
      el.technote.body.forEach((p, k) => line(`${id}.${k + 1}`, p));
    }
    else if (el.divider) line(`${id} |divider|`, 'divider');
    else if (el.protest) line(`${id} |graphic|`, 'protest');
    else if (el.tabloid) line(`${id} |graphic|`, 'tabloid');
    else if (el.memo) line(`${id} |graphic|`, 'memo');
    else if (el.paper) line(`${id} |graphic|`, 'paper');
    else if (el.invite) line(`${id} |graphic|`, 'invite');
    else if (el.leaflets) line(`${id} |graphic|`, 'leaflets');
    else line(`${id} |graphic|`, 'unknown');
  });
  if (sc.tech) {
    const techs = Array.isArray(sc.tech) ? sc.tech : [sc.tech];
    techs.forEach((t, ti) => {
      if (!t || !t.body || !t.body.length) return;
      const tid = `${K}-TECH${techs.length > 1 ? (ti + 1) : ''}`;
      line(`${tid} |tech|`, t.title);
      t.body.forEach((p, k) => line(`${tid}.${k + 1}`, p));
    });
  }
}

/* ---- intro ---- */
head('INTRODUCTION  —  TOP');
D.introTop.forEach((p, i) => line(`INTRO-TOP-${i + 1}`, p));
head('INTRODUCTION  —  BELOW');
D.introBelow.forEach((p, i) => line(`INTRO-BELOW-${i + 1}`, p));

/* ---- scenes ---- */
D.scenes.forEach((_, i) => emitScene(i));

/* ---- endings ---- */
[['good', 'THE BETTER OUTCOME'], ['bad', 'THE WORSE OUTCOME']].forEach(([which, name]) => {
  const E = D.endings[which], K = 'ENDING-' + which.toUpperCase();
  head(`ENDING  —  ${name}`, which);
  line(`${K} |label|`, E.label);
  E.body.forEach((el, j) => {
    const id = `${K}-${j + 1}`;
    if (typeof el === 'string') line(id, el);
    else if (el.italicLead !== undefined) { line(`${id} |lead-italic|`, el.italicLead); line(`${id} |lead-rest|`, el.rest); }
    else line(id, JSON.stringify(el));
  });
});

/* ---- annexes ---- */
head('ANNEX I  —  WHY THIS EXISTS');
D.whyWeWrote.forEach((el, j) => {
  const id = `WHY-${j + 1}`;
  if (typeof el === 'string') line(id, el);
  else if (el.bullets) { line(`${id} |bullets|`); el.bullets.forEach((b, k) => line(`${id}.${k + 1}`, b)); }
});
head('ANNEX II  —  AMOC BRIEFING NOTE');
D.amoc101.forEach((el, j) => {
  const id = `AMOC-${j + 1}`;
  if (typeof el === 'string') line(id, el);
  else if (el.h) line(`${id} |heading|`, el.h);
  else if (el.figure) line(`${id} |figure|`, el.figure.caption);
});
head('ANNEX III  —  RESEARCH TEAM');
line('TEAM |intro|', D.teamIntro);
D.team.forEach((m, j) => { line(`TEAM-${j + 1} |name|`, m.name); line(`TEAM-${j + 1} |bio|`, m.bio); });

/* ---- memo ---- */
head('THE MEMO');
line('MEMO |title|', D.memo.title);
line('MEMO |section|', D.memo.section);
D.memo.paras.forEach((p, i) => line(`MEMO-${i + 1}`, p));

/* ---- complex systems ---- */
head('COMPLEX SYSTEMS NOTE');
D.complexSystems.forEach((el, j) => {
  const id = `CS-${j + 1}`;
  if (typeof el === 'string') line(id, el);
  else if (el.quote) line(`${id} |quote|`, el.quote);
});

/* ---- resources: what you can do ---- */
if (D.resources && D.resources.whatYouCanDo) {
  head('RESOURCES  —  WHAT YOU CAN DO', 'what-you-can-do');
  D.resources.whatYouCanDo.forEach((el, j) => {
    const id = `WYCD-${j + 1}`;
    if (typeof el === 'string') line(id, el);
    else if (el.h) line(`${id} |heading|`, el.h);
  });
}

fs.writeFileSync('site-text.txt', L.join('\n') + '\n', 'utf8');
const ids = L.filter(x => /^[A-Z]/.test(x) && x.includes(':')).length;
console.log(`Wrote site-text.txt — ${ids} editable lines.`);
