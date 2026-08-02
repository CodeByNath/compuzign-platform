import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-package-family-handoff-bundle.mjs');
mkdirSync(dirname(outFile), { recursive: true });

const window = new Window({ url: 'https://cz-test.local/' });
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.MouseEvent = window.MouseEvent;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Node = window.Node;
globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
window.CompuZignConfig = { apiRoot: 'https://cz-test.local/wp-json/', nonce: 'test-nonce' };

const CREATED_ID = 'pcg_handoff';
let createCalls = 0;
let updateCalls = 0;
let failedCreates = 0;
let shouldFailCreate = true;
let settleCalls = 0;
let activationCalls = 0;

function response(body, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function family(name, description) {
  return {
    group_id: CREATED_ID,
    label: name,
    description,
    platform_status: 'disabled',
    previous_platform_status: null,
    module_status: { overview: 'pending' },
    has_draft: false,
    sort_order: 0,
    assigned_service_count: 0,
    dependents: { services: 0, rate_sheet_rows: 0, tier_selections: 0 },
    tier_assignment_count: 0,
    active_tier_slots: { occupied: 0, capacity: 0 },
  };
}

globalThis.fetch = (url, init = {}) => {
  const path = String(url);
  const method = (init.method ?? 'GET').toUpperCase();
  const body = init.body ? JSON.parse(init.body) : {};

  if (path.includes('/admin/package-category-groups') && method === 'GET') {
    return response({ package_category_groups: [] });
  }
  if (path.endsWith('/admin/package-station/tier-assignments') && method === 'GET') {
    return response({ success: true, tier_assignments: [] });
  }
  if (path.endsWith('/admin/package-station/tier-instances') && method === 'GET') {
    return response({ success: true, tier_instances: [] });
  }
  if (path.endsWith('/admin/package-category-groups') && method === 'POST') {
    createCalls += 1;
    if (shouldFailCreate) {
      failedCreates += 1;
      return response({ success: false, message: 'Deliberate create failure.' }, false, 500);
    }
    return response({ success: true, group: family(body.name, body.description ?? '') });
  }
  if (path.endsWith(`/admin/package-category-groups/${CREATED_ID}/overview`) && method === 'PUT') {
    updateCalls += 1;
    return response({ success: true, group: { ...family(body.name, body.description ?? ''), has_draft: true } });
  }
  if (path.endsWith(`/admin/package-category-groups/${CREATED_ID}/overview/settle`) && method === 'POST') {
    settleCalls += 1;
    return response({ success: true, group: { ...family('KAIROS', 'Updated after handoff.'), module_status: { overview: 'settled' } } });
  }
  if (path.endsWith(`/admin/package-category-groups/${CREATED_ID}/status`) && method === 'PATCH') {
    if (body.platform_status === 'active') activationCalls += 1;
    return response({
      success: true,
      group: { ...family('KAIROS', 'Updated after handoff.'), platform_status: 'active', module_status: { overview: 'settled' } },
    });
  }
  return Promise.reject(new Error(`Unexpected Package Family fetch: ${method} ${path}`));
};

await build({
  entryPoints: [resolve(root, 'resources/ts/package-station/drawer/package-family/PackageFamilyDrawerContent.tsx')],
  bundle: true,
  format: 'esm',
  outfile: outFile,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  alias: { '@': resolve(root, 'resources/ts') },
  external: ['preact', 'preact/hooks', 'preact/jsx-runtime'],
  logLevel: 'silent',
});

const { PackageFamilyDrawerContent } = await import(pathToFileURL(outFile).href);
const { h, render } = await import('preact');
const { useMemo, useRef, useState } = await import('preact/hooks');

let footerCalls = 0;
let latestFooter = null;
let savedCalls = 0;

function Harness() {
  const [, rerender] = useState(0);
  const [, setFooterState] = useState(null);
  const footerStateRef = useRef(setFooterState);
  footerStateRef.current = setFooterState;
  const setFooter = useMemo(() => (footer) => {
    footerCalls += 1;
    if (footer) latestFooter = footer;
    footerStateRef.current(footer);
  }, []);
  const noop = useMemo(() => () => {}, []);
  const onSaved = useMemo(() => () => {
    savedCalls += 1;
    rerender((value) => value + 1);
  }, []);
  const bridge = useMemo(() => ({
    close: noop,
    setFooter,
    setCloseGuard: noop,
    onMutationComplete: onSaved,
  }), [noop, onSaved, setFooter]);
  return h(PackageFamilyDrawerContent, {
    family: {
      group_id: '', label: '', description: '', platform_status: 'disabled',
      previous_platform_status: null, module_status: { overview: 'not-configured' },
      has_draft: false, sort_order: 0, assigned_service_count: 0,
      dependents: { services: 0, rate_sheet_rows: 0, tier_selections: 0 },
    },
    initialTab: 'details',
    bridge,
  });
}

const container = document.createElement('div');
document.body.appendChild(container);
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

async function settle(maxTicks = 400, quietTicks = 15) {
  let quiet = 0;
  let previous = footerCalls;
  for (let tick = 0; tick < maxTicks; tick += 1) {
    await sleep(5);
    if (footerCalls === previous) {
      quiet += 1;
      if (quiet >= quietTicks) return true;
    } else {
      quiet = 0;
      previous = footerCalls;
    }
  }
  return false;
}

const failures = [];
function check(label, condition, detail = '') {
  if (condition) console.log(`  ok — ${label}`);
  else {
    console.error(`  FAIL — ${label}${detail ? `: ${detail}` : ''}`);
    failures.push(label);
  }
}
function clickButton(text) {
  const button = [...container.querySelectorAll('button')].find((item) => item.textContent.trim() === text);
  button?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return button;
}
function clickDialogButton(text) {
  const button = [...container.querySelectorAll('.cz-publish-confirm button')]
    .find((item) => item.textContent.trim() === text);
  button?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return button;
}
function setField(selector, value) {
  const field = container.querySelector(selector);
  if (field) {
    field.value = value;
    field.dispatchEvent(new window.Event('input', { bubbles: true }));
  }
  return field;
}
function overviewModule() {
  return [...container.querySelectorAll('.drawerModule')]
    .find((item) => item.querySelector('.drawerModule__title')?.textContent.trim() === 'Family Overview') ?? null;
}

console.log('Package Family create handoff regression\n');
render(h(Harness), container);
check('mount settles', await settle());
check('new Overview opens readable', clickButton('Edit') !== null);
await sleep(10);
setField('#cz-package-family-name', 'KAIROS');
setField('#cz-package-family-description', 'Commercial family.');
await sleep(10);

clickButton('Save');
await settle();
check('failed create issued once', createCalls === 1 && failedCreates === 1, `create=${createCalls}`);
check('failed create leaves editor open', container.querySelector('#cz-package-family-name')?.value === 'KAIROS');
check('failed create preserves its error', container.textContent.includes('Deliberate create failure.'));

shouldFailCreate = false;
clickButton('Save');
check('successful create settles', await settle());
check('successful retry creates exactly once', createCalls === 2, `create=${createCalls}`);
check('authoritative native identity appears immediately', container.textContent.includes(CREATED_ID));
check('editor closes only after success', container.querySelector('#cz-package-family-name') === null);
check('Overview remains Pending', overviewModule()?.textContent.includes('Pending'));
overviewModule()?.querySelector('.cz-module-status-pill')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(10);
check('publication notification remains bound', container.textContent.includes('Waiting for Package Family publication'));
check('host refresh occurred without rewinding the identity', savedCalls === 1 && container.textContent.includes(CREATED_ID));
check('handoff never rendered a loading replacement', !container.textContent.includes('Loading Package Family'));
check('persisted footer is available in the same mount', typeof latestFooter?.props?.onPublish === 'function');

clickButton('Edit');
await sleep(10);
setField('#cz-package-family-description', 'Updated after handoff.');
await sleep(20);
clickButton('Save');
check('existing save settles', await settle());
check('post-handoff save uses the Overview endpoint', updateCalls === 1, `update=${updateCalls}`);
check('post-handoff save does not create again', createCalls === 2, `create=${createCalls}`);

latestFooter.props.onPublish();
await sleep(10);
check('Publish confirmation never exposes Create', clickDialogButton('Create') == null);
check('Publish confirmation exposes Publish', clickDialogButton('Publish') !== null);
check('Publish settles', await settle());
check('Publish settles the existing Family', settleCalls === 1, `settle=${settleCalls}`);
check('Publish activates the existing Family', activationCalls === 1, `active=${activationCalls}`);
check('Publish never calls create', createCalls === 2, `create=${createCalls}`);

if (failures.length) {
  console.error(`\nREGRESSION FAILED — ${failures.length} check(s)`);
  process.exit(1);
}
console.log('\nAll Package Family create handoff checks passed.');
