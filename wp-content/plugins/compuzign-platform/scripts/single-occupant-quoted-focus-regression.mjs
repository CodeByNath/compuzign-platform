// Single occupant focused state after quote
// (project-work/2026-09-11-single-occupant-focused-after-quote.md).
//
// Nath's rule, as accepted live:
//   single occupant + NOT yet quoted -> the focused shell IS the landing,
//     locked (no X), Cart suppressed;
//   globally lone occupant + quoted -> the SAME shell stays, still with no
//     X, and the Cart appears alongside it.
// Cart visibility itself is now resolved from the navigation step rather
// than from lone-Family qualification — see
// tier-next-step-navigation-regression.mjs, which owns that matrix; this
// script stays focused on WHICH SHELL a single occupant gets and whether its
// X exists and works.
//
// This mounts the REAL FamilyTierAdapter through happy-dom + Preact's own
// render(), bundled with vite's own esbuild. That matters more here than
// anywhere else in this repo: the single-Tier auto-focus feature has failed
// live three times off static reasoning alone, and every existing contract
// covering it asserts source text rather than behaviour, on the stated
// assumption that this component "carries too much live-fetched state to
// instantiate standalone". That assumption turns out to be false — its props
// are plain data plus callbacks, with no context provider and no fetch on the
// paths exercised here — so this script asserts what actually renders.
//
// Worth recording, because it is exactly the trap that static reading misses:
// mounting FRESH with selectedTierId already set does NOT reproduce the
// defect. stagedTierId is seeded from selectedTierId, so stagedTier is
// non-null and the fallback's own `stagedTier === null` guard suppresses it.
// The defect only appears through the real in-session transition, where
// commitSelection() clears stagedTierId to null for a Family with no add-ons
// and no Upgrade catalogue. Every scenario below therefore DRIVES the
// component (real clicks, parent state updating like the real app's) instead
// of rendering an assumed end state.
//
// Usage: npm run regression:single-occupant-quoted-focus

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-single-occupant-focus-bundle.mjs');
mkdirSync(dirname(outFile), { recursive: true });

const window = new Window({ url: 'https://cz-test.local/' });
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.HTMLElement = window.HTMLElement;
globalThis.Node = window.Node;
globalThis.MouseEvent = window.MouseEvent;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
// The paths exercised here perform no network I/O; a call would be a defect.
globalThis.fetch = () => Promise.reject(new Error('unexpected fetch in regression harness'));

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

let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) throw new Error(`Single occupant quoted focus: ${message}`);
}

// ── Fixtures ─────────────────────────────────────────────────────────────

function occupant(partial) {
  return {
    tier_occupant_id: 'occ_solo',
    tier_platform_id: 'CZT-SOLO00001',
    label: 'Solo Plan',
    price: 100,
    billing_cycle: 'monthly',
    is_addon: false,
    customer_group: 'personal_business',
    features: ['Everything included'],
    inclusions: [],
    editions: [],
    commercial_legs: [],
    ...partial,
  };
}

function familyWith(tiers, extra = {}) {
  return {
    family_id: 'pcg_solo',
    family_platform_id: 'CZPG-SOLO0001',
    title: 'SOLO',
    description: '',
    tier_instance_id: 'ti_solo',
    tier_instance_platform_id: 'CZTG-SOLO0001',
    popular_tier: null,
    popular_label: null,
    included_categories: [],
    pricing: { tiers, ...extra },
  };
}

const soloFamily = familyWith({ basic: occupant({}) });
const TIER_VOCAB = [
  { id: 'basic', title: 'Basic' },
  { id: 'standard', title: 'Standard' },
  { id: 'premium', title: 'Premium' },
];

// ── Harness: the parent owns cart state, exactly as PackageBuilderApp does ──

const container = document.createElement('div');
document.body.appendChild(container);

