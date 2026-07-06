// Element × mode render-test harness (Schema architecture S2 — permanent).
//
// Stress-test finding 7: shared layers require shared tests — every
// MODE_RENDERERS entry ships a per-mode render test. This script bundles
// schema/elements/modeRenderers.tsx, renders every registered
// (element × mode) renderer against fixture values covering its states
// (loading / populated / empty), and serialises the output to
// scripts/__snapshots__/mode-renderers.v1.json — written on first run,
// compared byte-for-byte after. A registered renderer with no fixture case
// fails the run, so new elements/modes cannot ship untested.
//
// The serialiser walks preact VNodes directly, invoking function components
// (Skeleton, Fragment) inline — safe because element renderers are pure and
// hook-free by design (synchronous projections in, static markup out).
//
// Usage:  node scripts/mode-renderer-snapshot.mjs            (compare; exit 1 on drift)
//         node scripts/mode-renderer-snapshot.mjs --update   (rewrite baseline)

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require   = createRequire(import.meta.url);
const { build } = require('esbuild'); // vite's own esbuild — no new dependency

const root     = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile  = resolve(root, 'node_modules/.cache/cz-mode-renderer-bundle.mjs');
const snapFile = resolve(root, 'scripts/__snapshots__/mode-renderers.v1.json');

mkdirSync(dirname(outFile), { recursive: true });

await build({
  entryPoints: [resolve(root, 'resources/ts/components/admin/schema/elements/modeRenderers.tsx')],
  bundle: true,
  format: 'esm',
  outfile: outFile,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  alias: { '@': resolve(root, 'resources/ts') },
  logLevel: 'silent',
});

const { MODE_RENDERERS, resolveModeRenderer } = await import(pathToFileURL(outFile).href);

// ── Minimal VNode → HTML serialiser ──────────────────────────────────────────

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function renderNode(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return esc(node);
  if (Array.isArray(node)) return node.map(renderNode).join('');
  const { type, props } = node;
  if (typeof type === 'function') return renderNode(type(props)); // hook-free by design
  const attrs = Object.entries(props ?? {})
    .filter(([k, v]) => k !== 'children' && k !== 'key' && k !== 'ref' && v != null && v !== false)
    .map(([k, v]) => ` ${k}="${esc(v)}"`)
    .join('');
  return `<${type}${attrs}>${renderNode(props?.children)}</${type}>`;
}

// ── Fixture matrix ────────────────────────────────────────────────────────────
// Per (element, mode): every state a renderer branches on. Values follow the
// bound-value contracts in schema/elements/library.ts.

const LOADING = { loading: true };
const READY   = { loading: false };

const FIXTURES = {
  text: {
    details: [
      ['loading',  { value: 'Cloud Backup' },                       LOADING],
      ['value',    { value: 'Cloud Backup', fallback: 'New Service' }, READY],
      ['fallback', { value: '', fallback: 'New Service' },          READY],
    ],
  },
  term: {
    details: [
      ['loading',  { value: 'Storage' },      LOADING],
      ['value',    { value: 'Storage' },      READY],
      ['fallback', { value: 'Not selected' }, READY],
    ],
  },
  'rich-text': {
    details: [
      ['loading',     { value: 'Managed backup.', placeholder: '' }, LOADING],
      ['value',       { value: 'Managed backup.', placeholder: 'Enter a description for the service.' }, READY],
      ['placeholder', { value: '', placeholder: 'Enter a description for the Cloud Backup.' }, READY],
    ],
    // Relational read viewpoint (S3a): empty prose is a plain read-only
    // statement, never the owning workspace's muted action prompt.
    connections: [
      ['value', { value: 'Managed backup.', placeholder: 'ignored' }, READY],
      ['empty', { value: '', placeholder: 'ignored' },                READY],
    ],
  },
  'item-collection': {
    details: [
      ['loading', { items: [], empty: { title: 'No features', copy: 'Add features to this service.' } }, LOADING],
      ['items',   { items: [{ id: 'a', label: 'SSL' }, { id: 'b', label: 'Backups' }], empty: { title: 'No features', copy: '' } }, READY],
      ['empty',   { items: [], empty: { title: 'No features', copy: 'Add features to the Cloud Backup.' } }, READY],
    ],
  },
  'qa-collection': {
    details: [
      ['loading', { items: [], empty: { title: 'No questions added', copy: '' } }, LOADING],
      ['items',   { items: [
        { id: 'f1', question: 'How?', answer: 'Easily.' },
        { id: 'f2', question: '  ',   answer: '' },          // blank q/a fallback copy
      ], empty: { title: 'No questions added', copy: '' } }, READY],
      // Reference items (S3a, tier/promotion FAQ refs): no answer relation
      // (undefined) → no answer line at all — distinct from an owned '' gap.
      ['refs',    { items: [
        { id: 'p1', question: 'How?' },
      ], empty: { title: 'No questions added', copy: '' } }, READY],
      ['empty',   { items: [], empty: { title: 'No questions added', copy: 'Add common questions for the Cloud Backup.' } }, READY],
    ],
  },
  'relation-summary': {
    connections: [
      ['counts', { relations: [
        { count: 3, label: 'features' },
        { count: 2, label: 'common questions' },
      ] }, READY],
      ['zero',   { relations: [
        { count: 0, label: 'features' },
        { count: 0, label: 'common questions' },
      ] }, READY],
    ],
  },
  metrics: {
    summary: [
      ['configured',   { headline: '2 tiers configured', copy: 'Package Overview includes a full summary view of pricing and tiers.' }, READY],
      ['unconfigured', { headline: '0 tiers configured', copy: 'Pricing and tiers not available.' }, READY],
    ],
  },
  custom: {},   // escape hatch — no renderer until the first real consumer
};

