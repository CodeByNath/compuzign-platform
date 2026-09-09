// Family Tier membership boundary — mounted behavioural regression
// (project-work/2026-09-06-tier-catalogue-admin-ux-consolidation.md).
//
// The defect this locks: PackageBuilderApp passes the GLOBAL Tier vocabulary
// (`data.tiers` — all five ids) into FamilyTierAdapter, while each Family
// owns only `pricing.tiers: Partial<Record<TierId, PricingTierData>>` — the
// slots it actually occupies. The membership logic conflated those two
// layers:
//
//   filterTiersByCustomerGroup()  `pricing.tiers[id]?.audience_groups ?? [both]`
//                                 → a MISSING entry claimed both groups
//   normalOccupants               `!pricing.tiers[id]?.is_addon`
//                                 → a MISSING entry counted as a normal Tier
//
// So a global Tier slot the Family does not occupy became a phantom normal
// occupant: it could make an otherwise empty audience group look eligible for
// a customer-group tab, and it inflated normalTiers.length past 1 — which is
// exactly what suppressed the existing `singleVisibleTier` focused-shell
// fallback on the default landing. Nath's live report (one-card comparison
// instead of the focused shell, plus tabs visible for a group with no real
// primary card) is that single defect seen from both sides.
//
// Source-text assertions cannot prove this: the strings all read correctly
// on a static trace — three prior attempts at this same feature passed
// review that way and still failed live. So this mounts the REAL
// FamilyTierAdapter (esbuild + happy-dom + Preact render — the same
// technique every other mounted regression here uses) and asserts what the
// customer actually SEES: which cards render, whether the tab bar exists,
// and whether the focused shell is the landing view.
//
// Usage: npm run regression:family-tier-membership-boundary
//    or: node scripts/family-tier-membership-boundary-regression.mjs

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-family-tier-membership-bundle.mjs');
mkdirSync(dirname(outFile), { recursive: true });

// ── DOM shim ─────────────────────────────────────────────────────────────
const window = new Window({ url: 'https://cz-test.local/' });
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.MouseEvent = window.MouseEvent;
globalThis.HTMLElement = window.HTMLElement;
globalThis.HTMLInputElement = window.HTMLInputElement;
globalThis.Node = window.Node;
globalThis.localStorage = window.localStorage;
globalThis.IntersectionObserver = window.IntersectionObserver;
globalThis.ResizeObserver = window.ResizeObserver;
globalThis.MutationObserver = window.MutationObserver;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

window.CompuZignConfig = { apiRoot: 'https://cz-test.local/wp-json/compuzign/v1/', nonce: 'test-nonce' };

await build({
  entryPoints: [resolve(root, 'resources/ts/components/package-builder/FamilyTierAdapter.tsx')],
  bundle: true,
  format: 'esm',
  outfile: outFile,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  alias: { '@': resolve(root, 'resources/ts') },
  external: ['preact', 'preact/hooks', 'preact/jsx-runtime'],
  logLevel: 'silent',
});

const { FamilyTierAdapter } = await import(pathToFileURL(outFile).href);
const { h, render } = await import('preact');

const container = document.createElement('div');
document.body.appendChild(container);

