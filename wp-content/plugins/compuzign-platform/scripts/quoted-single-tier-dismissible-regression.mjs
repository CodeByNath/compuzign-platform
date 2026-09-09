// Quoted single-Tier focused shell is dismissible — mounted behavioural
// regression (project-work/2026-09-06-tier-catalogue-admin-ux-consolidation.md).
//
// The single-Tier landing rule used to be unconditional: exactly one real
// primary Tier in the customer group meant the focused shell was that group's
// PERMANENT presentation, with no Close button at all. That is right while the
// Tier is unquoted — dismissing it would drop the customer on an orphan
// one-card grid (a real reported defect in an earlier version). It is wrong
// once that Tier is the quoted primary: the customer then has a Cart line and
// a real card to return to, so the ordinary sticky X must work.
//
// Two states, distinguished by whether the single Tier is the selected primary:
//
//   locked implicit landing  one real primary, NOT quoted  -> auto-focus, no X
//   quoted single-Tier view  that Tier IS the primary      -> focused + sticky X
//
// The subtle part, and the reason this is a mounted test rather than a source
// assertion: the focused shell is produced by a RENDER-TIME fallback, so
// pressing X clears focusedTierId and the very next render would re-derive the
// same fallback and reopen the shell — X would look broken. The dismissal is
// therefore recorded against the exact quoted TierId and honoured at the
// fallback itself, and it must expire by derivation when the primary is
// removed or swapped.
//
// Usage: npm run regression:quoted-single-tier-dismissible
//    or: node scripts/quoted-single-tier-dismissible-regression.mjs

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-quoted-single-tier-bundle.mjs');
mkdirSync(dirname(outFile), { recursive: true });

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
const { useState } = await import('preact/hooks');

const container = document.createElement('div');
document.body.appendChild(container);

