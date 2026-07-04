#!/usr/bin/env node
/*
 * Builds index.json (the gallery manifest) from art/<slug>/piece.json folders.
 * No dependencies; runs on any Node >= 16.
 *
 *   node scripts/build-index.js          regenerate index.json (CI on merge)
 *   node scripts/build-index.js --check  validate submissions only, no write
 *                                        (CI on pull requests)
 *
 * The `ref` field records the commit the assets belong to, so the website can
 * fetch them from a CDN pinned to that exact commit.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const ART = path.join(ROOT, 'art');
const OUT = path.join(ROOT, 'index.json');
const LICENSES = ['CC0-1.0', 'CC-BY-4.0', 'CC-BY-SA-4.0'];
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SOURCE_EXT = /\.(kicad_mod|svg)$/i;
const FILE_EXT = /\.(kicad_mod|svg|dxf|gbr|png)$/i;
const MAX_FILE_BYTES = 1024 * 1024;

const checkOnly = process.argv.includes('--check');
const errors = [];

function fail(slug, msg) { errors.push('art/' + slug + ': ' + msg); }

function gitAddedDate(relDir) {
  try {
    const out = execSync(
      'git log --diff-filter=A --follow --format=%as -- ' + JSON.stringify(relDir),
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const lines = out.split('\n').filter(Boolean);
    return lines.length ? lines[lines.length - 1] : null;
  } catch (e) { return null; }
}

function headRef() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync('git rev-parse HEAD',
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch (e) { return 'main'; }
}

const dirs = fs.readdirSync(ART, { withFileTypes: true })
  .filter(function (e) { return e.isDirectory() && !e.name.startsWith('_'); })
  .map(function (e) { return e.name; })
  .sort();

const pieces = [];
for (const slug of dirs) {
  if (!SLUG.test(slug)) { fail(slug, 'folder name must be a slug: lowercase letters, digits, dashes'); continue; }
  const dir = path.join(ART, slug);
  const metaPath = path.join(dir, 'piece.json');
  if (!fs.existsSync(metaPath)) { fail(slug, 'missing piece.json'); continue; }

  let meta;
  try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')); }
  catch (e) { fail(slug, 'piece.json is not valid JSON: ' + e.message); continue; }

  if (typeof meta.title !== 'string' || !meta.title.trim()) fail(slug, 'piece.json needs a non-empty "title"');
  if (typeof meta.author !== 'string' || !meta.author.trim()) fail(slug, 'piece.json needs a non-empty "author"');
  if (LICENSES.indexOf(meta.license) === -1) fail(slug, '"license" must be one of: ' + LICENSES.join(', '));
  if (meta.tags != null && !Array.isArray(meta.tags)) fail(slug, '"tags" must be an array');
  if (meta.description != null && typeof meta.description !== 'string') fail(slug, '"description" must be a string');

  const entries = fs.readdirSync(dir).filter(function (f) { return f !== 'piece.json'; });
  const preview = ['preview.svg', 'preview.png', 'preview.jpg'].find(function (f) {
    return entries.indexOf(f) !== -1;
  });
  if (!preview) fail(slug, 'needs a preview image (preview.svg / preview.png / preview.jpg)');

  const files = entries.filter(function (f) { return f !== preview; }).sort();
  const stray = files.filter(function (f) { return !FILE_EXT.test(f); });
  if (stray.length) fail(slug, 'unexpected file(s): ' + stray.join(', ') + ' (allowed: kicad_mod, svg, dxf, gbr, png)');
  if (!files.some(function (f) { return SOURCE_EXT.test(f); })) {
    fail(slug, 'needs at least one source file (.kicad_mod or .svg) besides the preview');
  }
  for (const f of entries) {
    if (fs.statSync(path.join(dir, f)).size > MAX_FILE_BYTES) fail(slug, f + ' is over 1 MB');
  }

  let added = meta.added;
  if (added != null && !/^\d{4}-\d{2}-\d{2}$/.test(added)) fail(slug, '"added" must be YYYY-MM-DD');
  if (!added) added = gitAddedDate('art/' + slug) || new Date().toISOString().slice(0, 10);

  pieces.push({
    id: slug,
    title: String(meta.title).trim(),
    author: String(meta.author).trim(),
    license: meta.license,
    description: meta.description ? String(meta.description).trim() : undefined,
    tags: Array.isArray(meta.tags) ? meta.tags.map(String) : [],
    preview: 'art/' + slug + '/' + preview,
    files: files.map(function (f) { return 'art/' + slug + '/' + f; }),
    added: added
  });
}

if (errors.length) {
  console.error('validation failed:\n  ' + errors.join('\n  '));
  process.exit(1);
}

pieces.sort(function (a, b) {
  return a.added < b.added ? 1 : a.added > b.added ? -1 : a.id.localeCompare(b.id);
});

if (checkOnly) {
  console.log('ok — ' + pieces.length + ' piece(s) valid');
  process.exit(0);
}

const index = { ref: headRef(), pieces: pieces };
const json = JSON.stringify(index, null, 2) + '\n';
if (fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === json) {
  console.log('index.json unchanged (' + pieces.length + ' piece(s))');
} else {
  fs.writeFileSync(OUT, json);
  console.log('wrote index.json (' + pieces.length + ' piece(s))');
}
