// Cost Builder Category vs Package Family grouping — mounted regression.
//
// Proves, by actually mounting the REAL CostBuilderApp composition (esbuild +
// happy-dom + Preact render, same technique as
// scripts/service-create-handoff-regression.mjs) rather than source-string
// assertions:
//
//   1. groupBy="category" (the default, [compuzign_cost_builder]) groups by
//      Service Category exactly as before, listing every Service in a shared
//      category regardless of Family.
//   2. groupBy="family" groups the SAME Services by their own already-
//      resolved Family, and switching Family actually filters which Service
//      is shown (not just relabels the same list).
//   3. Selecting the SAME Service + Tier in either mode reaches the same
//      ServiceCard/PricingTiers DOM and produces a byte-identical cart line —
//      the grouping lens has no bearing on Tier/pricing/cart behaviour.
//
// Usage: npm run regression:cost-builder-package-family-mount
//    or: node scripts/cost-builder-package-family-mount-regression.mjs

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-cost-builder-family-mount-bundle.mjs');
mkdirSync(dirname(outFile), { recursive: true });

// ── DOM shim ─────────────────────────────────────────────────────────────
const window = new Window({ url: 'https://cz-test.local/' });
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.MouseEvent = window.MouseEvent;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Node = window.Node;
globalThis.localStorage = window.localStorage;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
// CategoryNav's sticky-nav effect only needs the constructor to exist; it
// never needs a real intersection callback in this harness.
globalThis.IntersectionObserver = class {
  observe() {}
  disconnect() {}
};

window.CompuZignConfig = { apiRoot: 'https://cz-test.local/wp-json/compuzign/v1/', nonce: 'test-nonce' };

// ── Fixture — one Category holding two Services, each in its own Family ───
const TIERS = [
  { id: 'basic', title: 'Basic' },
  { id: 'standard', title: 'Standard' },
  { id: 'premium', title: 'Premium' },
  { id: 'enterprise', title: 'Enterprise' },
  { id: 'ultimate', title: 'Ultimate' },
];

function basicTierData() {
  return {
    price: 49, billing_cycle: 'monthly',
    inclusions: [{ id: 'inc', label: 'Core feature' }], features: ['Core feature'],
    is_addon: false, edition_options: [], minimum_term_value: null, minimum_term_unit: null,
  };
}

function service(id, title, slug, family) {
  return {
    id, title, slug, excerpt: '', content: '',
    categories: [{ id: 1, name: 'Compute', slug: 'compute' }],
    inclusions: [{ id: 'inc', label: 'Core feature' }],
    faqs: [],
    availability: { is_available: true, message: '' },
    meta: {
      platform_status: 'active', previous_platform_status: '',
      module_status: { overview: 'settled', inclusions: 'settled', faqs: 'settled' },
      short_description: '', long_description: '', billing_cycle: 'monthly',
      sla: '', uptime: '', notes: '', popular_tier: null, popular_label: null, sort_order: 0,
    },
    pricing: { tiers: { basic: basicTierData() }, bundle: { title: '', description: '', price: null } },
    promotion_tiers: [],
    family,
  };
}

const serviceA = service(201, 'KAIROS Service', 'kairos-service', { id: 'pcg_kairos', label: 'KAIROS', sort_order: 0 });
const serviceB = service(202, 'APTOS Service', 'aptos-service', { id: 'pcg_aptos', label: 'APTOS', sort_order: 1 });

const FIXTURE = {
  categories: [{ id: 1, name: 'Compute', slug: 'compute' }],
  tiers: TIERS,
  services_by_category: [
    { category_id: 1, category_name: 'Compute', category_slug: 'compute', services: [serviceA, serviceB] },
  ],
  package_families: [
    { id: 'pcg_kairos', label: 'KAIROS', sort_order: 0 },
    { id: 'pcg_aptos', label: 'APTOS', sort_order: 1 },
  ],
};

globalThis.fetch = (url) => {
  const path = String(url);
  if (path.endsWith('/compuzign/v1/cost-builder')) {
    return Promise.resolve({
      ok: true, status: 200,
      json: () => Promise.resolve(FIXTURE),
      text: () => Promise.resolve(JSON.stringify(FIXTURE)),
    });
  }
  return Promise.reject(new Error(`Unexpected fetch in regression harness: ${path}`));
};

// ── Bundle the REAL component ───────────────────────────────────────────
await build({
  entryPoints: [resolve(root, 'resources/ts/components/cost-builder/CostBuilderApp.tsx')],
  bundle: true,
  format: 'esm',
  outfile: outFile,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  alias: { '@': resolve(root, 'resources/ts') },
  external: ['preact', 'preact/hooks', 'preact/jsx-runtime'],
  logLevel: 'silent',
});

const { CostBuilderApp } = await import(pathToFileURL(outFile).href);
const { h, render } = await import('preact');