// The harness mirrors PackageBuilderApp's OWN Cart-visibility rule verbatim —
// `items.length > 0 && !quoteSuppressedByShell` — rather than a no-op
// callback. An earlier revision of this script passed a no-op there, which is
// exactly why it could report "the Cart appears alongside" while the real app
// still hid it: FamilyTierAdapter reported a shell was open, and the parent
// hid the Cart for every open shell. Cart VISIBILITY is a parent-boundary
// fact, so it is asserted at that boundary here.
function mount(family, tierVocab = [TIER_VOCAB[0]]) {
  const calls = { added: [], removedPrimary: 0 };
  function Harness() {
    const [selectedTierId, setSelectedTierId] = useState(null);
    const [primaryItem, setPrimaryItem] = useState(null);
    const [addonItems, setAddonItems] = useState([]);
    const [quoteSuppressedByShell, setQuoteSuppressedByShell] = useState(false);
    const items = [primaryItem, ...addonItems].filter(Boolean);
    // PackageBuilderApp.tsx's own expression, copied exactly.
    const hasVisibleQuote = items.length > 0 && !quoteSuppressedByShell;
    return h('div', { class: hasVisibleQuote ? 'cz-cost-builder--has-quote' : '' }, [
      hasVisibleQuote ? h('aside', { key: 'cart', class: 'cz-harness-cart' }, `Cart: ${items.length}`) : null,
      h(FamilyTierAdapter, {
      family,
      tiers: tierVocab,
      selectedTierId,
      selectedTierEditionPlatformId: primaryItem?.tierEditionPlatformId ?? null,
      selectedAddonItems: addonItems,
      onAdd: (item) => {
        calls.added.push(item);
        if (item.isAddon) { setAddonItems((prev) => [...prev, item]); return; }
        setPrimaryItem(item);
        setSelectedTierId(item.tierId);
      },
      onRemovePrimary: () => { calls.removedPrimary += 1; setPrimaryItem(null); setSelectedTierId(null); },
      onRemoveAddon: (tierPlatformId) => setAddonItems((prev) => prev.filter((a) => a.tierPlatformId !== tierPlatformId)),
      selectedComposableItem: null,
      onComposableCommit: () => {},
      onComposableRemove: () => {},
      selectedPrimaryItem: primaryItem,
      onQuoteSuppressedChange: setQuoteSuppressedByShell,
      manageBuildRequest: null,
      onManageBuildConsumed: () => {},
      key: 'adapter',
      }),
    ]);
  }
  render(null, container);
  render(h(Harness, {}), container);
  return calls;
}

const settle = () => new Promise((r) => setTimeout(r, 20));

function buttons() {
  return [...container.querySelectorAll('button')];
}
function buttonWithText(text) {
  return buttons().find((b) => b.textContent.trim() === text) ?? null;
}
async function click(el) {
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await settle();
}

function view() {
  const html = container.innerHTML;
  return {
    html,
    focusedShell: html.includes('cz-package-builder__focused-name'),
    closeX: !!container.querySelector('.cz-package-builder__focused-close'),
    quotedCardViewPlan: !!buttonWithText('View Plan'),
    selectedMarker: !!buttonWithText('✓ Selected'),
    addToQuote: !!buttonWithText('Add to Quote'),
    cartVisible: !!container.querySelector('.cz-harness-cart'),
    cartText: container.querySelector('.cz-harness-cart')?.textContent ?? null,
  };
}

// ── 1. Single unquoted occupant auto-focuses, with no Close ──────────────

mount(soloFamily);
await settle();
{
  const v = view();
  check(v.focusedShell, 'an unquoted single occupant lands directly in the focused shell');
  check(!v.closeX, 'the unquoted single-occupant landing has no Close X — dismissing it would fall through to an orphan one-card grid');
  check(v.addToQuote, 'the unquoted landing offers Add to Quote');
  check(!v.cartVisible, 'Cart is hidden before Add to Quote — nothing is in it for this Family yet');
}

