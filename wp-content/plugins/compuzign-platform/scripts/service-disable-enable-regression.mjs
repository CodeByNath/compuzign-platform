// Service Disable/Enable mounted regression — Issues 3 & 4.
//
// Reproduces two reported defects on an already-published Service (Overview,
// Inclusions and FAQs all settled/active):
//   3. Disable makes every module pill read "Pending" instead of "Disabled".
//   4. Enable republishes/reactivates content instead of restoring the
//      Service's prior state — i.e. Enable behaves like Publish.
//
// Mounts the REAL ServiceDrawerHost composition (esbuild + happy-dom + Preact
// render, same technique as scripts/service-create-regression.mjs) against a
// numeric recordId — an existing, already-published record — and drives the
// real record-footer Disable/Enable action exactly as CanonicalEntityFooter
// wires it (via the captured footer node's onToggleActive prop, since the
// footer renders through the host bridge, not into the mounted container).
//
// Usage: npm run regression:service-disable-enable
//    or: node scripts/service-disable-enable-regression.mjs

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-service-disable-enable-bundle.mjs');
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
const SERVICE_ID = 701;
const CATEGORY = { id: 1, name: 'Test Category', slug: 'test-category', description: '' };

// Server-side truth — a Service that has already been published, with every
// module settled. Mirrors the ticket's "Disabled published Service" example.
const server = {
  title: 'Existing Published Service',
  excerpt: 'A settled excerpt.',
  content: 'A settled description.',
  categories: [CATEGORY],
  inclusions: [{ id: 'daily-backups', label: 'Daily backups' }],
  faqs: [{ id: 'how-often', question: 'How often?', answer: 'Daily.' }],
  platformStatus: 'active',
  previousPlatformStatus: '',
  moduleStatus: { overview: 'settled', inclusions: 'settled', faqs: 'settled' },
};

let statusCalls = 0;

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
        title: server.title,
        slug: 'existing-published-service',
        platform_status: server.platformStatus,
        previous_platform_status: server.previousPlatformStatus,
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
  if (path.endsWith(`/admin/services/${SERVICE_ID}`) && method === 'GET') {
    return jsonResponse({
      success: true,
      id: SERVICE_ID,
      title: server.title,
      excerpt: server.excerpt,
      content: server.content,
      categories: server.categories,
      inclusions: server.inclusions,
      faqs: server.faqs,
      platform_status: server.platformStatus,
      previous_platform_status: server.previousPlatformStatus,
      module_status: server.moduleStatus,
      drafts: { overview: null, inclusions: null, faqs: null },
    });
  }
  if (path.endsWith(`/admin/services/${SERVICE_ID}/status`) && method === 'POST') {
    statusCalls += 1;
    const payload = JSON.parse(init.body ?? '{}');
    // The real backend contract (ServiceController::updateDisabledMask):
    // Disable never touches module_status; Enable restores the captured
    // previous_platform_status and clears the mask, also never touching
    // module_status. This mock reproduces that contract so the test proves
    // the FRONTEND wiring, not a reimplementation of the backend rule
    // (the backend rule itself is proven in tests/service-lifecycle-mask.php).
    if (payload.action === 'disable') {
      server.previousPlatformStatus = server.platformStatus;
      server.platformStatus = 'disabled';
    } else if (payload.action === 'enable') {
      server.platformStatus = server.previousPlatformStatus || 'disabled';
      server.previousPlatformStatus = '';
    } else {
      return Promise.reject(new Error(`Unexpected /status payload in regression harness: ${init.body}`));
    }
    return jsonResponse({
      success: true,
      service: {
        id: SERVICE_ID,
        platform_status: server.platformStatus,
        previous_platform_status: server.previousPlatformStatus,
        module_status: server.moduleStatus,
        post_status: 'publish',
        is_active: server.platformStatus === 'active',
      },
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
// The record footer (Disable/Enable/Archive/…) is registered via setFooter,
// not rendered into `container` — same as the other Service regression
// harnesses — so its handlers are invoked directly through the captured node.
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

// The module title node also carries an inline count badge with no separating
// whitespace (e.g. "Included Features1"), so match by prefix, not equality.
function findModule(titleText) {
  return [...container.querySelectorAll('.drawerModule')]
    .find((el) => el.querySelector('.drawerModule__title')?.textContent.trim().startsWith(titleText)) ?? null;
}

function pillLabel(moduleTitle) {
  return findModule(moduleTitle)?.querySelector('.cz-module-status-pill')?.textContent.trim();
}

console.log('Service Disable/Enable regression (Issues 3 & 4)\n');

console.log('1) Mount an already-published Service (Overview/Inclusions/FAQs all settled)');
render(h(Harness), container);
await waitToSettle();
check('a footer was registered on mount', setFooterCalls > 0);
check('the record footer exposes onToggleActive', typeof lastFooter?.props?.onToggleActive === 'function');
check('the footer\'s status action reads Disable while the Service is active', lastFooter?.props?.platformStatus === 'active');

check('Overview pill reads Active before Disable', pillLabel('Service Overview') === 'Active', pillLabel('Service Overview'));
check('Included Features pill reads Active before Disable', pillLabel('Included Features') === 'Active', pillLabel('Included Features'));
check('Common Questions pill reads Active before Disable', pillLabel('Common Questions') === 'Active', pillLabel('Common Questions'));

console.log('\n2) Disable — every module pill must read Disabled, not Pending (Issue 3)');
lastFooter.props.onToggleActive();
await waitToSettle();
check('the status endpoint was called once for Disable', statusCalls === 1, `statusCalls=${statusCalls}`);

check('Overview pill reads Disabled after Disable', pillLabel('Service Overview') === 'Disabled', pillLabel('Service Overview'));
check('Included Features pill reads Disabled after Disable — NOT Pending', pillLabel('Included Features') === 'Disabled', pillLabel('Included Features'));
check('Common Questions pill reads Disabled after Disable — NOT Pending', pillLabel('Common Questions') === 'Disabled', pillLabel('Common Questions'));

console.log('\n3) Enable — the Service and its modules must return to Active, not be force-published or force-settled (Issue 4)');
check('the footer\'s status action now reads Enable', lastFooter?.props?.platformStatus === 'disabled');
lastFooter.props.onToggleActive();
await waitToSettle();
check('the status endpoint was called a second time for Enable', statusCalls === 2, `statusCalls=${statusCalls}`);

check('Overview pill returns to Active after Enable (it was settled before Disable — restored, not re-settled)', pillLabel('Service Overview') === 'Active', pillLabel('Service Overview'));
check('Included Features pill returns to Active after Enable', pillLabel('Included Features') === 'Active', pillLabel('Included Features'));
check('Common Questions pill returns to Active after Enable', pillLabel('Common Questions') === 'Active', pillLabel('Common Questions'));

console.log('');
if (failures.length > 0) {
  console.error(`REGRESSION FAILED — ${failures.length} check(s) did not hold:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('All checks passed — Disable masks every module as Disabled; Enable restores the prior settled/Active state without republishing.');
process.exit(0);
