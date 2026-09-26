#!/usr/bin/env node
// Grades every run under an iteration folder: node cowork/evals/grade.mjs <iteration-dir>
// A run is a folder holding outputs/index.html; results go to <run>/grading.json.
// Needs Playwright (PW env var or global install) and the impeccable launcher (IMPECCABLE_LAUNCHER).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const ITER = path.resolve(process.argv[2] ?? '');
const LAUNCHER = process.env.IMPECCABLE_LAUNCHER;
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW ?? 'playwright');

const THAI = /[฀-๿]/;
const THAI_FACES = /thai|anuphan|sarabun|kanit|prompt|mitr|chakra petch|bai jamjuree|k2d|krub|niramit|charm|taviraj|trirong|pridi|athiti|chonburi|pattaya|sriracha|itim|mali|thasadith|kodchasan|koho|fahkwang|srisakdi|maitree|line seed/i;
const FRAMEWORK = /unpkg\.com\/react|esm\.sh\/react|react(-dom)?(\.production)?(\.min)?\.js|cdn\.tailwindcss\.com|tailwindcss|from\s+['"]react['"]|next\/(font|image|link)/i;

const findRuns = dir => fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory()).flatMap(e => {
  const p = path.join(dir, e.name);
  return fs.existsSync(path.join(p, 'outputs', 'index.html')) ? [p] : findRuns(p);
});