// ── 2. Quoting it KEEPS the focused shell, still with no X ──────────────
//
// The alone occupant's rule: there is nothing else in this Family to show,
// so the shell is the whole experience and the Cart simply appears beside it.
// The reported defect was the sticky X on that state, not the shell itself.
// Reproduces ONLY through this real transition — see the note at the top.

await click(buttonWithText('Add to Quote'));
{
  const v = view();
  check(v.focusedShell, 'an alone occupant stays in the focused shell once quoted — there is nothing else to show');
  check(!v.closeX, 'and the sticky X is gone: no destination sits behind it, so the customer is never asked to dismiss it');
  check(!v.quotedCardViewPlan, 'no small quoted card is rendered for an alone occupant — the shell is the presentation');
  // The assertion the previous revision of this script could not make.
  check(v.cartVisible, 'the Cart becomes VISIBLE alongside the still-open focused shell — the parent-boundary fact, not just cart state');
  check(v.cartText === 'Cart: 1', `the Cart holds the quoted line (got ${v.cartText})`);
}

// ── 3. Removing the quoted primary keeps the same locked landing ────────

await click(buttonWithText('✓ Selected') ?? buttonWithText('Remove from Quote') ?? buttonWithText('Add to Quote'));
{
  const v = view();
  check(v.focusedShell, 'removing the primary leaves the alone occupant in its focused landing');
  check(!v.closeX, 'still no X');
  check(!v.cartVisible, 'and the Cart hides again once the quote is removed, while the shell remains');
}

// Re-quoting the same Tier behaves identically on a second cycle — no stale
// state changes the outcome either way.
await click(buttonWithText('Add to Quote'));
{
  const v = view();
  check(v.focusedShell, 're-quoting the same Tier keeps the focused shell on a second cycle');
  check(!v.closeX, 'and still shows no X');
  check(v.cartVisible, 'and the Cart returns alongside it');
}

// ── 6. Families with 2+ normal occupants are unchanged ──────────────────

const multiFamily = familyWith({
  basic: occupant({}),
  standard: occupant({ tier_occupant_id: 'occ_std', tier_platform_id: 'CZT-SOLO00002', label: 'Standard Plan' }),
});
mount(multiFamily, TIER_VOCAB);
await settle();
{
  const v = view();
  check(!v.focusedShell, 'a Family with two normal occupants still lands on the comparison grid, never an implicit focused shell');
  check(buttons().filter((b) => b.textContent.trim() === 'Add to Quote').length >= 2,
    'both occupants are offered for comparison');
}

// ── 7. A single occupant WITH add-ons keeps its staged/Recommendations flow ─
//
// commitSelection() stages the primary when the Family has add-on Tiers, so
// the quoted state must land in Recommendations rather than either the
// focused shell or the plain grid. This is the flow the correction must not
// disturb.

const addonFamily = familyWith({
  basic: occupant({}),
  standard: occupant({
    tier_occupant_id: 'occ_addon', tier_platform_id: 'CZTA-SOLO0001',
    label: 'Backup Add-on', is_addon: true,
  }),
});
mount(addonFamily, TIER_VOCAB);
await settle();
{
  const v = view();
  check(v.focusedShell, 'a single normal occupant still auto-focuses even when the Family also offers add-ons');
  check(!v.closeX, 'that landing is still the locked one');
}
await click(buttonWithText('Add to Quote'));
{
  const v = view();
  check(!v.focusedShell, 'quoting it leaves the focused shell here too');
  check(container.innerHTML.includes('cz-package-builder__staged-header'),
    'and lands in the staged Recommendations view, where the add-on choices live — that existing flow is unchanged');
  check(container.innerHTML.includes('Backup Add-on'), 'the add-on is offered in Recommendations');
  check(v.cartVisible, 'the Cart is visible in Recommendations, as it always was — no shell is open to suppress it');
}
// An ORDINARY focused shell must still suppress the Cart. Reached here by
// explicitly choosing the add-on Family's plan from Recommendations, which
// sets focusedTierId — the non-implicit route.
{
  const viewPlan = buttonWithText('View Plan');
  if (viewPlan) {
    await click(viewPlan);
    const v = view();
    check(v.focusedShell, 'an explicit View Plan shell opens');
    check(v.closeX, 'and keeps its ordinary sticky X');
    check(!v.cartVisible, 'an ordinary explicit focused shell still HIDES the Cart — that rule is untouched');
  }
}

