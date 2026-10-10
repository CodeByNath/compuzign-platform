// Account Station Phase 2A regression — the two defects Reviewer proved
// against candidate 8949e02f:
//
// 1) First-Save identity handoff: saveProfile()'s response now carries the
//    just-bound `nodes` (AccountController.php), and useAccountStation seeds
//    them into the SAME mounted detail — the drawer must show the real bound
//    Platform ID right after Save, with no remount and no follow-up GET.
// 2) Explicit-null attachment Clear: useAccountDrawerController's brandBinding
//    now selects the whole draft object first (`drafts.brand ?? brand`), not
//    each nullable field individually — an intentional Clear (draft field
//    explicitly null) must not fall back to an old canonical attachment id.
//
// Same harness technique as scripts/service-create-handoff-regression.mjs:
// mounts the REAL AccountDrawerHost composition (esbuild + happy-dom + Preact
// render); only fetch (and window.wp.media, Account's one extra native
// dependency) are faked.
//
// Usage: npm run regression:account-station-first-save-clear
//    or: node scripts/account-station-first-save-clear-regression.mjs

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-account-first-save-clear-bundle.mjs');
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

// The real Logo/Favicon pickers are wp.media() (AccountBrandEditor.tsx) — the
// one native dependency this drawer has beyond fetch. Faked the same way:
// open() immediately "selects" whatever nextPickedAttachmentId is set to.
let nextPickedAttachmentId = 0;
window.wp = {
  media: () => {
    let selectHandler = null;
    return {
      on(event, handler) { if (event === 'select') selectHandler = handler; },
      open() { selectHandler?.(); },
      state() {
        return {
          get: () => ({
            first: () => ({ toJSON: () => ({ id: nextPickedAttachmentId, url: `https://cz-test.local/${nextPickedAttachmentId}.png` }) }),
          }),
        };
      },
    };
  },
};

// ── Fetch mock — the only faked boundary besides wp.media ───────────────
const FIXED_NODES = {
  account_station: { platform_id: 'CZA00001', parent_platform_id: null },
  settings:         { platform_id: 'CZAS00001', parent_platform_id: 'CZA00001' },
  tools:            { platform_id: 'CZAST00001', parent_platform_id: 'CZAS00001' },
  profile:          { platform_id: 'CZASTP00001', parent_platform_id: 'CZAST00001' },
};
const EMPTY_NODES = {
  account_station: { platform_id: '', parent_platform_id: null },
  settings:         { platform_id: '', parent_platform_id: null },
  tools:            { platform_id: '', parent_platform_id: null },
  profile:          { platform_id: '', parent_platform_id: null },
};

let detailFetchCalls = 0;
let saveCalls = 0;
let settleCalls = 0;
let statusCalls = 0;

// Server-side truth, mirroring AccountRepository's own fields exactly.
const server = {
  bootstrapped: false,
  brand: { name: '', code: '', logo_attachment_id: null, favicon_attachment_id: null },
  draft: null,
  platform_status: 'disabled',
  previous_platform_status: '',
  module_status: { brand: 'not-configured' },
};

function jsonResponse(body) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function resolveAttachment(raw) {
  if (raw === null || raw === undefined || raw === 0 || raw === '0') return null;
  return Number(raw);
}

globalThis.fetch = (url, init = {}) => {
  const path = String(url);
  const method = (init?.method ?? 'GET').toUpperCase();

  if (path.endsWith('/admin/account-station') && method === 'GET') {
    detailFetchCalls += 1;
    return jsonResponse({
      success: true,
      bootstrapped: server.bootstrapped,
      nodes: server.bootstrapped ? FIXED_NODES : EMPTY_NODES,
      platform_status: server.platform_status,
      previous_platform_status: server.previous_platform_status,
      module_status: server.module_status,
      brand: server.brand,
      drafts: { brand: server.draft },
    });
  }
  if (path.endsWith('/admin/account-station/profile') && method === 'POST') {
    saveCalls += 1;
    const payload = JSON.parse(init.body);
    server.bootstrapped = true;
    server.draft = {
      name: payload.name ?? '',
      code: payload.code ?? '',
      logo_attachment_id: resolveAttachment(payload.logo_attachment_id),
      favicon_attachment_id: resolveAttachment(payload.favicon_attachment_id),
    };
    server.module_status = { brand: 'pending' };
    // The corrected AccountController::saveProfile() response — same `nodes`
    // shape fetchDetail() returns, proven in tests/account-station.php.
    return jsonResponse({ success: true, draft: server.draft, module_status: server.module_status, nodes: FIXED_NODES });
  }
  if (path.endsWith('/admin/account-station/profile/settle') && method === 'POST') {
    settleCalls += 1;
    server.brand = server.draft ?? server.brand;
    server.draft = null;
    server.module_status = { brand: 'settled' };
    return jsonResponse({ success: true, brand: server.brand, module_status: server.module_status });
  }
  if (path.endsWith('/admin/account-station/status') && method === 'POST') {
    statusCalls += 1;
    const payload = JSON.parse(init.body);
    if (payload.platform_status === 'active') {
      server.platform_status = 'active';
      server.previous_platform_status = '';
    } else if (payload.action === 'disable') {
      server.previous_platform_status = server.platform_status;
      server.platform_status = 'disabled';
    } else if (payload.action === 'enable') {
      server.platform_status = 'disabled';
      server.previous_platform_status = '';
    }
    return jsonResponse({
      success: true,
      platform_status: server.platform_status,
      previous_platform_status: server.previous_platform_status,
      module_status: server.module_status,
    });
  }
  return Promise.reject(new Error(`Unexpected fetch in regression harness: ${method} ${path}`));
};

