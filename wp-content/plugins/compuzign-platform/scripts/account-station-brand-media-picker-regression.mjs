// Account Station Phase 2B regression — the Account-owned Logo/Favicon picker
// (AccountBrandEditor.tsx) that replaced the WordPress Media Library admin
// dialog (wp.media()). Proves, against the REAL mounted composition:
//
// 1) A legacy WordPress attachment reference still previews (read-only
//    compatibility) with a replace hint, and reopening needs no upload call.
// 2) "Upload new" immediately uploads to Account's own storage and previews
//    the returned image.
// 3) "Choose existing" lists previously stored Account images (one fetch,
//    shared by both fields, including the image just uploaded) and selecting
//    one swaps the preview and replaces the legacy reference.
// 4) Escape closes the list without leaving the field; a failed library
//    load shows an error and retries on the next open.
// 5) A wrong-type file is rejected client-side with zero network calls, and
//    a server-side upload failure leaves the field completely unchanged.
// 6) Clear empties the field.
// 7) Save sends only the six writable fields — never logo_url/favicon_url —
//    with the chosen Account image replacing the legacy attachment id.
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
globalThis.KeyboardEvent = window.KeyboardEvent;
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
let libraryFetchCalls = 0;
let forceNextUploadFailure = false;
let forceNextLibraryFailure = false;

const mediaItem = (n, name) => {
  const id = String(n).padStart(64, 'b');
  return { id, url: `https://cz-test.local/wp-content/uploads/compuzign-account/${id}.png`, name, mime: 'image/png', size: 10, uploaded_at: 100 - n };
};
// One image Account already stores from an earlier session; uploads add to this.
const storedMedia = [mediaItem(1, 'old-mark.png')];
let nextUploadedImage = 2;

// Favicon is still a legacy WordPress attachment (4001) — Logo is unset.
const brand = { name: 'CompuZign', code: 'CZ', logo_attachment_id: null, favicon_attachment_id: 4001, logo_media_id: null, favicon_media_id: null };