// ── 8. A single occupant WITH an Upgrade catalogue keeps its own flow ────
//
// Nath's stated condition set for the plain "just show the Cart" outcome is:
// no add-ons, no Upgrade build, and no other Tier occupants in the Family.
// Each is enforced by its own guard, and each must be proven separately —
// section 6 covered other occupants, section 7 covered add-ons, and this
// covers the Upgrade catalogue, which reaches the fallback through a
// different route: commitSelection() stages the primary whenever
// resolveComposableEligibleRows(family) is non-empty, so stagedTier is
// non-null and the fallback's own `stagedTier === null` guard suppresses the
// implicit shell regardless of the quoted test. Quoting must therefore land
// in Recommendations with the Upgrade CTA, never the bare quoted card.
const catalogueFamily = familyWith(
  { basic: occupant({}) },
  {
    composable_offer: {
      tier_occupant_id: 'occ_composable',
      tier_platform_id: 'CZT-SOLO00099',
      label: 'Build Your Own',
      price: null,
      billing_cycle: 'monthly',
      is_addon: false,
      customer_group: 'personal_business',
      features: [],
      inclusions: [{ id: 'itm_storage', label: 'Block Storage', unit_price: 40 }],
      editions: [],
      edition_options: [],
      commercial_legs: [],
      customer_policy: { items: [{ item_id: 'itm_storage', required: false, default_selected: false }] },
    },
  },
);

mount(catalogueFamily);
await settle();
{
  const v = view();
  check(v.focusedShell, 'a single normal occupant still auto-focuses unquoted when the Family has an Upgrade catalogue');
  check(!v.closeX, 'that landing is still the locked one');
}
await click(buttonWithText('Add to Quote'));
{
  const html = container.innerHTML;
  check(!html.includes('cz-package-builder__focused-name'),
    'quoting leaves the focused shell here too');
  check(html.includes('cz-package-builder__staged-header'),
    'and lands in the staged Recommendations view rather than the bare quoted card');
  check(html.includes('cz-package-builder__upgrade-gate-inline'),
    'the Upgrade your build CTA is offered there — that existing flow is unchanged');
}

// ── 9. The exact condition set for the plain quoted-card outcome ─────────
//
// Stated as one assertion so the rule is legible: the bare quoted card + Cart
// (no Recommendations, no shell) happens ONLY for a Family with exactly one
// normal occupant, no add-ons and no Upgrade catalogue.
mount(soloFamily);
await settle();
await click(buttonWithText('Add to Quote'));
{
  const html = container.innerHTML;
  const v = view();
  check(v.focusedShell, 'alone-occupant Family: the focused shell stays up once quoted');
  check(!v.closeX, 'alone-occupant Family: no X, because nothing sits behind it');
  check(!html.includes('cz-package-builder__staged-header'),
    'alone-occupant Family: no staged Recommendations view — there is nothing to recommend');
  check(!html.includes('cz-package-builder__upgrade-gate-inline'),
    'alone-occupant Family: no Upgrade CTA');
  check(!v.quotedCardViewPlan,
    'alone-occupant Family: no small card either — the shell plus the Cart is the whole presentation');
}