const failures = [];
function check(label, cond, detail) {
  if (cond) { console.log(`  ok — ${label}`); }
  else { console.error(`  FAIL — ${label}${detail !== undefined ? `: ${detail}` : ''}`); failures.push(label); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function click(el) { el?.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); await sleep(30); }

// Global Tier vocabulary; this Family occupies exactly ONE of these slots.
const GLOBAL_TIERS = [
  { id: 'basic', title: 'Basic' },
  { id: 'standard', title: 'Standard' },
  { id: 'premium', title: 'Premium' },
];

const EDITION_PLATFORM_ID = 'CZTE-STD00002';
const FAMILY = {
  family_id: 'pcg_solo', family_platform_id: 'CZPG-SOLO0001', title: 'Solo Family',
  description: '', tier_instance_id: 'ti_solo', tier_instance_platform_id: 'CZTG-SOLO0001',
  popular_tier: null, popular_label: null, included_categories: [],
  pricing: {
    tiers: {
      // One normal occupant, no add-ons, no composable offer — so Add to
      // Quote stages nothing and the render-time single-Tier fallback is the
      // only thing that can produce the focused shell.
      standard: {
        tier_occupant_id: 'occ_standard', tier_platform_id: 'CZT-SOLO0001',
        price: 50, billing_cycle: 'monthly', inclusions: [], features: [],
        is_addon: false, label: 'Standard Plan',
        edition_options: [{
          id: 'ed_pro', label: 'Pro Edition', price: 90, contact: false,
          billing_cycle: 'monthly', minimum_term_value: null, minimum_term_unit: null,
          inclusions_override: [], edition_platform_id: EDITION_PLATFORM_ID,
        }],
      },
    },
  },
};

// Stand-in for PackageBuilderApp's own cart ownership: the adapter never
// stores the primary itself, it reports upward and re-reads props.
let shellActive = null;
function Harness() {
  const [primary, setPrimary] = useState(null);
  return h(FamilyTierAdapter, {
    family: FAMILY,
    tiers: GLOBAL_TIERS,
    selectedTierId: primary?.tierId ?? null,
    selectedTierEditionPlatformId: primary?.tierEditionPlatformId ?? null,
    selectedAddonItems: [],
    onAdd: (item) => { if (!item.isAddon) setPrimary(item); },
    onRemovePrimary: () => setPrimary(null),
    onRemoveAddon: () => {},
    selectedComposableItem: null,
    onComposableCommit: () => {},
    onComposableRemove: () => {},
    selectedPrimaryItem: primary,
    onFocusedShellActiveChange: (active) => { shellActive = active; },
    manageBuildRequest: null,
    onManageBuildConsumed: () => {},
  });
}

const focused = () => container.querySelector('.cz-package-builder__focused') !== null;
const focusedName = () => container.querySelector('.cz-package-builder__focused-name')?.textContent.trim() ?? null;
const closeBtn = () => container.querySelector('.cz-package-builder__focused-close');
const gridNames = () => [...container.querySelectorAll('.cz-cost-builder__tier-name')].map((el) => el.textContent.trim());
const actionBtn = () => container.querySelector('.cz-cost-builder__tier-action');
const actionLabel = () => actionBtn()?.textContent.trim() ?? null;
const byText = (t) => [...container.querySelectorAll('button')].find((b) => b.textContent.trim() === t);
const cueTarget = (label) => [...container.querySelectorAll('.cz-package-builder__cue-target')]
  .find((b) => b.getAttribute('aria-label') === label);

console.log('Quoted single-Tier focused shell — dismissible once quoted, locked before\n');

render(h(Harness), container);
await sleep(30);

// ── 1. Unquoted: locked landing ─────────────────────────────────────────
console.log('1) Unquoted single Tier — the locked implicit landing is unchanged');
check('lands automatically in the focused shell', focused(), `focused=${focused()}`);
check('no Close button — dismissing would orphan the customer on a one-card grid', closeBtn() === null);
check('the shell is the Family\'s one occupant', focusedName() === 'Standard Plan', focusedName());
check('the shell reports itself active, so the Cart/sidebar collapses as before', shellActive === true, shellActive);

// ── 2. Quote it, on a specific Edition ──────────────────────────────────
console.log('\n2) Quoted single Tier — the sticky X returns');
await click(cueTarget('Pro Edition'));
check('switched the focused shell to the Pro Edition before quoting', focusedName() === 'Pro Edition', focusedName());
await click(actionBtn());
check('still in the focused shell after Add to Quote', focused(), `focused=${focused()}`);
check('the Close (X) button is now offered', closeBtn() !== null);
// PRE-EXISTING, not introduced here: commitSelection() clears focusedEditionId,
// so the fallback re-derives this shell on the Tier Default even though the
// Cart holds the Pro Edition. Asserted as-is to pin current behaviour — the
// dismissal work does not change it, and the quoted Edition identity is still
// exact on the card and on reopen (steps 3 and 4).
check('the shell re-derives on the Tier Default after Add to Quote (pre-existing)', focusedName() === 'Standard Plan', focusedName());

// ── 3. X dismisses to the normal card, Cart stays visible ───────────────
console.log('\n3) X exits focused mode without bouncing back');
await click(closeBtn());
check('the focused shell is gone — the render-time fallback did NOT immediately reopen it', !focused(), `focused=${focused()}`);
check('the single Tier is revealed as exactly one normal customer-group card', gridNames().length === 1, gridNames().join(','));
// The card renders the exact quoted Edition, not the Tier Default — the
// quoted-state identity the customer chose is what they see on the card.
check('that card carries the exact quoted Edition identity', gridNames()[0] === 'Pro Edition', gridNames()[0]);
check('the shell reports itself inactive, so the Cart remains visible beside the card', shellActive === false, shellActive);
check('the card keeps its quoted state', actionLabel() === '✓ Selected', actionLabel());
check('the quoted card offers View Plan back into the shell', byText('View Plan') !== undefined);

// ── 4. View Plan reopens the exact quoted Edition ───────────────────────
console.log('\n4) View Plan reopens the same quoted Edition identity');
await click(byText('View Plan'));
check('the focused shell reopens', focused(), `focused=${focused()}`);
check('it reopens on the quoted Pro Edition, not the Tier Default', focusedName() === 'Pro Edition', focusedName());
check('X is still offered while quoted', closeBtn() !== null);

// ── 5. Dismissal persists while quoted, across repeat cycles ────────────
console.log('\n5) The dismissal persists while that same Tier stays quoted');
await click(closeBtn());
check('closing again lands on the card again, still no bounce-back', !focused() && gridNames().length === 1, `focused=${focused()} cards=${gridNames().join(',')}`);

// ── 6. Removing the primary restores the locked landing ─────────────────
console.log('\n6) Removing the primary restores the original locked landing');
await click(actionBtn()); // active card's action toggles removal
check('auto-focused landing is restored', focused(), `focused=${focused()}`);
check('the Close button is withdrawn again — back to the locked rule', closeBtn() === null);
check('it lands on the Tier Default, not the previously quoted Edition', focusedName() === 'Standard Plan', focusedName());
check('the shell reports itself active again', shellActive === true, shellActive);

// ── 7. The resurrection case: a stale dismissal must be CLEARED ─────────
console.log('\n7) Re-quoting the same Tier gets a fresh shell — no resurrected dismissal');
// Deriving validity against selectedTierId alone only makes the stored id
// DORMANT while the primary is absent. If it is not genuinely cleared, quoting
// the SAME Tier again re-matches the stored id and wrongly suppresses the
// fresh quoted focused shell — the customer is stranded on the card with no
// way back in. Steps 1-6 above all pass with the dormant-only version, which
// is exactly why this scenario exists.
check('precondition — locked landing with no X after removal', focused() && closeBtn() === null, `focused=${focused()} close=${closeBtn() !== null}`);
await click(actionBtn()); // re-quote the SAME Tier
check('re-quoting the same Tier lands in the focused shell again', focused(), `focused=${focused()}`);
check('the X is offered again — the earlier dismissal did not resurrect', closeBtn() !== null);
await click(closeBtn());
check('X still works after the re-quote, landing on the quoted card', !focused() && gridNames().length === 1, `focused=${focused()} cards=${gridNames().join(',')}`);
check('the Cart is visible beside it again', shellActive === false, shellActive);

console.log('');
if (failures.length > 0) {
  console.error(`REGRESSION FAILED — ${failures.length} check(s) did not hold:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('All checks passed — locked before quote, dismissible after, and the dismissal expires with the primary.');
process.exit(0);
