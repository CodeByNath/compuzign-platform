// Service open-and-save race mounted regression.
//
// Reproduces the still-reported defect on an ORDINARY existing Service (not a
// brand-new one): Service Overview's Save button "misfires" and loses its
// notification, and a Save on Inclusions right after opening the drawer
// appears not to take. Root cause: useServiceStation's saveOverview /
// saveInclusions / saveFaqs patch `adminDetail` via
// `prev => prev ? patch(prev) : prev` — a silent no-op while `adminDetail` is
// still null, which is exactly the window between the drawer mounting an
// existing Service and its `fetchAdminServiceDetail` GET resolving. The
// create-hand-off fix (see service-create-handoff-regression.mjs) only closed
// this window for a just-created record via createService()'s own eager
// seed; an ordinary existing-Service open had no such seed, so a fast Save
// (or a slow network) during that GET's flight silently dropped the save.
//
// This harness deliberately holds that mount-time GET open (never resolves it
// until told to) so both saves below execute DURING that window — the exact
// race an admin who edits and saves quickly after opening the drawer hits in
// production. The fix seeds `adminDetail` synchronously from the passed-in
// ServiceItem AND marks the mount fetch's eventual response stale once a save
// has landed, so neither the save nor the notification it drives is ever
// silently dropped or later reverted by the slow-resolving fetch.
//
// Same harness technique as scripts/service-create-handoff-regression.mjs:
// mounts the REAL ServiceDrawerHost composition (esbuild + happy-dom + Preact
// render); only fetch is faked.
//
// Usage: npm run regression:service-open-save-race
//    or: node scripts/service-open-save-race-regression.mjs

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-service-open-save-race-bundle.mjs');
mkdirSync(dirname(outFile), { recursive: true });

// ── DOM shim ─────────────────────────────────────────────────────────────
const window = new Window({ url: 'https://cz-test.local/' });
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.MouseEvent = window.MouseEvent;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Node = window.Node;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

window.CompuZignConfig = { apiRoot: 'https://cz-test.local/wp-json/', nonce: 'test-nonce' };

// ── Fetch mock — the only faked boundary ────────────────────────────────
const SERVICE_ID = 801;
const PLATFORM_ID = 'CZS8WQ5K';
const CATEGORY = { id: 1, name: 'Test Category', slug: 'test-category', description: '' };

// Server-side truth — an already-published, fully settled Service (the
// ordinary "open an existing record" case, not a creation hand-off).
const server = {
  title: 'Existing Published Service',
  excerpt: 'A settled excerpt.',
  content: 'A settled description.',
  categories: [CATEGORY],
  inclusions: [{ id: 'daily-backups', label: 'Daily backups' }],
  faqs: [{ id: 'how-often', question: 'How often?', answer: 'Daily.' }],
  moduleStatus: { overview: 'settled', inclusions: 'settled', faqs: 'settled' },
};

let detailFetchCalls = 0;
let detailFetchStarted = false;

// The drawer's OWN detail GET (fired on mount by useServiceStation's effect)
// is held open — simulating a real network round-trip that has not yet
// returned by the time the admin performs a Save. Server-side state is
// always consistent by the time this resolves; only the CLIENT's ordering
// is delayed.
let releaseDetailFetch = () => {};
const detailFetchGate = new Promise((res) => { releaseDetailFetch = res; });

function jsonResponse(body) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