// ── 10. "Alone" is a FAMILY-WIDE fact, never a visible-tab one ───────────
//
// Auditor correction (2026-09-11): normalTiers/addonTiers are derived from
// visibleTiers, which is already narrowed to the active customer group. A
// Family split across audiences can therefore LOOK like "one Tier and no
// add-ons" from whichever tab is open, while genuinely offering more. The
// lone-occupant behaviour must not activate for those Families, so
// familyOffersNothingElse reads familyOccupants/normalOccupants instead.
//
// Both cases below render exactly ONE normal Tier card in the active group —
// so a visible-tab definition of "alone" would wrongly qualify them — and
// must still fall back to today's behaviour once quoted: the ordinary sticky
// X returns, and the Cart stays suppressed while that shell is open.

// 10a. One Personal & Business normal occupant + one Enterprise normal
//      occupant. Only one is visible per tab.
const crossAudienceFamily = familyWith({
  basic: occupant({ audience_groups: ['personal_business'] }),
  standard: occupant({
    tier_occupant_id: 'occ_ent', tier_platform_id: 'CZT-SOLO00002',
    label: 'Enterprise Plan', audience_groups: ['enterprise'],
  }),
});
mount(crossAudienceFamily, TIER_VOCAB);
await settle();
{
  const visibleAdds = buttons().filter((b) => b.textContent.trim() === 'Add to Quote').length;
  check(visibleAdds === 1, `the active group really does show exactly one normal Tier (got ${visibleAdds}) — otherwise this case would not test what it claims`);
  const v = view();
  check(v.focusedShell, 'that one visible Tier still auto-focuses unquoted, unchanged');
  check(!v.closeX, 'and is still locked while unquoted');
}
await click(buttonWithText('Add to Quote'));
{
  const v = view();
  check(v.closeX,
    'a cross-audience Family is NOT globally lone: once quoted, the ordinary sticky X returns — the lone-occupant lock must not activate from a single VISIBLE Tier');
  // Refined rule (2026-09-11, "Nath's authoritative navigation rule" in the
  // same work file): Cart visibility follows the RESOLVED NEXT STEP, not
  // whether the Family is globally lone. This Family has no add-ons and no
  // Upgrade catalogue, so nothing stages and nothing stands between this
  // Tier and the Cart — the Cart is visible beside the shell even though the
  // shell keeps its X. Whether the X is offered (a destination exists behind
  // it) and whether the Cart is eligible (no intermediate step) are two
  // different questions; this case is exactly where they diverge. See
  // tier-next-step-navigation-regression.mjs for the full step matrix.
  check(v.cartVisible,
    'and the Cart IS visible beside that shell: no intermediate step stands between this quoted Tier and the Cart');
}
// The X must actually WORK, not merely be rendered (auditor correction,
// 2026-09-11). This view is reached through the implicit fallback, so
// focusedTierId is already null — clearing it alone changes nothing and the
// fallback re-derives the same shell on the very next render. Clicking it is
// the only way to prove the dismissal is honoured.
await click(container.querySelector('.cz-package-builder__focused-close'));
{
  const v = view();
  check(!v.focusedShell,
    'cross-audience: clicking X on the quoted implicit shell actually CLOSES it — no bounce-back from the render-time fallback');
  check(v.quotedCardViewPlan,
    'cross-audience: dismissing lands on the Tier\'s own normal card, which offers View Plan back in');
  check(v.selectedMarker,
    'cross-audience: that card still shows its quoted state, so the dismissal is not an orphan card');
  check(v.cartVisible,
    'cross-audience: and the Cart becomes visible once the shell is dismissed');
}
await click(buttonWithText('View Plan'));
{
  const v = view();
  check(v.focusedShell,
    'cross-audience: View Plan reopens the focused shell explicitly after a dismissal');
  check(v.closeX,
    'cross-audience: the explicitly reopened shell carries its ordinary sticky X');
  check(!v.cartVisible,
    'cross-audience: and an explicit focused shell suppresses the Cart again — the ordinary rule is untouched');
}
// The staleness trap, in the shape f9ca5b18 originally documented: deriving
// the dismissal against selectedTierId alone would only make it DORMANT while
// the primary is absent, and re-quoting the SAME Tier would make it live
// again and suppress a genuinely fresh quoted shell — stranding the customer
// on the card with no way back in. The stored id must be genuinely cleared.
await click(container.querySelector('.cz-package-builder__focused-close'));
await click(buttonWithText('✓ Selected') ?? buttonWithText('Remove from Quote'));
{
  const v = view();
  check(v.focusedShell && !v.closeX,
    'cross-audience: removing the primary restores the locked unquoted landing, dismissal or not');
  check(!v.cartVisible, 'cross-audience: and the Cart hides again');
}
await click(buttonWithText('Add to Quote'));
{
  const v = view();
  check(v.focusedShell,
    'cross-audience: re-quoting the SAME Tier gets a FRESH quoted shell — a dismissal from the previous cycle must be genuinely cleared, not merely dormant');
  check(v.closeX,
    'cross-audience: and that fresh shell carries its X again');
}