const failures = [];
function check(label, cond, detail) {
  if (cond) { console.log(`  ok — ${label}`); }
  else { console.error(`  FAIL — ${label}${detail !== undefined ? `: ${detail}` : ''}`); failures.push(label); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The GLOBAL Tier vocabulary — every Family is handed all five ids, exactly
// as PackageBuilderApp hands over `data.tiers`. Which of these a Family
// actually occupies is decided ONLY by its own pricing.tiers entries below.
const GLOBAL_TIERS = [
  { id: 'basic', title: 'Basic' },
  { id: 'standard', title: 'Standard' },
  { id: 'premium', title: 'Premium' },
  { id: 'enterprise', title: 'Enterprise' },
  { id: 'ultimate', title: 'Ultimate' },
];

function occupant(overrides = {}) {
  return {
    tier_occupant_id: `occ_${Math.random().toString(36).slice(2, 8)}`,
    tier_platform_id: 'CZT-TEST0001',
    price: 50, billing_cycle: 'monthly', inclusions: [], features: [],
    is_addon: false, ...overrides,
  };
}

function mount(pricingTiers) {
  render(null, container);
  render(h(FamilyTierAdapter, {
    family: {
      family_id: 'pcg_test', family_platform_id: 'CZPG-TEST0001', title: 'Test Family',
      description: '', tier_instance_id: 'ti_test', tier_instance_platform_id: 'CZTG-TEST0001',
      popular_tier: null, popular_label: null, included_categories: [],
      pricing: { tiers: pricingTiers },
    },
    tiers: GLOBAL_TIERS,
    selectedTierId: null,
    selectedTierEditionPlatformId: null,
    selectedAddonItems: [],
    onAdd: () => {},
    onRemovePrimary: () => {},
    onRemoveAddon: () => {},
    selectedComposableItem: null,
    onComposableCommit: () => {},
    onComposableRemove: () => {},
    selectedPrimaryItem: null,
    onFocusedShellActiveChange: () => {},
    manageBuildRequest: null,
    onManageBuildConsumed: () => {},
  }), container);
}

const tabsShown = () => container.querySelector('.cz-package-builder__customer-tabs') !== null;
const tabLabels = () => [...container.querySelectorAll('.cz-package-builder__customer-tab')].map((b) => b.textContent.trim());
const focusedShown = () => container.querySelector('.cz-package-builder__focused') !== null;
const focusedName = () => container.querySelector('.cz-package-builder__focused-name')?.textContent.trim() ?? null;
const gridCardNames = () => [...container.querySelectorAll('.cz-cost-builder__tier-name')].map((el) => el.textContent.trim());

console.log('FamilyTierAdapter — Family membership boundary (global Tier vocabulary vs. this Family\'s occupancy)\n');

// ── 1. PB-only single Tier ──────────────────────────────────────────────
console.log('1) Personal & Business-only single Tier — four global slots the Family does not occupy');
mount({ basic: occupant({ audience_groups: ['personal_business'] }) });
await sleep(20);
check('no customer-group tabs — the opposite group has no real primary Tier', !tabsShown(), tabLabels().join('|'));
check('lands directly in the focused shell, not a one-card comparison', focusedShown(), `focused=${focusedShown()} gridCards=${gridCardNames().join('|')}`);
check('the focused shell is the Family\'s one real occupant', focusedName() === 'Basic', focusedName());
check('the four unoccupied global slots render no cards of their own', gridCardNames().length === 0, gridCardNames().join('|'));

// ── 2. Enterprise-only single Tier ──────────────────────────────────────
console.log('\n2) Enterprise-only single Tier — the mirror case, landing group resolves to the non-default side');
mount({ premium: occupant({ audience_groups: ['enterprise'] }) });
await sleep(20);
check('no customer-group tabs', !tabsShown(), tabLabels().join('|'));
check('lands directly in the focused shell', focusedShown(), `focused=${focusedShown()} gridCards=${gridCardNames().join('|')}`);
check('resolves to the Enterprise group rather than the empty Personal & Business default', focusedName() === 'Premium', focusedName());

// ── 3. Opposite group is genuinely empty (occupied slots, one audience) ──
console.log('\n3) Empty opposite group — the Family occupies several slots, all in ONE audience');
mount({
  basic: occupant({ audience_groups: ['personal_business'] }),
  standard: occupant({ audience_groups: ['personal_business'] }),
});
await sleep(20);
check('no tabs — Enterprise has no real primary Tier to land on', !tabsShown(), tabLabels().join('|'));
check('two real occupants compare as a grid, no focused fallback', !focusedShown() && gridCardNames().length === 2, `focused=${focusedShown()} gridCards=${gridCardNames().join('|')}`);
check('the grid shows exactly the two occupied slots', gridCardNames().join(',') === 'Basic,Standard', gridCardNames().join(','));

// ── 4. Opposite group contains ONLY Add-ons ─────────────────────────────
console.log('\n4) Opposite group contains only Add-ons — an Add-on is not a primary Tier to land on');
mount({
  basic: occupant({ audience_groups: ['personal_business'] }),
  premium: occupant({ audience_groups: ['enterprise'], is_addon: true }),
});
await sleep(20);
check('no tabs — an Add-on never makes its group look like a real choice', !tabsShown(), tabLabels().join('|'));
check('still lands in the focused shell on the one real primary Tier', focusedShown() && focusedName() === 'Basic', `focused=${focusedShown()} name=${focusedName()}`);

// ── 5. Both groups have real primary Tiers ──────────────────────────────
console.log('\n5) Both groups have a real primary Tier — the tab bar is a genuine choice and must render');
mount({
  basic: occupant({ audience_groups: ['personal_business'] }),
  standard: occupant({ audience_groups: ['personal_business'] }),
  premium: occupant({ audience_groups: ['enterprise'] }),
});
await sleep(20);
check('the customer-group tab bar renders', tabsShown());
check('both groups are offered', tabLabels().join(',') === 'Personal & Business,Enterprise', tabLabels().join(','));
check('lands on Personal & Business, comparing only that group\'s two occupants', gridCardNames().join(',') === 'Basic,Standard', gridCardNames().join(','));
check('the Enterprise-only occupant is not in the landing grid', !gridCardNames().includes('Premium'), gridCardNames().join(','));

// ── 6. The phantom case: unoccupied global slots must not inflate counts ─
console.log('\n6) Global Tier slots absent from the Family — the phantom-occupant defect itself');
// ONE real occupant, narrowed to a single audience, and four global slots
// the Family never occupies. Before the fix those four missing entries were
// each read as "belongs to both groups" (`?.audience_groups ?? [both]`) AND
// "not an add-on" (`!?.is_addon`), producing five phantom normal occupants:
// the empty Enterprise side looked populated so the tab bar rendered, and
// normalTiers.length was 5 rather than 1, so the single-Tier focused
// fallback never fired and the customer got the one-card comparison Nath
// reported. The occupant is deliberately audience-narrowed here so this
// scenario isolates ABSENCE — scenario 7 below separately proves a real
// entry with no audience_groups still defaults to both groups.
mount({ standard: occupant({ audience_groups: ['personal_business'] }) });
await sleep(20);
check('the four unoccupied slots do not make the empty Enterprise group look populated — no tabs', !tabsShown(), tabLabels().join('|'));
check('normalTiers is not inflated by missing entries — the single-Tier focused shell fires', focusedShown(), `focused=${focusedShown()} gridCards=${gridCardNames().join('|')}`);
check('the focused shell is the one genuinely occupied slot', focusedName() === 'Standard', focusedName());
check('no phantom card renders for an unoccupied global slot', gridCardNames().length === 0, gridCardNames().join('|'));

// A real entry with no audience_groups still defaults to both groups — the
// unset-audience default is preserved for OCCUPANTS, only absence changed.
console.log('\n7) An occupant that never configures audience_groups still appears under both groups');
mount({
  standard: occupant(),
  premium: occupant({ audience_groups: ['enterprise'] }),
});
await sleep(20);
check('tabs render — the never-configured occupant genuinely populates both groups', tabsShown(), tabLabels().join('|'));
check('the Personal & Business landing shows only the never-configured occupant, focused as its single Tier', focusedShown() && focusedName() === 'Standard', `focused=${focusedShown()} name=${focusedName()}`);

console.log('');
if (failures.length > 0) {
  console.error(`REGRESSION FAILED — ${failures.length} check(s) did not hold:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('All checks passed — Family occupancy is resolved before audience/focus, and unoccupied global Tier slots reach no count, tab, or card.');
process.exit(0);