globalThis.fetch = (url, init = {}) => {
  const path = String(url);
  const method = (init?.method ?? 'GET').toUpperCase();

  if (path.endsWith('/admin/services') && method === 'GET') {
    return jsonResponse({
      categories: [CATEGORY],
      stations: [{
        id: SERVICE_ID,
        platform_id: PLATFORM_ID,
        title: server.title,
        slug: 'existing-published-service',
        platform_status: 'active',
        previous_platform_status: '',
        module_status: server.moduleStatus,
        categories: server.categories,
        has_drafts: false,
        inclusion_count: server.inclusions.length,
        faq_count: server.faqs.length,
      }],
    });
  }
  if (path.endsWith('/admin/surface-packages') && method === 'GET') {
    return jsonResponse({ success: true, total: 0, packages: [] });
  }
  if (path.includes(`/admin/services/${SERVICE_ID}/overview`) && method === 'POST') {
    const payload = JSON.parse(init.body);
    server.title = payload.title;
    server.excerpt = payload.excerpt ?? '';
    server.content = payload.content ?? '';
    server.moduleStatus = { ...server.moduleStatus, overview: 'pending' };
    return jsonResponse({
      success: true,
      draft: { title: payload.title, excerpt: payload.excerpt ?? '', content: payload.content ?? '', category_ids: payload.category_ids ?? [] },
      module_status: server.moduleStatus,
    });
  }
  if (path.includes(`/admin/services/${SERVICE_ID}/inclusions`) && method === 'POST') {
    const payload = JSON.parse(init.body);
    server.inclusions = payload.inclusions ?? [];
    server.moduleStatus = { ...server.moduleStatus, inclusions: 'pending' };
    return jsonResponse({ success: true, inclusions: server.inclusions, module_status: server.moduleStatus });
  }
  if (path.endsWith(`/admin/services/${SERVICE_ID}`) && method === 'GET') {
    detailFetchStarted = true;
    return detailFetchGate.then(() => {
      detailFetchCalls += 1;
      return {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          id: SERVICE_ID,
          platform_id: PLATFORM_ID,
          title: server.title,
          excerpt: server.excerpt,
          content: server.content,
          categories: server.categories,
          inclusions: server.inclusions,
          faqs: server.faqs,
          platform_status: 'active',
          previous_platform_status: '',
          module_status: server.moduleStatus,
          drafts: { overview: null, inclusions: null, faqs: null },
        }),
        text: () => Promise.resolve(''),
      };
    });
  }
  return Promise.reject(new Error(`Unexpected fetch in regression harness: ${method} ${path}`));
};

// ── Bundle the REAL composition ─────────────────────────────────────────
await build({
  entryPoints: [resolve(root, 'resources/ts/service-station/surface/ServiceDrawerHost.tsx')],
  bundle: true,
  format: 'esm',
  outfile: outFile,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  alias: { '@': resolve(root, 'resources/ts') },
  external: ['preact', 'preact/hooks', 'preact/jsx-runtime'],
  logLevel: 'silent',
});

const { ServiceDrawerHost } = await import(pathToFileURL(outFile).href);
const { h, render } = await import('preact');
const { useState, useMemo, useRef } = await import('preact/hooks');

// ── Harness ──────────────────────────────────────────────────────────────
let setFooterCalls = 0;
let lastFooter = null;

function Harness() {
  const [, setFooterState] = useState(null);
  const setFooterRef = useRef(setFooterState);
  setFooterRef.current = setFooterState;

  const setFooter = useMemo(() => (footer) => {
    setFooterCalls += 1;
    lastFooter = footer;
    setFooterRef.current(footer);
  }, []);
  const onClose = useMemo(() => () => {}, []);
  const onModeChange = useMemo(() => () => {}, []);
  const onSaved = useMemo(() => () => {}, []);
  const setCloseGuard = useMemo(() => () => {}, []);

  return h(ServiceDrawerHost, {
    recordId: SERVICE_ID,
    mode: 'view',
    onClose,
    onModeChange,
    onSaved,
    setFooter,
    setCloseGuard,
  });
}

const container = document.createElement('div');
document.body.appendChild(container);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitToSettle(maxTicks = 400, quietTicksNeeded = 15) {
  let quiet = 0;
  let previous = setFooterCalls;
  for (let tick = 0; tick < maxTicks; tick += 1) {
    await sleep(5);
    if (setFooterCalls === previous) {
      quiet += 1;
      if (quiet >= quietTicksNeeded) return { settled: true, ticks: tick };
    } else {
      quiet = 0;
      previous = setFooterCalls;
    }
  }
  return { settled: false, ticks: maxTicks };
}

const failures = [];
function check(label, cond, detail) {
  if (cond) {
    console.log(`  ok — ${label}`);
  } else {
    console.error(`  FAIL — ${label}${detail ? `: ${detail}` : ''}`);
    failures.push(label);
  }
}

function clickButtonWithText(text) {
  const btn = [...container.querySelectorAll('button')].find((b) => b.textContent.trim() === text);
  btn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return btn;
}

// The module title node also carries an inline count badge with no separating
// whitespace, so match by prefix, not equality.
function findModule(titleText) {
  return [...container.querySelectorAll('.drawerModule')]
    .find((el) => el.querySelector('.drawerModule__title')?.textContent.trim().startsWith(titleText)) ?? null;
}

console.log('Service open-and-save race regression (existing Service, not creation)\n');

console.log('1) Mount an already-published, already-settled Service — while the mount detail GET is held open');
render(h(Harness), container);
await waitToSettle();
check('a footer was registered on mount', setFooterCalls > 0);
check('the mount detail fetch has started but is still held open (the race window)', detailFetchStarted && detailFetchCalls === 0);