// ── Harness helpers ─────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const failures = [];
function check(label, cond, detail) {
  if (cond) {
    console.log(`  ok — ${label}`);
  } else {
    console.error(`  FAIL — ${label}${detail ? `: ${detail}` : ''}`);
    failures.push(label);
  }
}

function cardTitle(container) {
  return container.querySelector('.cz-cost-builder__card-meta h3')?.textContent.trim() ?? null;
}
function groupTabLabels(container) {
  return [...container.querySelectorAll('.cz-chip[role="tab"]')].map((b) => b.textContent.trim());
}
function clickGroupTab(container, text) {
  const btn = [...container.querySelectorAll('.cz-chip[role="tab"]')].find((b) => b.textContent.trim() === text);
  btn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return btn;
}
function clickFirstTierAction(container) {
  const btn = container.querySelector('.cz-cost-builder__tier-action');
  btn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return btn;
}
function readCartItems() {
  const raw = window.localStorage.getItem('compuzign_quote_cart_v1');
  if (!raw) return null;
  return JSON.parse(raw).items;
}
function clearCartAndDom() {
  window.localStorage.removeItem('compuzign_quote_cart_v1');
}

console.log('Cost Builder Category vs Package Family mounted regression\n');

// ── 1) Category mode (the default, [compuzign_cost_builder]) ──────────────
console.log('1) groupBy="category" — existing Service Category behaviour');
const containerCategory = document.createElement('div');
document.body.appendChild(containerCategory);
render(h(CostBuilderApp, { groupBy: 'category' }), containerCategory);
await sleep(50);

check('the single shared category groups both Services under one tab', groupTabLabels(containerCategory).join(',') === 'Compute',
  groupTabLabels(containerCategory).join(','));
check('the subnav lists both Services under the shared category',
  [...containerCategory.querySelectorAll('.cz-sub-tab')].length === 2);
check('the first Service (KAIROS) is selected by default', cardTitle(containerCategory) === 'KAIROS Service', cardTitle(containerCategory));

const categoryTierBtn = clickFirstTierAction(containerCategory);
check('the Tier action button is present', categoryTierBtn != null);
await sleep(20);
const categoryModeItems = readCartItems();
check('selecting a Tier in Category mode adds exactly one cart line', Array.isArray(categoryModeItems) && categoryModeItems.length === 1,
  JSON.stringify(categoryModeItems));

clearCartAndDom();

// ── 2) Family mode (the new [compuzign_package_builder]) ──────────────────
console.log('\n2) groupBy="family" — new Package Family grouping, same CostBuilderApp');
const containerFamily = document.createElement('div');
document.body.appendChild(containerFamily);
render(h(CostBuilderApp, { groupBy: 'family' }), containerFamily);
await sleep(50);

check('both Package Families appear as group tabs, ordered by sort_order', groupTabLabels(containerFamily).join(',') === 'KAIROS,APTOS',
  groupTabLabels(containerFamily).join(','));
check('KAIROS (sort_order 0) is the default active Family', cardTitle(containerFamily) === 'KAIROS Service', cardTitle(containerFamily));
check('a Family with exactly one Service renders no subnav (unlike the shared Category above)',
  containerFamily.querySelector('.cz-cost-builder__subnav') === null);

const familyTierBtn = clickFirstTierAction(containerFamily);
check('the same Tier action button is present in Family mode (same ServiceCard/PricingTiers, not a second Tier UI)', familyTierBtn != null);
await sleep(20);
const familyModeItems = readCartItems();
check('selecting the same Tier in Family mode adds exactly one cart line', Array.isArray(familyModeItems) && familyModeItems.length === 1,
  JSON.stringify(familyModeItems));

check(
  'the SAME Service + Tier selection produces a byte-identical cart line in both grouping modes',
  JSON.stringify(categoryModeItems) === JSON.stringify(familyModeItems),
  `category=${JSON.stringify(categoryModeItems)} family=${JSON.stringify(familyModeItems)}`,
);

// ── 3) Changing Family actually filters which Service is shown ────────────
console.log('\n3) Family selection filters to only that Family\'s own Services');
clickGroupTab(containerFamily, 'APTOS');
await sleep(20);
check('switching to APTOS shows only the APTOS Service, not KAIROS', cardTitle(containerFamily) === 'APTOS Service', cardTitle(containerFamily));
check('APTOS Service does not carry KAIROS\'s Tier selection (cart identity is per-Service, not per-group)',
  containerFamily.querySelector('.cz-cost-builder__tier-action.is-selected') === null);

console.log('');
if (failures.length > 0) {
  console.error(`REGRESSION FAILED — ${failures.length} check(s) did not hold:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('All checks passed — Category and Family grouping share the identical downstream Cost Builder body.');
process.exit(0);