// ── Bundle the REAL composition ─────────────────────────────────────────
await build({
  entryPoints: [resolve(root, 'resources/ts/account-station/surface/AccountDrawerHost.tsx')],
  bundle: true,
  format: 'esm',
  outfile: outFile,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  alias: { '@': resolve(root, 'resources/ts') },
  external: ['preact', 'preact/hooks', 'preact/jsx-runtime'],
  logLevel: 'silent',
});

const { AccountDrawerHost } = await import(pathToFileURL(outFile).href);
const { h, render } = await import('preact');
const { useState, useMemo, useRef } = await import('preact/hooks');

// ── Harness — footer captured via setFooter, same as
// scripts/service-disable-enable-regression.mjs, invoked through its own
// captured handler props rather than clicked in `container`. ───────────────
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

  return h(AccountDrawerHost, {
    recordId: 'account',
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
  let previousFooterCalls = setFooterCalls;
  let previousHtml = container.innerHTML;
  for (let tick = 0; tick < maxTicks; tick += 1) {
    await sleep(5);
    const htmlNow = container.innerHTML;
    if (setFooterCalls === previousFooterCalls && htmlNow === previousHtml) {
      quiet += 1;
      if (quiet >= quietTicksNeeded) return { settled: true, ticks: tick };
    } else {
      quiet = 0;
      previousFooterCalls = setFooterCalls;
      previousHtml = htmlNow;
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

function fieldValue(fieldId) {
  return container.querySelector(`[data-field-id="${fieldId}"] .drawerModule__value`)?.textContent.trim() ?? null;
}

console.log('Account Station first-Save identity handoff + explicit-null Clear regression\n');

console.log('1) Mount on an unbootstrapped install — Platform ID reads the pre-Save fallback');
render(h(Harness), container);
await waitToSettle();
check('the detail GET ran exactly once on mount', detailFetchCalls === 1, `detailFetchCalls=${detailFetchCalls}`);
check('Platform ID shows the pre-Save fallback, not a blank or fabricated id', fieldValue('platform-id') === 'Assigned after Save', fieldValue('platform-id'));

console.log('\n2) First Save — bootstraps identity; the SAME mounted drawer must show the real Platform ID with no remount');
clickButtonWithText('Edit');
await sleep(20);
container.querySelector('#cz-account-brand-name').value = 'CompuZign';
container.querySelector('#cz-account-brand-name').dispatchEvent(new window.Event('input', { bubbles: true }));
nextPickedAttachmentId = 5001;
clickButtonWithText('Pick'); // Logo — first Pick button in document order
await sleep(20);
clickButtonWithText('Save');
await waitToSettle();

check('saveProfile was called exactly once', saveCalls === 1, `saveCalls=${saveCalls}`);
check('first Save never triggers a follow-up detail GET (no-remount handoff)', detailFetchCalls === 1, `detailFetchCalls=${detailFetchCalls}`);
check(
  'Platform ID updates to the real bound id straight from the Save response, in the same mounted drawer',
  fieldValue('platform-id') === 'CZASTP00001',
  fieldValue('platform-id'),
);
check('Logo now reads Set after the first Save', fieldValue('logo') === 'Set', fieldValue('logo'));

console.log('\n3) Publish — settles the Logo draft to canonical, then activates');
lastFooter?.props?.onPublish();
await sleep(20);
clickButtonWithText('Publish');
await waitToSettle();
check('settleProfile ran once', settleCalls === 1, `settleCalls=${settleCalls}`);
check('the status route activated once', statusCalls === 1, `statusCalls=${statusCalls}`);
check('Logo still reads Set once settled to canonical', fieldValue('logo') === 'Set', fieldValue('logo'));

console.log('\n4) Explicit Clear of the now-canonical Logo — must NOT fall back to the old canonical attachment id');
clickButtonWithText('Edit');
await sleep(20);
check('the Brand editor reopens seeded with the just-settled Logo', container.textContent.includes('Attachment #5001'));
clickButtonWithText('Clear'); // Logo — first Clear button in document order
await sleep(20);
clickButtonWithText('Save');
await waitToSettle();

check('the second saveProfile call ran with the explicit Clear', saveCalls === 2, `saveCalls=${saveCalls}`);
check(
  'Logo reads Not set after an explicit Clear — the defect fell back to the old canonical attachment ("Set") instead',
  fieldValue('logo') === 'Not set',
  fieldValue('logo'),
);
check('no detail GET was needed for the Clear to display correctly', detailFetchCalls === 1, `detailFetchCalls=${detailFetchCalls}`);

console.log('');
if (failures.length > 0) {
  console.error(`REGRESSION FAILED — ${failures.length} check(s) did not hold:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('All checks passed — first-Save identity handoff and explicit-null attachment Clear both hold in the mounted Account drawer.');
process.exit(0);