console.log('\n2) Save Overview DURING the open race window — the save itself must not be lost');
clickButtonWithText('Edit');
await sleep(20);
const titleInput = container.querySelector('#cz-service-title');
check('the Overview editor opened with an input to edit', titleInput != null);
if (titleInput) {
  titleInput.value = 'Existing Published Service (edited during race window)';
  titleInput.dispatchEvent(new window.Event('input', { bubbles: true }));
}
// Also fill Description: the catalogue hand-off ServiceItem never carries
// excerpt/content (a separate, pre-existing gap unrelated to this race — see
// buildServiceItemForStationHandoff), so the editor's Description field opens
// blank until the detail GET resolves. A real edit fills it in alongside the
// title; leaving it blank here would just exercise that unrelated gap instead
// of the race this regression targets.
const contentInput = container.querySelector('#cz-service-description');
if (contentInput) {
  contentInput.value = 'Updated description, saved during the race window.';
  contentInput.dispatchEvent(new window.Event('input', { bubbles: true }));
}
await sleep(20);
clickButtonWithText('Save');
await waitToSettle();
check('detail fetch is still pending while this save happened', detailFetchCalls === 0);

clickButtonWithText('Edit');
await sleep(20);
const titleReopened = container.querySelector('#cz-service-title');
check(
  'reopening Overview shows the just-saved edit, not the stale pre-edit title — the save was not silently dropped',
  titleReopened?.value === 'Existing Published Service (edited during race window)',
  `value="${titleReopened?.value}"`,
);
clickButtonWithText('Cancel');
await sleep(20);

console.log('\n3) Save an Inclusion DURING the same still-open race window — it must not be lost either');
const inclusionsModule = findModule('Included Features');
check('the Included Features module is present', inclusionsModule != null);
const inclusionsEditBtn = [...(inclusionsModule?.querySelectorAll('button') ?? [])]
  .find((b) => b.textContent.trim() === 'Edit');
inclusionsEditBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
const addInclusionBtn = clickButtonWithText('+ Add inclusion');
check('the "+ Add inclusion" control is present once the Inclusions editor is open', addInclusionBtn != null);
await sleep(20);
const inclusionInput = container.querySelector('input[placeholder="Inclusion label"]');
check('the new-inclusion input is present', inclusionInput != null);
if (inclusionInput) {
  inclusionInput.value = 'Weekly integrity checks';
  inclusionInput.dispatchEvent(new window.Event('input', { bubbles: true }));
}
await sleep(20);
clickButtonWithText('Add');
await sleep(20);
clickButtonWithText('Save');
await waitToSettle();
check('detail fetch is STILL pending while the Inclusion save happened', detailFetchCalls === 0);

const inclusionsModuleAfterSave = findModule('Included Features');
const inclusionsEditBtn2 = [...(inclusionsModuleAfterSave?.querySelectorAll('button') ?? [])]
  .find((b) => b.textContent.trim() === 'Edit');
inclusionsEditBtn2?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
check(
  'reopening Inclusions shows the item just saved — the insert was not silently dropped',
  [...container.querySelectorAll('input.cz-tf-input')].some((i) => i.value === 'Weekly integrity checks'),
);
clickButtonWithText('Cancel');
await sleep(20);

console.log('\n4) Release the mount fetch — it must NOT revert either save (the out-of-order half of the race)');
releaseDetailFetch();
await waitToSettle();
check('the mount detail fetch eventually resolved', detailFetchCalls === 1, `detailFetchCalls=${detailFetchCalls}`);

clickButtonWithText('Edit');
await sleep(20);
const titleAfterRelease = container.querySelector('#cz-service-title');
check(
  'Overview still shows the saved edit after the delayed fetch resolves — it was not reverted to a stale snapshot',
  titleAfterRelease?.value === 'Existing Published Service (edited during race window)',
  `value="${titleAfterRelease?.value}"`,
);
clickButtonWithText('Cancel');
await sleep(20);

const overviewModule = findModule('Service Overview');
const overviewPill = overviewModule?.querySelector('.cz-module-status-pill');
check('the Overview pill is a clickable notification button (it has notes)', overviewPill?.tagName === 'BUTTON', `tag=${overviewPill?.tagName}`);
overviewPill?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
check(
  'the Overview notification panel shows "Draft saved — settle to publish", reflecting the save, not stale settled-state silence',
  overviewModule?.textContent.includes('Draft saved') ?? false,
  overviewModule?.textContent,
);

console.log('');
if (failures.length > 0) {
  console.error(`REGRESSION FAILED — ${failures.length} check(s) did not hold:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('All checks passed — Overview/Inclusions saves on an already-existing Service, made during the mount detail-fetch race window, are never silently dropped or later reverted.');
process.exit(0);
