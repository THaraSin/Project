#!/usr/bin/env node
// Builds the impeccable-taste skill for Cowork and claude.ai from the project's
// installed impeccable and taste skills plus the overlays in cowork/overlay.
// Usage: node cowork/build.mjs   ->   cowork/dist/impeccable-taste.zip (+ .skill)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const NAME = 'impeccable-taste';
const SRC = {
  impeccable: path.join(ROOT, '.claude/skills/impeccable'),
  taste: path.join(ROOT, '.claude/skills/design-taste-frontend/SKILL.md'),
  agents: path.join(ROOT, '.claude/agents'),
  licenses: path.join(HERE, 'licenses'),
};
const OVERLAY = path.join(HERE, 'overlay');
const DIST = path.join(HERE, 'dist');
const OUT = path.join(DIST, NAME);

const read = p => fs.readFileSync(p, 'utf8');
const overlay = f => read(path.join(OVERLAY, f));
const fail = msg => { console.error(`build: ${msg}`); process.exit(1); };

function splitFrontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!m) fail('missing frontmatter');
  return { fm: m[1], body: text.slice(m[0].length) };
}

// Inserts a block before a heading that must occur exactly once, on its own line.
function insertBefore(text, heading, block) {
  const needle = `\n${heading}\n`;
  const at = text.indexOf(needle);
  if (at < 0 || text.indexOf(needle, at + 1) >= 0) fail(`heading not found exactly once: ${heading}`);
  return `${text.slice(0, at + 1)}${block.trimEnd()}\n\n${text.slice(at + 1)}`;
}

for (const p of Object.values(SRC)) if (!fs.existsSync(p)) fail(`missing source: ${path.relative(ROOT, p)}`);

// 1. Fresh output with impeccable's files, minus the platform-specific engine binary
//    (the launcher downloads and checksum-verifies it on first use).
fs.rmSync(OUT, { recursive: true, force: true });
for (const ext of ['zip', 'skill']) fs.rmSync(path.join(DIST, `${NAME}.${ext}`), { force: true });
const binDir = path.join(SRC.impeccable, 'scripts', 'bin');
fs.cpSync(SRC.impeccable, OUT, { recursive: true, filter: src => src !== binDir && !src.startsWith(binDir + path.sep) });

// 2. SKILL.md: new frontmatter, a change notice, and the two added sections.
const upstream = splitFrontmatter(read(path.join(SRC.impeccable, 'SKILL.md')));
const version = /^version:\s*(\S+)/m.exec(upstream.fm)?.[1] ?? 'unknown';
let body = insertBefore(upstream.body, '## How to design', overlay('packaged.md'));
body = insertBefore(body, '## Commands', overlay('taste-layer.md'));
const frontmatter = overlay('frontmatter.yml').replaceAll('{{IMPECCABLE_VERSION}}', version).trim();
const notice = `<!-- Modified from impeccable ${version} SKILL.md: frontmatter replaced, "Packaged edition" and "Taste layer" sections added. See LICENSES.md. -->`;
fs.writeFileSync(path.join(OUT, 'SKILL.md'), `---\n${frontmatter}\n---\n\n${notice}\n${body}`);

// 3. reference/taste.md: the upstream taste body under a header whose contents
//    list gives the line number of every section heading in the final file.
const tasteLines = splitFrontmatter(read(SRC.taste)).body.split('\n');
const appendixAt = tasteLines.findIndex(l => l.startsWith('# APPENDICES'));
const headings = tasteLines
  .map((line, i) => ({ line, i }))
  .filter(({ line, i }) => /^#{2,3} /.test(line) && (appendixAt < 0 || i < appendixAt));
if (appendixAt >= 0) headings.push({ line: tasteLines[appendixAt], i: appendixAt });
const header = overlay('taste-header.md').trimEnd().split('\n');
const tocAt = header.indexOf('{{TOC}}');
if (tocAt < 0) fail('taste-header.md needs a {{TOC}} line');
// Final file = header (placeholder replaced by the list) + blank line + body,
// so body line i (0-based) lands on line header.length + headings.length + i + 1.
const offset = header.length + headings.length;
const toc = headings.map(({ line, i }) => `${String(offset + i + 1).padStart(5)}  ${line}`);
const tasteMd = [...header.slice(0, tocAt), ...toc, ...header.slice(tocAt + 1), '', ...tasteLines].join('\n');
fs.writeFileSync(path.join(OUT, 'reference', 'taste.md'), tasteMd);
const written = tasteMd.split('\n');
for (const { line, i } of headings) {
  if (written[offset + i] !== line) fail(`contents list points at the wrong line for: ${line}`);
}

// 4. Helper agent definitions, which the Packaged edition section points to.
const agents = fs.readdirSync(SRC.agents).filter(f => /^impeccable-.+\.md$/.test(f));
if (agents.length !== 4) fail(`expected 4 impeccable agents, found ${agents.length}`);
fs.mkdirSync(path.join(OUT, 'agents'));
for (const f of agents) fs.copyFileSync(path.join(SRC.agents, f), path.join(OUT, 'agents', f));

// 5. Licenses.
fs.cpSync(SRC.licenses, path.join(OUT, 'LICENSES'), { recursive: true });
fs.copyFileSync(path.join(OVERLAY, 'LICENSES.md'), path.join(OUT, 'LICENSES.md'));

// 6. The checks claude.ai's uploader applies: one SKILL.md, known frontmatter keys,
//    a kebab-case name matching the folder, a quoted description under 1024 chars.
const walk = dir => fs.readdirSync(dir, { withFileTypes: true })
  .flatMap(e => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const files = walk(OUT);
const skillMds = files.filter(f => path.basename(f) === 'SKILL.md');
if (skillMds.length !== 1) fail(`expected one SKILL.md, found ${skillMds.length}`);
const keys = [...frontmatter.matchAll(/^([A-Za-z][\w-]*):/gm)].map(m => m[1]);
const allowed = new Set(['name', 'description', 'license', 'allowed-tools', 'metadata', 'compatibility']);
const unknown = keys.filter(k => !allowed.has(k));
if (unknown.length) fail(`frontmatter keys not accepted on upload: ${unknown.join(', ')}`);
const name = /^name:\s*(\S+)$/m.exec(frontmatter)?.[1];
if (name !== NAME || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) fail(`bad name: ${name}`);
const description = /^description:\s*"(.*)"$/m.exec(frontmatter)?.[1];
if (!description) fail('description must be one double-quoted line');
if (description.length > 1024) fail(`description is ${description.length} chars; the limit is 1024`);
if (/[<>]/.test(description)) fail('description cannot contain angle brackets');
const launcher = path.join(OUT, 'scripts', 'impeccable');
fs.chmodSync(launcher, 0o755);

// 7. Zip with the skill folder as the archive root; zip keeps the launcher's exec bit.
execFileSync('zip', ['-qrX', `${NAME}.zip`, NAME], { cwd: DIST });
fs.copyFileSync(path.join(DIST, `${NAME}.zip`), path.join(DIST, `${NAME}.skill`));
const kb = f => Math.round(fs.statSync(path.join(DIST, f)).size / 1024);
console.log(`built ${NAME} from impeccable ${version}: ${files.length} files, ${kb(`${NAME}.zip`)} KB zipped`);
console.log(`description ${description.length}/1024 chars; taste.md contents list: ${headings.length} headings verified`);
