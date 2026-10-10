// Account Station Phase 2B regression — the platform-owned Logo/Favicon
// picker (AccountBrandEditor.tsx) that replaced the WordPress Media Library
// admin dialog (wp.media()). Proves, against the REAL mounted composition:
//
// 1) Reopening the editor previews an existing canonical attachment from its
//    server-resolved logo_url/favicon_url — no re-upload needed.
// 2) Pick/Replace immediately uploads through uploadAccountBrandMedia() and
//    swaps the preview to the real returned id/url, never a WP admin dialog.
// 3) A wrong-type file is rejected client-side before ever calling the
//    upload route — no spurious network call.
// 4) A server-side upload failure leaves the previous attachment/preview
//    completely unchanged — never a false "picked" state.
// 5) Clear resets both the id and its preview.
// 6) Save sends only the four writable fields — never the read-only
//    logo_url/favicon_url presentation fields api.ts's whitelist exists for.
//
// Same esbuild + happy-dom + Preact harness technique as
// account-station-first-save-clear-regression.mjs; only fetch is faked.
//
// Usage: npm run regression:account-station-brand-media-picker
//    or: node scripts/account-station-brand-media-picker-regression.mjs

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-account-brand-media-picker-bundle.mjs');
mkdirSync(dirname(outFile), { recursive: true });

// ── DOM shim ─────────────────────────────────────────────────────────────
const window = new Window({ url: 'https://cz-test.local/' });
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.MouseEvent = window.MouseEvent;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Node = window.Node;
globalThis.File = window.File;
globalThis.FormData = window.FormData;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

window.CompuZignConfig = { apiRoot: 'https://cz-test.local/wp-json/', nonce: 'test-nonce' };

// ── Fetch mock — bootstrapped from the start; only the one Favicon's already
// canonical, so the first render exercises the "preview an existing
// attachment" path without any picker interaction at all. ────────────────
const FIXED_NODES = {
  account_station: { platform_id: 'CZA00001', parent_platform_id: null },
  settings:         { platform_id: 'CZAS00001', parent_platform_id: 'CZA00001' },
  tools:            { platform_id: 'CZAST00001', parent_platform_id: 'CZAS00001' },
  profile:          { platform_id: 'CZASTP00001', parent_platform_id: 'CZAST00001' },
};

let detailFetchCalls = 0;
let mediaUploadCalls = 0;
let saveCalls = 0;
let lastSaveBody = null;
let nextUploadedAttachmentId = 5001;
let forceNextUploadFailure = false;

const brand = { name: 'CompuZign', code: 'CZ', logo_attachment_id: null, favicon_attachment_id: 4001 };

function presentBrand(b) {
  return {
    ...b,
    logo_url: b.logo_attachment_id ? `https://cz-test.local/attachment-${b.logo_attachment_id}.png` : null,
    favicon_url: b.favicon_attachment_id ? `https://cz-test.local/attachment-${b.favicon_attachment_id}.png` : null,
  };
}