function detector(file) {
  if (!LAUNCHER) return { ran: false };
  try {
    const out = execFileSync('sh', [LAUNCHER, 'detect', '--json', path.basename(file)], { cwd: path.dirname(file), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const all = JSON.parse(out.slice(out.indexOf('[')) || '[]');
    const counted = all.filter(f => ['error', 'warning'].includes(f.severity));
    return { ran: true, counted, advisory: all.length - counted.length };
  } catch (e) {
    return { ran: false, error: String(e.message).slice(0, 200) };
  }
}

async function inspect(browser, file) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + file, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  const dom = await page.evaluate(({ thaiSrc }) => {
    const thai = new RegExp(thaiSrc);
    const attrs = [...document.querySelectorAll('[alt],[title],[placeholder],[aria-label]')]
      .flatMap(el => ['alt', 'title', 'placeholder', 'aria-label'].map(a => el.getAttribute(a) || ''));
    const visible = document.body.innerText + '\n' + attrs.join('\n') + '\n' + document.title;
    // One sample per distinct text style that sets Thai.
    const styles = new Map();
    for (const el of document.querySelectorAll('body *')) {
      const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('');
      if (!thai.test(own) || !el.getClientRects().length) continue;
      const cs = getComputedStyle(el);
      const key = [cs.fontFamily, cs.fontSize, cs.fontWeight, cs.lineHeight, cs.letterSpacing].join('|');
      if (!styles.has(key)) styles.set(key, { tag: el.tagName.toLowerCase(), family: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight, lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing });
    }
    // Worst-case stacks measured inside each style's own line box.
    const worst = 'ที่ ปั้น กิ๊ก ญี่ปุ่น ผู้ใช้';
    const rows = [...styles.values()].map(s => {
      const d = document.createElement('div');
      Object.assign(d.style, { position: 'absolute', whiteSpace: 'nowrap', fontFamily: s.family, fontSize: s.size, fontWeight: s.weight, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing });
      d.innerHTML = '<span style="display:inline-block;width:0;height:0;vertical-align:baseline"></span>' + worst;
      document.body.appendChild(d);
      const box = d.getBoundingClientRect(), base = d.firstChild.getBoundingClientRect().top - box.top;
      const c = document.createElement('canvas').getContext('2d');
      c.font = `${s.weight} ${s.size} ${s.family}`;
      const m = c.measureText(worst);
      const lh = box.height;
      d.remove();
      return { ...s, ratio: +(lh / parseFloat(s.size)).toFixed(2), roomAbove: +(base - m.actualBoundingBoxAscent).toFixed(1), roomBelow: +(lh - base - m.actualBoundingBoxDescent).toFixed(1) };
    });
    const loadedFonts = [...document.fonts].filter(f => f.status === 'loaded').map(f => `${f.family} ${f.weight}`);
    return { visible, rows, loadedFonts };
  }, { thaiSrc: THAI.source });
  await page.close();
  return { ...dom, errors };
}

const browser = await chromium.launch();
for (const run of findRuns(ITER)) {
  const file = path.join(run, 'outputs', 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  const evalName = path.basename(path.dirname(run.includes(`${path.sep}run-`) ? path.dirname(run) : run));
  const dom = await inspect(browser, file);
  const det = detector(file);
  const moves = /@keyframes|animation\s*:|transition\s*:|\.animate\(/i.test(html);
  const x = [];
  const add = (text, passed, evidence) => x.push({ text, passed, evidence });

  add('Plain HTML, CSS and JS: no React, Next.js or Tailwind', !FRAMEWORK.test(html), FRAMEWORK.test(html) ? `matched ${html.match(FRAMEWORK)[0]}` : 'no framework references');
  add('Page loads without script errors', dom.errors.length === 0, dom.errors.length ? dom.errors.slice(0, 3).join(' | ') : 'no page errors');
  add('No em-dashes in visible text, titles or alt text', !dom.visible.includes('—'), dom.visible.includes('—') ? `${dom.visible.split('—').length - 1} em-dash(es)` : 'none found');
  add('Motion respects prefers-reduced-motion', !moves || /prefers-reduced-motion/.test(html), moves ? (/prefers-reduced-motion/.test(html) ? 'animates and has a reduced-motion query' : 'animates with no reduced-motion query') : 'no motion');
  if (det.ran) add("impeccable's detector reports no anti-patterns", det.counted.length === 0, det.counted.length ? det.counted.map(f => `${f.antipattern}: ${f.snippet ?? ''}`.trim()).join('; ') : `clean (${det.advisory} advisory)`);
  else add("impeccable's detector reports no anti-patterns", false, `detector did not run: ${det.error ?? 'no launcher'}`);

  if (/habit/.test(evalName)) {
    add('Saves data in localStorage', /localStorage/.test(html), /localStorage/.test(html) ? 'uses localStorage' : 'no localStorage');
  }
  if (/thai/.test(evalName)) {
    const rows = dom.rows;
    add('Page sets Thai text', rows.length > 0, `${rows.length} distinct Thai text styles`);
    const badFont = rows.filter(r => !THAI_FACES.test(r.family.split(',')[0]));
    add('Thai text uses a face with Thai coverage first in its stack', rows.length > 0 && badFont.length === 0, badFont.length ? badFont.map(r => `${r.tag}: ${r.family.split(',')[0]}`).join('; ') : `first faces: ${[...new Set(rows.map(r => r.family.split(',')[0]))].join(', ')}`);
    const neg = rows.filter(r => parseFloat(r.letterSpacing) < 0);
    add('No negative letter-spacing on Thai text', neg.length === 0, neg.length ? neg.map(r => `${r.tag} ${r.letterSpacing}`).join('; ') : 'none');
    const clipped = rows.filter(r => r.roomAbove < -0.5 || r.roomBelow < -0.5);
    add('Stacked Thai marks fit inside every line box', rows.length > 0 && clipped.length === 0, clipped.length ? clipped.map(r => `${r.tag} ${r.size}/${r.lineHeight} (ratio ${r.ratio}): ${r.roomAbove}px above, ${r.roomBelow}px below`).join('; ') : `min ratio ${Math.min(...rows.map(r => r.ratio))}; fonts loaded: ${dom.loadedFonts.join(', ') || 'none (fallback faces)'}`);
    add('Ships light and dark themes', /prefers-color-scheme/.test(html), /prefers-color-scheme/.test(html) ? 'has a prefers-color-scheme query' : 'single theme only');
  }

  const passed = x.filter(e => e.passed).length;
  const grading = { expectations: x, summary: { passed, failed: x.length - passed, total: x.length, pass_rate: +(passed / x.length).toFixed(2) } };
  const timing = path.join(run, 'timing.json');
  if (fs.existsSync(timing)) grading.timing = JSON.parse(fs.readFileSync(timing, 'utf8'));
  fs.writeFileSync(path.join(run, 'grading.json'), JSON.stringify(grading, null, 2));
  console.log(`${path.relative(ITER, run)}: ${passed}/${x.length}`);
  for (const e of x) console.log(`  ${e.passed ? 'PASS' : 'FAIL'}  ${e.text}  [${e.evidence}]`);
}
await browser.close();