// 10b. One normal occupant in the active group, plus an add-on that exists
//      only in the OTHER audience group.
const crossAudienceAddonFamily = familyWith({
  basic: occupant({ audience_groups: ['personal_business'] }),
  standard: occupant({
    tier_occupant_id: 'occ_hidden_addon', tier_platform_id: 'CZTA-SOLO0002',
    label: 'Enterprise Backup Add-on', is_addon: true, audience_groups: ['enterprise'],
  }),
});
mount(crossAudienceAddonFamily, TIER_VOCAB);
await settle();
{
  const html = container.innerHTML;
  check(!html.includes('Enterprise Backup Add-on'),
    'the other group\'s add-on is genuinely not visible in the active group — the premise of this case');
  const v = view();
  check(v.focusedShell && !v.closeX, 'the visible lone Tier still auto-focuses and is locked while unquoted');
}
await click(buttonWithText('Add to Quote'));
{
  const v = view();
  check(v.closeX,
    'an add-on in another audience group also disqualifies the Family: the ordinary sticky X returns once quoted');
  // Same refined rule as 10a: the hidden add-on belongs to the OTHER
  // audience group, so it never stages here — Recommendations is not the
  // next step, the Cart is.
  check(v.cartVisible,
    'and the Cart is visible beside that shell, because no intermediate step was resolved for the active group');
}
await click(container.querySelector('.cz-package-builder__focused-close'));
{
  const v = view();
  check(!v.focusedShell,
    'hidden-add-on Family: X on the quoted implicit shell actually closes it');
  check(v.quotedCardViewPlan && v.selectedMarker,
    'hidden-add-on Family: dismissing lands on the quoted card with View Plan');
  check(v.cartVisible,
    'hidden-add-on Family: and the Cart becomes visible alongside that card');
}
await click(buttonWithText('View Plan'));
{
  const v = view();
  check(v.focusedShell && v.closeX,
    'hidden-add-on Family: View Plan reopens an explicit shell with its X');
  check(!v.cartVisible,
    'hidden-add-on Family: which suppresses the Cart again');
}

// 10c. And the genuinely lone Family still qualifies, with the full rule —
//      the control case that proves 10a/10b are discriminating rather than
//      simply disabling the behaviour everywhere.
mount(soloFamily);
await settle();
{
  const v = view();
  check(v.focusedShell && !v.closeX && !v.cartVisible, 'genuinely lone Family: shell, no X, Cart hidden before quote');
}
await click(buttonWithText('Add to Quote'));
{
  const v = view();
  check(v.focusedShell, 'genuinely lone Family: shell stays after quote');
  check(!v.closeX, 'genuinely lone Family: still no X');
  check(v.cartVisible, 'genuinely lone Family: Cart visible alongside');
}
await click(buttonWithText('✓ Selected'));
{
  const v = view();
  check(v.focusedShell && !v.closeX && !v.cartVisible, 'genuinely lone Family: removal hides the Cart again, shell remains, still no X');
}

render(null, container);

console.log(`Single occupant quoted focus regression: ${checks} checks passed.`);