// ── Coverage gate + snapshot ──────────────────────────────────────────────────

const failures = [];
const snapshot = {};

for (const [element, modes] of Object.entries(MODE_RENDERERS)) {
  for (const [mode, renderer] of Object.entries(modes)) {
    const cases = FIXTURES[element]?.[mode];
    if (!cases || cases.length === 0) {
      failures.push(`registered renderer (${element} × ${mode}) has no fixture case`);
      continue;
    }
    for (const [state, value, ctx] of cases) {
      snapshot[`${element}.${mode}.${state}`] = renderNode(renderer(value, ctx));
    }
  }
}

// Fallback Rule spot-checks: read viewpoints fall back to `details`;
// table/card/edit are opt-in only.
if (resolveModeRenderer('text', 'connections') !== MODE_RENDERERS.text.details)
  failures.push('Fallback Rule: (text × connections) must fall back to the details renderer');
if (resolveModeRenderer('text', 'summary') !== MODE_RENDERERS.text.details)
  failures.push('Fallback Rule: (text × summary) must fall back to the details renderer');
if (resolveModeRenderer('text', 'table') !== undefined)
  failures.push('Fallback Rule: (text × table) must be opt-in, not fallback');
if (resolveModeRenderer('rich-text', 'connections') !== MODE_RENDERERS['rich-text'].connections)
  failures.push('(rich-text × connections) must use its own renderer, not the details fallback');
if (resolveModeRenderer('relation-summary', 'details') !== undefined)
  failures.push('relation-summary is a connections-viewpoint element — no details renderer');
if (resolveModeRenderer('metrics', 'details') !== undefined)
  failures.push('metrics is a summary-viewpoint element — no details renderer');
if (resolveModeRenderer('custom', 'details') !== undefined)
  failures.push('custom must have no renderer until a real consumer registers one');

if (failures.length > 0) {
  console.error('Mode-renderer coverage FAILED:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

const serialized = JSON.stringify(snapshot, null, 2) + '\n';
const caseCount  = Object.keys(snapshot).length;

if (process.argv.includes('--update') || !existsSync(snapFile)) {
  mkdirSync(dirname(snapFile), { recursive: true });
  writeFileSync(snapFile, serialized);
  console.log(`Mode-renderer snapshot written: ${snapFile} (${caseCount} cases)`);
} else {
  const previous = readFileSync(snapFile, 'utf8');
  if (previous === serialized) {
    console.log(`Mode-renderer parity OK — ${caseCount} cases byte-identical.`);
  } else {
    console.error('Mode-renderer DRIFT DETECTED — element presentation changed. Diff the snapshot:');
    console.error(snapFile);
    process.exit(1);
  }
}