function presentBrand(b) {
  const resolve = (mediaId, attachmentId) => {
    if (mediaId) return storedMedia.find((item) => item.id === mediaId)?.url ?? null;
    return attachmentId ? `https://cz-test.local/attachment-${attachmentId}.png` : null;
  };
  return {
    ...b,
    logo_url: resolve(b.logo_media_id, b.logo_attachment_id),
    favicon_url: resolve(b.favicon_media_id, b.favicon_attachment_id),
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
    const item = mediaItem(nextUploadedImage, 'upload.png');
    nextUploadedImage += 1;
    storedMedia.unshift(item);
    return jsonResponse({ success: true, item });
  }
  if (path.endsWith('/admin/account-station/profile/media/library') && method === 'GET') {
    libraryFetchCalls += 1;
    if (forceNextLibraryFailure) {
      forceNextLibraryFailure = false;
      return jsonResponse({ success: false, message: 'boom' }, 500);
    }
    return jsonResponse({ success: true, items: storedMedia });
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
        logo_media_id: lastSaveBody.logo_media_id ?? null,
        favicon_media_id: lastSaveBody.favicon_media_id ?? null,
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

const buttonsWithText = (text) => [...container.querySelectorAll('button')].filter((b) => b.textContent.trim() === text);
const listImages = () => [...container.querySelectorAll('[role="group"] img')].map((img) => img.getAttribute('src'));

console.log('Account Station Phase 2B — Account-owned Brand media picker regression\n');

console.log('1) Mount into the editor — Favicon previews its legacy WordPress attachment, Logo is unset');
render(h(Harness), container);
await waitToSettle();
check('the detail GET ran exactly once on mount', detailFetchCalls === 1, `detailFetchCalls=${detailFetchCalls}`);
check('Favicon previews the legacy attachment\'s resolved URL with no upload call', previewSrc('Favicon') === 'https://cz-test.local/attachment-4001.png', previewSrc('Favicon'));
check('a replace hint explains the legacy reference', container.textContent.includes('Saved before Account stored its own images'));
check('no upload and no library call were made just to preview', mediaUploadCalls === 0 && libraryFetchCalls === 0, `uploads=${mediaUploadCalls} library=${libraryFetchCalls}`);
check('Logo has no preview yet', previewSrc('Logo') === null, previewSrc('Logo'));
check('each field offers Upload new and Choose existing', buttonsWithText('Upload new').length === 2 && buttonsWithText('Choose existing').length === 2);

console.log('\n2) Upload new Logo — uploads immediately to Account storage and previews the returned image');
pickFile(0, { name: 'logo.png', type: 'image/png' });
await sleep(20);
const uploadedUrl = storedMedia[0].url;
check('exactly one upload call was made', mediaUploadCalls === 1, `mediaUploadCalls=${mediaUploadCalls}`);
check('Logo now previews the uploaded image\'s Account-storage URL', previewSrc('Logo') === uploadedUrl && uploadedUrl.includes('/compuzign-account/'), previewSrc('Logo'));
check('uploading did not need the library list', libraryFetchCalls === 0, `libraryFetchCalls=${libraryFetchCalls}`);

console.log('\n3) A failed library load shows an error and the next open retries');
forceNextLibraryFailure = true;
clickNthButtonWithText('Choose existing', 1);
await sleep(30);
check('the failed library call was made once', libraryFetchCalls === 1, `libraryFetchCalls=${libraryFetchCalls}`);
check('a load error is shown, not a crash or an empty list', container.querySelector('[role="group"] [role="alert"]') !== null);
clickNthButtonWithText('Choose existing', 1); // close
await sleep(10);
clickNthButtonWithText('Choose existing', 1); // reopen — retries
await sleep(30);
check('reopening retried the load', libraryFetchCalls === 2, `libraryFetchCalls=${libraryFetchCalls}`);

console.log('\n4) Choose existing — lists prior Account images (including the fresh upload) and selecting one replaces the legacy Favicon');
check('the list shows both stored images, newest first', JSON.stringify(listImages()) === JSON.stringify(storedMedia.map((i) => i.url)), JSON.stringify(listImages()));
const old = storedMedia.find((i) => i.name === 'old-mark.png');
[...container.querySelectorAll('[role="group"] button')].find((b) => b.getAttribute('title') === 'old-mark.png')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
check('Favicon now previews the chosen Account image', previewSrc('Favicon') === old.url, previewSrc('Favicon'));
check('the list closed after choosing', container.querySelector('[role="group"]') === null);
check('the legacy replace hint is gone for Favicon', !container.textContent.includes('Saved before Account stored its own images'));
check('choosing made no upload call', mediaUploadCalls === 1, `mediaUploadCalls=${mediaUploadCalls}`);

console.log('\n5) The list is shared and fetched once; Escape closes it without leaving the field');
clickNthButtonWithText('Choose existing', 0);
await sleep(20);
check('opening the Logo list reused the loaded library — no third fetch', libraryFetchCalls === 2, `libraryFetchCalls=${libraryFetchCalls}`);
check('the currently chosen Logo is marked pressed', container.querySelector('[role="group"] button[aria-pressed="true"]') !== null);
container.querySelector('[role="group"]').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
await sleep(20);
check('Escape closed the list', container.querySelector('[role="group"]') === null);

console.log('\n6) A wrong-type file is rejected client-side — never reaches the upload route');
pickFile(1, { name: 'brand.pdf', type: 'application/pdf' });
await sleep(20);
check('no upload call was made for the rejected file type', mediaUploadCalls === 1, `mediaUploadCalls=${mediaUploadCalls}`);
check('Favicon is unchanged by the rejected pick', previewSrc('Favicon') === old.url, previewSrc('Favicon'));
check('a rejection message is shown', container.textContent.includes('JPEG, PNG, GIF, or WebP'));

console.log('\n7) A server-side upload failure leaves the field completely untouched');
forceNextUploadFailure = true;
pickFile(0, { name: 'logo-v2.png', type: 'image/png' });
await sleep(20);
check('the failed upload still counts as an attempt', mediaUploadCalls === 2, `mediaUploadCalls=${mediaUploadCalls}`);
check('Logo preview is unchanged after the server-side failure — never a false "picked" state', previewSrc('Logo') === uploadedUrl, previewSrc('Logo'));

console.log('\n8) Clear the Logo — empties the field; the stored file stays in the library');
clickNthButtonWithText('Clear', 0);
await sleep(20);
check('Logo preview is gone after Clear', previewSrc('Logo') === null, previewSrc('Logo'));
check('Clear made no network call', mediaUploadCalls === 2 && libraryFetchCalls === 2, `uploads=${mediaUploadCalls} library=${libraryFetchCalls}`);

console.log('\n9) Save sends only the six writable fields — the chosen Account image replaces the legacy attachment id');
clickButtonWithText('Save');
await waitToSettle();
check('saveProfile ran exactly once', saveCalls === 1, `saveCalls=${saveCalls}`);
check('the saved Logo reflects the explicit Clear', lastSaveBody?.logo_media_id === null && lastSaveBody?.logo_attachment_id === null, JSON.stringify(lastSaveBody));
check('the saved Favicon is the chosen Account image', lastSaveBody?.favicon_media_id === old.id, lastSaveBody?.favicon_media_id);
check('the legacy Favicon attachment id is dropped by the replacement', lastSaveBody?.favicon_attachment_id === null, lastSaveBody?.favicon_attachment_id);
check('the Save payload carries exactly the six writable fields', JSON.stringify(Object.keys(lastSaveBody ?? {}).sort()) === JSON.stringify(['code', 'favicon_attachment_id', 'favicon_media_id', 'logo_attachment_id', 'logo_media_id', 'name']), JSON.stringify(Object.keys(lastSaveBody ?? {})));

console.log('');
if (failures.length > 0) {
  console.error(`REGRESSION FAILED — ${failures.length} check(s) did not hold:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('All checks passed — the Account-owned Brand media picker uploads, lists, chooses, rejects, and Clears correctly, with no WordPress Media Library dialog involved.');
process.exit(0);