function jsonResponse(body, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

globalThis.fetch = (url, init = {}) => {
  const path = String(url);
  const method = (init?.method ?? 'GET').toUpperCase();

  if (path.endsWith('/admin/account-station') && method === 'GET') {
    detailFetchCalls += 1;
    return jsonResponse({
      success: true,
      bootstrapped: true,
      nodes: FIXED_NODES,
      platform_status: 'disabled',
      previous_platform_status: '',
      module_status: { brand: 'settled' },
      brand: presentBrand(brand),
      drafts: { brand: null },
    });
  }
  if (path.endsWith('/admin/account-station/profile/media') && method === 'POST') {
    mediaUploadCalls += 1;
    if (forceNextUploadFailure) {
      forceNextUploadFailure = false;
      return jsonResponse({ success: false, message: 'Could not store the uploaded image.' }, 500);
    }
    const id = nextUploadedAttachmentId;
    nextUploadedAttachmentId += 1;
    return jsonResponse({ success: true, id, url: `https://cz-test.local/attachment-${id}.png` });
  }
  if (path.endsWith('/admin/account-station/profile') && method === 'POST') {
    saveCalls += 1;
    lastSaveBody = JSON.parse(init.body);
    return jsonResponse({
      success: true,
      draft: presentBrand({
        name: lastSaveBody.name ?? '',
        code: lastSaveBody.code ?? '',
        logo_attachment_id: lastSaveBody.logo_attachment_id ?? null,
        favicon_attachment_id: lastSaveBody.favicon_attachment_id ?? null,
      }),
      module_status: { brand: 'pending' },
      nodes: FIXED_NODES,
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

function Harness() {
  const [, setFooterState] = useState(null);
  const setFooterRef = useRef(setFooterState);
  setFooterRef.current = setFooterState;

  const setFooter = useMemo(() => (footer) => setFooterRef.current(footer), []);
  const onClose = useMemo(() => () => {}, []);
  const onModeChange = useMemo(() => () => {}, []);
  const onSaved = useMemo(() => () => {}, []);
  const setCloseGuard = useMemo(() => () => {}, []);

  // mode: 'edit' opens the Brand editor on mount (AccountDrawerHost's
  // initialEdit={mode === 'edit'}) — skips a redundant "click Edit" step,
  // since this script's whole focus is the picker inside that editor.
  return h(AccountDrawerHost, {
    recordId: 'account',
    mode: 'edit',
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
  let previousHtml = container.innerHTML;
  for (let tick = 0; tick < maxTicks; tick += 1) {
    await sleep(5);
    const htmlNow = container.innerHTML;
    if (htmlNow === previousHtml) {
      quiet += 1;
      if (quiet >= quietTicksNeeded) return;
    } else {
      quiet = 0;
      previousHtml = htmlNow;
    }
  }
}

const failures = [];
function check(label, cond, detail) {
  if (cond) {
    console.log(`  ok — ${label}`);
  } else {
    console.error(`  FAIL — ${label}${detail !== undefined ? `: ${detail}` : ''}`);
    failures.push(label);
  }
}

function clickButtonWithText(text) {
  const btn = [...container.querySelectorAll('button')].find((b) => b.textContent.trim() === text);
  btn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return btn;
}

// Logo and Favicon can both show a "Clear" button at once (unlike the
// first-Save script, where only Logo is ever set) — index 0 is Logo's,
// index 1 is Favicon's, document order.
function clickNthButtonWithText(text, index) {
  const btn = [...container.querySelectorAll('button')].filter((b) => b.textContent.trim() === text)[index];
  btn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return btn;
}

// index 0 is Logo's hidden file input, index 1 is Favicon's — document order.
function pickFile(index, { name = 'pic.png', type = 'image/png' } = {}) {
  const input = container.querySelectorAll('input[type="file"]')[index];
  const file = new window.File(['fake-bytes'], name, { type });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new window.Event('change', { bubbles: true }));
}

function previewSrc(label) {
  return container.querySelector(`img[alt="${label}"]`)?.getAttribute('src') ?? null;
}

console.log('Account Station Phase 2B — platform-owned Brand media picker regression\n');

console.log('1) Mount directly into the editor — Favicon previews its existing canonical attachment, Logo is unset');
render(h(Harness), container);
await waitToSettle();
check('the detail GET ran exactly once on mount', detailFetchCalls === 1, `detailFetchCalls=${detailFetchCalls}`);
check('Favicon previews the canonical attachment\'s resolved URL with no upload call', previewSrc('Favicon') === 'https://cz-test.local/attachment-4001.png', previewSrc('Favicon'));
check('no upload call was made just to preview an existing attachment', mediaUploadCalls === 0, `mediaUploadCalls=${mediaUploadCalls}`);
check('Logo has no preview yet', previewSrc('Logo') === null, previewSrc('Logo'));
check('Logo\'s picker button reads Pick, not Replace, before anything is set', [...container.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Pick'));

console.log('\n2) Pick a Logo — uploads immediately and previews the real returned image');
pickFile(0, { name: 'logo.png', type: 'image/png' });
await sleep(20);
check('exactly one upload call was made', mediaUploadCalls === 1, `mediaUploadCalls=${mediaUploadCalls}`);
check('Logo now previews the uploaded attachment\'s URL', previewSrc('Logo') === 'https://cz-test.local/attachment-5001.png', previewSrc('Logo'));

console.log('\n3) Replace the Logo — a second Pick swaps the preview to the new upload, not a duplicate of the first');
pickFile(0, { name: 'logo-v2.png', type: 'image/png' });
await sleep(20);
check('a second upload call was made for Replace', mediaUploadCalls === 2, `mediaUploadCalls=${mediaUploadCalls}`);
check('Logo now previews the SECOND uploaded attachment, not the first', previewSrc('Logo') === 'https://cz-test.local/attachment-5002.png', previewSrc('Logo'));

console.log('\n4) A wrong-type file on Favicon is rejected client-side — never reaches the upload route');
pickFile(1, { name: 'brand.pdf', type: 'application/pdf' });
await sleep(20);
check('no upload call was made for the rejected file type', mediaUploadCalls === 2, `mediaUploadCalls=${mediaUploadCalls}`);
check('Favicon is unchanged by the rejected pick', previewSrc('Favicon') === 'https://cz-test.local/attachment-4001.png', previewSrc('Favicon'));
check('a rejection message is shown', container.textContent.includes('JPEG, PNG, GIF, or WebP'));

console.log('\n5) A server-side upload failure on Favicon leaves the previous attachment/preview completely untouched');
forceNextUploadFailure = true;
pickFile(1, { name: 'favicon-v2.png', type: 'image/png' });
await sleep(20);
check('the failed upload call still counts as an attempt', mediaUploadCalls === 3, `mediaUploadCalls=${mediaUploadCalls}`);
check('Favicon preview is unchanged after the server-side failure — never a false "picked" state', previewSrc('Favicon') === 'https://cz-test.local/attachment-4001.png', previewSrc('Favicon'));

console.log('\n6) Clear the Favicon — resets both the id and its preview');
clickNthButtonWithText('Clear', 1); // Logo (index 0) also has a Clear button now; Favicon is index 1
await sleep(20);
check('Favicon preview is gone after Clear', previewSrc('Favicon') === null, previewSrc('Favicon'));

console.log('\n7) Save sends only the four writable fields — never the read-only logo_url/favicon_url presentation fields');
clickButtonWithText('Save');
await waitToSettle();
check('saveProfile ran exactly once', saveCalls === 1, `saveCalls=${saveCalls}`);
check('the saved Logo is the SECOND uploaded attachment (the Replace), not the first', lastSaveBody?.logo_attachment_id === 5002, lastSaveBody?.logo_attachment_id);
check('the saved Favicon reflects the explicit Clear', lastSaveBody?.favicon_attachment_id === null, lastSaveBody?.favicon_attachment_id);
check('the Save payload never carries logo_url', !Object.prototype.hasOwnProperty.call(lastSaveBody ?? {}, 'logo_url'));
check('the Save payload never carries favicon_url', !Object.prototype.hasOwnProperty.call(lastSaveBody ?? {}, 'favicon_url'));

console.log('');
if (failures.length > 0) {
  console.error(`REGRESSION FAILED — ${failures.length} check(s) did not hold:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('All checks passed — the platform-owned Brand media picker uploads, previews, rejects, and Clears correctly, with no WordPress Media Library dialog involved.');
process.exit(0);
