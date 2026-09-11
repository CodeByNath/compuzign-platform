// Tier Add-to-Quote next-step navigation
// (project-work/2026-09-11-single-occupant-focused-after-quote.md, refined
// rule; project-work/2026-09-11-upgrade-cta-cart-suppression.md narrowed the
// 'recommendations' row below to also hide the Cart specifically while the
// Upgrade CTA is on screen).
//
// Nath's authoritative rule:
//   a successful Add to Quote from a normal Tier card OR a normal Tier
//   focused shell completes the Tier-selection step; the Cart becomes
//   visible only when there is NO intermediate customer step between that
//   Tier and the Cart.
//
// So Cart visibility is read off ONE resolved navigation step, never off a
// per-shell special case and never off a persistent showCart flag:
//
//   tier_comparison    the plain card grid                  Cart eligible
//   tier_landing       implicit single-Tier landing,
//                      Tier step NOT yet complete           Cart suppressed
//   focused_inspection an EXPLICITLY opened Tier/Add-on
//                      shell (Choose Plan / View Plan)      Cart suppressed
//   upgrade_browsing   the composable catalogue workspace   Cart suppressed
//   recommendations    staged add-ons — Cart eligible;
//                      the PENDING Upgrade CTA itself
//                      (Browse Catalogue / Maybe next
//                      time on screen) — Cart suppressed,
//                      narrower than the step as a whole    see above
//   cart               Tier step complete, nothing stands
//                      between that Tier and the Cart       Cart eligible
//
// This mounts the REAL FamilyTierAdapter through happy-dom + Preact's own
// render(), bundled with esbuild, for the same reason
// single-occupant-quoted-focus-regression.mjs does: this feature has failed
// live off static reasoning before, and the divergences this round fixes
// (reload vs in-session, pending vs browsing, quoted Edition vs Default) are
// only observable in what actually renders.
//
// Usage: npm run regression:tier-next-step-navigation

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-tier-next-step-bundle.mjs');
mkdirSync(dirname(outFile), { recursive: true });

const window = new Window({ url: 'https://cz-test.local/' });
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.HTMLElement = window.HTMLElement;
globalThis.Node = window.Node;
globalThis.MouseEvent = window.MouseEvent;
// Layout metrics for the ONE track the carousel chevrons measure
// (PricingTiers.tsx's useTrackOverflow). happy-dom performs no layout, so
// every element reports 0 — truthful for "nothing overflows", but it would
// leave the overflow branch permanently untested. These getters let a
// section state the track's own scrollWidth/clientWidth and then assert what
// actually renders; every other element keeps reporting 0.
// happy-dom splits these two across prototypes (scrollWidth on Element,
// clientWidth on HTMLElement), so each override must land on the prototype
// that actually owns it — defining both on one leaves the other shadowed and
// silently reporting 0.
const trackMetrics = { scrollWidth: 0, clientWidth: 0 };
for (const [proto, prop] of [[window.Element, 'scrollWidth'], [window.HTMLElement, 'clientWidth']]) {
  Object.defineProperty(proto.prototype, prop, {
    configurable: true,
    get() {
      return this.classList?.contains('cz-cost-builder__tiers') ? trackMetrics[prop] : 0;
    },
  });
}
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
// The composable browsing workspace owns a debounced preview request that
// only fires after genuine customer interaction. Nothing exercised here
// interacts with the catalogue itself, so a request would be a defect — but
// a REJECTED promise would surface as an unhandled rejection rather than a
// legible failure, so requests are recorded and left pending instead.
const fetchCalls = [];
globalThis.fetch = (...args) => { fetchCalls.push(args); return new Promise(() => {}); };

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
  if (!condition) throw new Error(`Tier next-step navigation: ${message}`);
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
    edition_options: [],
    commercial_legs: [],
    ...partial,
  };
}

function edition(partial) {
  return {
    id: 'ed_pro',
    label: 'Pro',
    price: 250,
    contact: false,
    billing_cycle: 'monthly',
    minimum_term_value: null,
    minimum_term_unit: null,
    inclusions_override: [],
    edition_platform_id: 'CZTE-PRO00001',
    commercial_legs: [],
    ...partial,
  };
}

const composableOffer = {
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
};

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

const TIER_VOCAB = [
  { id: 'basic', title: 'Basic' },
  { id: 'standard', title: 'Standard' },
  { id: 'premium', title: 'Premium' },
];

const soloFamily = familyWith({ basic: occupant({}) });
const soloEditionFamily = familyWith({ basic: occupant({ edition_options: [edition({})] }) });
const multiFamily = familyWith({
  basic: occupant({}),
  standard: occupant({ tier_occupant_id: 'occ_std', tier_platform_id: 'CZT-SOLO00002', label: 'Standard Plan' }),
});
const addonFamily = familyWith({
  basic: occupant({}),
  standard: occupant({
    tier_occupant_id: 'occ_addon', tier_platform_id: 'CZTA-SOLO0001',
    label: 'Backup Add-on', is_addon: true,
    edition_options: [edition({ id: 'ed_addon_pro', label: 'Backup Pro', price: 60, edition_platform_id: 'CZTE-BKP00001' })],
  }),
});
const catalogueFamily = familyWith({ basic: occupant({}) }, { composable_offer: composableOffer });
const bothFamily = familyWith(
  {
    basic: occupant({}),
    standard: occupant({
      tier_occupant_id: 'occ_addon', tier_platform_id: 'CZTA-SOLO0001',
      label: 'Backup Add-on', is_addon: true,
    }),
  },
  { composable_offer: composableOffer },
);
const crossAudienceFamily = familyWith({
  basic: occupant({ audience_groups: ['personal_business'] }),
  standard: occupant({
    tier_occupant_id: 'occ_ent', tier_platform_id: 'CZT-SOLO00002',
    label: 'Enterprise Plan', audience_groups: ['enterprise'],
  }),
});

// ── Harness: the parent owns cart state, exactly as PackageBuilderApp does ──
//
// PackageBuilderApp's own Cart-visibility expression is mirrored verbatim
// (`items.length > 0 && !quoteSuppressedByShell`) — Cart visibility is a
// parent-boundary fact, so it is asserted at that boundary rather than
// inferred from what FamilyTierAdapter reports.

const container = document.createElement('div');
document.body.appendChild(container);

function mount(family, tierVocab = [TIER_VOCAB[0]], initial = {}) {
  const calls = { added: [], removedPrimary: 0, composableCommits: 0 };
  function Harness() {
    // `initial` seeds the RESTORED-CART case: PackageBuilderApp loads the
    // browser cart synchronously before first render, so a reload mounts
    // this component with the primary/add-on lines already present.
    const [selectedTierId, setSelectedTierId] = useState(initial.primary?.tierId ?? null);
    const [primaryItem, setPrimaryItem] = useState(initial.primary ?? null);
    const [addonItems, setAddonItems] = useState(initial.addons ?? []);
    const [composableItem, setComposableItem] = useState(initial.composable ?? null);
    const [quoteSuppressedByShell, setQuoteSuppressedByShell] = useState(false);
    const items = [primaryItem, composableItem, ...addonItems].filter(Boolean);
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
          if (item.isAddon) {
            setAddonItems((prev) => [
              ...prev.filter((existing) => existing.tierPlatformId !== item.tierPlatformId),
              item,
            ]);
            return;
          }
          setPrimaryItem(item);
          setSelectedTierId(item.tierId);
        },
        onRemovePrimary: () => { calls.removedPrimary += 1; setPrimaryItem(null); setSelectedTierId(null); },
        onRemoveAddon: (tierPlatformId) => setAddonItems((prev) => prev.filter((a) => a.tierPlatformId !== tierPlatformId)),
        selectedComposableItem: composableItem,
        onComposableCommit: (item) => { calls.composableCommits += 1; setComposableItem(item); },
        onComposableRemove: () => setComposableItem(null),
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
function cueTarget(label) {
  return container.querySelector(`.cz-package-builder__cue-target[aria-label="${label}"]`);
}
async function click(el) {
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await settle();
}

function view() {
  const html = container.innerHTML;
  return {
    html,
    focusedShell: !!container.querySelector('.cz-package-builder__focused-name'),
    focusedName: container.querySelector('.cz-package-builder__focused-name')?.textContent.trim() ?? null,
    closeX: !!container.querySelector('.cz-package-builder__focused-close'),
    staged: html.includes('cz-package-builder__staged-header'),
    upgradeCta: html.includes('cz-package-builder__upgrade-gate-inline'),
    browsing: !!container.querySelector('.cz-package-builder__composable-browser, .cz-cost-builder__composable-browser')
      || (html.includes('Upgrade your build') && !html.includes('cz-package-builder__upgrade-gate-inline')
          && !!container.querySelector('.cz-package-builder__focused')),
    quotedCardViewPlan: !!buttonWithText('View Plan'),
    selectedMarker: !!buttonWithText('✓ Selected'),
    addedMarker: !!buttonWithText('✓ Added'),
    addToQuote: !!buttonWithText('Add to Quote'),
    // Presence, not CSS: the nav row is rendered only while its track
    // genuinely overflows, so querying the DOM IS the visibility test.
    chevrons: container.querySelectorAll('.cz-cost-builder__tiers-nav').length,
    cartVisible: !!container.querySelector('.cz-harness-cart'),
    cartText: container.querySelector('.cz-harness-cart')?.textContent ?? null,
  };
}

// ── 1. Tier-card Add to Quote, nothing in between ────────────────────────
//
// Two normal occupants, no add-ons, no catalogue: the grid's own Add to
// Quote completes the Tier step and the next step IS the Cart.

mount(multiFamily, TIER_VOCAB);
await settle();
{
  const v = view();
  check(!v.focusedShell, 'grid: two occupants compare as cards, no implicit shell');
  check(!v.cartVisible, 'grid: nothing quoted yet, so there is no Cart to show');
}
await click(buttonWithText('Add to Quote'));
{
  const v = view();
  check(!v.focusedShell, 'card Add to Quote with nothing in between leaves no focused shell open');
  check(!v.staged, 'and stages nothing — there are no add-ons and no catalogue to recommend');
  check(v.cartVisible && v.cartText === 'Cart: 1', `and the Cart is the resolved next step (got ${v.cartText})`);
}

// ── 2. Focused-shell Add to Quote, nothing in between ────────────────────
//
// The globally lone occupant: the shell IS the presentation, so it stays
// open and the Cart appears beside it.

mount(soloFamily);
await settle();
{
  const v = view();
  check(v.focusedShell, 'lone occupant lands in the focused shell');
  check(!v.closeX, 'lone occupant landing has no X — there is no destination behind it');
  check(!v.cartVisible, 'tier_landing: the Tier step is not complete, so the Cart stays suppressed');
}
await click(buttonWithText('Add to Quote'));
{
  const v = view();
  check(v.focusedShell, 'lone occupant: the shell remains after Add to Quote');
  check(!v.closeX, 'lone occupant: still no X');
  check(v.cartVisible && v.cartText === 'Cart: 1', 'lone occupant: the Cart appears alongside the still-open shell');
}
await click(buttonWithText('✓ Selected'));
{
  const v = view();
  check(v.focusedShell && !v.closeX, 'lone occupant: removing the line leaves the same landing');
  check(!v.cartVisible, 'and the Cart disappears because the quote is EMPTY, not from stale navigation state');
}
await click(buttonWithText('Add to Quote'));
{
  const v = view();
  check(v.focusedShell && v.cartVisible, 're-adding returns the same coexisting shell + Cart');
}

// ── 3. Exact quoted Edition identity survives Add to Quote ───────────────
//
// Safeguard 2: the visible focused variant must not fall back to Default
// while the Cart holds an Edition.

mount(soloEditionFamily);
await settle();
{
  const v = view();
  check(v.focusedShell && v.focusedName === 'Solo Plan', `lone Edition Family opens on its Default declaration (got ${v.focusedName})`);
}
await click(cueTarget('Pro'));
{
  const v = view();
  check(v.focusedName === 'Pro', `the cue switches the shell to the Pro Edition (got ${v.focusedName})`);
}
await click(buttonWithText('Add to Quote'));
{
  const v = view();
  const added = view().html;
  check(v.focusedShell, 'quoting an Edition from the focused shell keeps the shell open');
  check(v.focusedName === 'Pro', `and keeps showing the EXACT quoted Edition, never a silent reset to Default (got ${v.focusedName})`);
  check(v.selectedMarker, 'the card reads as the quoted option, so clicking it again removes rather than re-quoting Default');
  check(!v.addToQuote, 'and no Add to Quote remains on an already-quoted exact option');
  check(v.cartVisible, 'with the Cart alongside');
  check(added.includes('aria-current="true"'), 'the cue marks the quoted Edition as current');
}

// ── 4. Reload / restored cart resolves to the same presentation ──────────
//
// Safeguard 3: mounting with the cart already restored must produce the same
// view as the in-session transition above — no reload-only staged/small-card
// divergence for a globally lone quoted Tier.

const restoredPrimary = {
  offerType: 'family_tier',
  familyId: soloEditionFamily.family_id,
  tierInstanceId: soloEditionFamily.tier_instance_id,
  tierId: 'basic',
  tierPlatformId: 'CZT-SOLO00001',
  tierEditionPlatformId: 'CZTE-PRO00001',
  tierTitle: 'Solo Plan',
  tierEditionTitle: 'Pro',
  price: 250,
  billingCycle: 'monthly',
  isAddon: false,
};
mount(soloEditionFamily, [TIER_VOCAB[0]], { primary: restoredPrimary });
await settle();
{
  const v = view();
  check(v.focusedShell, 'restored cart: a globally lone quoted Tier mounts back into its focused shell');
  check(!v.staged, 'restored cart: never the staged view — this Family has nothing to recommend');
  check(!v.quotedCardViewPlan, 'restored cart: and no small quoted card either');
  check(v.focusedName === 'Pro', `restored cart: the shell shows the quoted Edition (got ${v.focusedName})`);
  check(!v.closeX, 'restored cart: still no X on a globally lone landing');
  check(v.cartVisible && v.cartText === 'Cart: 1', 'restored cart: and the Cart is visible, exactly as in session');
}

// ── 4b. Reload restores the PENDING Upgrade CTA, not just the Tier ────
//
// project-work/2026-09-11-single-visible-tier-permanent-focus.md, item 5.
// Live defect: Add to Quote produced the pending "Upgrade your build" CTA,
// then a refresh restored the quoted/staged Tier and lost the CTA — leaving
// the customer in Recommendations with no route into the catalogue at all.
// stagedTierId was seeded from the restored cart; the gate was not.
//
// The assertion is parity, not a new rule: this mounts the SAME
// catalogueFamily section 7 exercises in session and requires the identical
// view (staged + CTA + Cart hidden).

const restoredCataloguePrimary = {
  offerType: 'family_tier',
  familyId: catalogueFamily.family_id,
  tierInstanceId: catalogueFamily.tier_instance_id,
  tierId: 'basic',
  tierPlatformId: 'CZT-SOLO00001',
  tierEditionPlatformId: null,
  tierTitle: 'Solo Plan',
  price: 100,
  billingCycle: 'monthly',
  isAddon: false,
};

mount(catalogueFamily, [TIER_VOCAB[0]], { primary: restoredCataloguePrimary });
await settle();
{
  const v = view();
  check(v.staged, 'reload parity: a restored quoted primary with an eligible catalogue mounts back into Recommendations');
  check(v.upgradeCta, 'reload parity: and the PENDING Upgrade CTA is restored with it — the live defect this fixes');
  check(!v.focusedShell, 'reload parity: pending is still not a focused shell, exactly as in session');
  check(!v.cartVisible, 'reload parity: and the Cart is hidden behind the CTA, matching the in-session state');
}
// Still an in-session dismissal, not persistent navigation state: nothing
// re-seeds the gate after mount, so Maybe next time behaves identically.
await click(buttonWithText('Maybe next time'));
{
  const v = view();
  check(v.staged && !v.upgradeCta, 'reload parity: Maybe next time still dismisses a RESTORED CTA');
  check(v.cartVisible, 'reload parity: and the Cart returns, same as the in-session dismissal');
}

// The second authoritative fact: a Family/Instance whose composable line is
// already committed must NOT be offered a fresh Upgrade entry on reload —
// the exact rule the Cart footer's own recovery route already applies.
mount(catalogueFamily, [TIER_VOCAB[0]], {
  primary: restoredCataloguePrimary,
  composable: {
    offerType: 'family_tier',
    familyId: catalogueFamily.family_id,
    tierInstanceId: catalogueFamily.tier_instance_id,
    tierId: 'composable',
    tierPlatformId: 'CZT-SOLO00099',
    tierTitle: 'Build Your Own',
    price: 40,
    billingCycle: 'monthly',
    isAddon: false,
    isComposable: true,
  },
});
await settle();
{
  const v = view();
  check(v.staged, 'reload parity: a restored primary with a COMMITTED composable line still lands in Recommendations');
  check(!v.upgradeCta, 'reload parity: but no pending CTA — an Upgrade already in the quote is never advertised as unstarted');
  check(v.cartVisible && v.cartText === 'Cart: 2', `reload parity: both restored lines are in the visible Cart (got ${v.cartText})`);
}

// ── 5. Add-on-only Recommendations stays the intermediate step ───────────

mount(addonFamily, TIER_VOCAB);
await settle();
await click(buttonWithText('Add to Quote'));
{
  const v = view();
  check(!v.focusedShell, 'add-ons: quoting leaves the focused shell');
  check(v.staged, 'add-ons: and lands in the staged Recommendations step');
  check(v.html.includes('Backup Add-on'), 'add-ons: the add-on choices are offered there');
  check(v.cartVisible, 'add-ons: Recommendations is an intermediate step, not a focused workspace — the Cart stays visible, as it always has');
}

// ── 6. Add-on quoted Edition identity on the returning small card ───────
//
// Safeguard 4: the add-on card must present the exact quoted Add-on Edition,
// not merely a Tier-level Added state.

await click(buttons().find((b) => b.textContent.trim() === 'Choose Plan'));
{
  const v = view();
  check(v.focusedShell, 'add-on Choose Plan opens its own focused shell');
  check(v.closeX, 'that explicit shell keeps its ordinary X');
  check(!v.cartVisible, 'focused_inspection: an explicitly opened shell suppresses the Cart');
}
await click(cueTarget('Backup Pro'));
await click(buttonWithText('Add to Quote'));
{
  const v = view();
  check(!v.focusedShell, 'quoting the add-on Edition returns to Recommendations');
  check(v.staged, 'which is the staged step, unchanged');
  check(v.cartVisible && v.cartText === 'Cart: 2', `both lines are in the Cart (got ${v.cartText})`);
  check(v.html.includes('Backup Pro'), 'the returning add-on card presents the EXACT quoted Add-on Edition, not its Default declaration');
  check(v.addedMarker, 'and still reads as Added');
}

// ── 7. Upgrade-only: the CTA itself hides the Cart (2026-09-11 follow-up) ─
//
// project-work/2026-09-11-upgrade-cta-cart-suppression.md narrows the
// previous round's rule: while Browse Catalogue / Maybe next time is
// actually on screen, the Cart is hidden — even though 'recommendations' is
// still an intermediate step, not upgrade_browsing itself. Dismissing the
// CTA (Maybe next time, tested at the end of this section) returns the Cart
// without ever touching add-on-only Recommendations, which never renders
// this CTA in the first place (section 5 above already covers that case).

mount(catalogueFamily);
await settle();
await click(buttonWithText('Add to Quote'));
{
  const v = view();
  check(v.staged, 'catalogue: quoting lands in Recommendations');
  check(v.upgradeCta, 'catalogue: with the pending Upgrade your build CTA');
  check(!v.focusedShell, 'catalogue: pending is not a focused shell');
  check(!v.cartVisible, 'catalogue: while the Upgrade CTA (Browse Catalogue / Maybe next time) is actually on screen, the Cart is hidden');
}
await click(buttonWithText('Maybe next time'));
{
  const v = view();
  check(v.staged && !v.upgradeCta, 'catalogue: Maybe next time dismisses the CTA, back to ordinary Recommendations');
  check(v.cartVisible, 'catalogue: and the Cart returns once the CTA is gone');
}
// Re-quote the same catalogue-only path so section 8 below starts from the
// CTA-visible state again.
mount(catalogueFamily);
await settle();
await click(buttonWithText('Add to Quote'));
{
  const v = view();
  check(v.upgradeCta && !v.cartVisible, 'catalogue: fresh cycle — CTA visible, Cart hidden, ready for the browsing transition below');
}

// ── 8. Browsing IS the focused workspace, and hides the Cart ─────────────

await click(buttonWithText('Browse Catalogue'));
{
  const v = view();
  check(!v.staged, 'browsing: the catalogue workspace replaces Recommendations rather than stacking under it');
  check(v.focusedName === 'Upgrade your build', `browsing: the composable focused shell is open (got ${v.focusedName})`);
  check(!v.cartVisible, 'upgrade_browsing: the catalogue workspace suppresses the Cart (continuous with the CTA state above — the Cart never flickers visible in between)');
  check(fetchCalls.length === 0, 'browsing: opening the workspace performs no preview request of its own');
}
await click(container.querySelector('.cz-package-builder__focused-close'));
{
  const v = view();
  check(v.staged, 'leaving browsing returns to the staged step');
  check(!v.upgradeCta, 'and the CTA is dismissed with it');
  check(v.cartVisible, 'with the Cart visible again');
}

// ── 9. Add-ons AND an Upgrade catalogue together ─────────────────────────

mount(bothFamily, TIER_VOCAB);
await settle();
await click(buttonWithText('Add to Quote'));
{
  const v = view();
  check(v.staged && v.upgradeCta, 'add-ons + catalogue: Recommendations remains the intermediate step, with the CTA');
  check(!v.html.includes('Backup Add-on'), 'add-ons step aside while the CTA is being offered — the existing presentation rule');
  check(!v.cartVisible, 'add-ons + catalogue: while the CTA is on screen the Cart is hidden here too, same as the catalogue-only case');
}
await click(buttonWithText('Maybe next time'));
{
  const v = view();
  check(v.staged && !v.upgradeCta, 'dismissing the CTA returns the ordinary add-on Recommendations');
  check(v.html.includes('Backup Add-on'), 'with the add-on choices back');
  check(v.cartVisible, 'and the Cart visible throughout — no flicker between the two Recommendations states');
}

// ── 10. Cross-audience Family: one VISIBLE Tier, another behind a tab ────
//
// Live correction (2026-09-11, project-work/2026-09-11-single-visible-tier-
// permanent-focus.md): NOT globally lone (familyOffersNothingElse is
// Family-wide and stays false here), but this Tier IS lone within the active
// customer group — the other occupant lives behind the tab bar, never behind
// the X, so the X now stays hidden too, same as a globally-lone Family. The
// resolved next step after Add to Quote is still the Cart either way: no
// add-ons, no catalogue, nothing stages, so Cart eligibility is untouched by
// this correction.

mount(crossAudienceFamily, TIER_VOCAB);
await settle();
{
  const visibleAdds = buttons().filter((b) => b.textContent.trim() === 'Add to Quote').length;
  check(visibleAdds === 1, `cross-audience: the active group shows exactly one normal Tier (got ${visibleAdds})`);
  const v = view();
  check(v.focusedShell && !v.closeX, 'cross-audience: the single visible Tier lands locked while unquoted');
  check(!v.cartVisible, 'cross-audience: tier_landing suppresses the Cart');
}
await click(buttonWithText('Add to Quote'));
{
  const v = view();
  check(v.focusedShell, 'cross-audience: the implicit shell remains after Add to Quote');
  check(!v.closeX, 'cross-audience: lone within the active group, so the X stays hidden — the other group\'s occupant sits behind the tab bar, not the X');
  check(v.cartVisible, 'cross-audience: nothing stands between this Tier and the Cart, so the Cart is visible beside the shell');
}
// There is no X to dismiss through any more, so removal goes through the
// shell's own quoted-state control — the same path a globally-lone Family
// uses — and must land right back on the locked UNQUOTED shell, never an
// orphan one-card grid.
await click(buttonWithText('✓ Selected'));
{
  const v = view();
  check(v.focusedShell && !v.closeX, 'cross-audience: removing the primary restores the locked landing directly, no dismiss-to-card step involved');
  check(!v.cartVisible, 'cross-audience: with an empty quote there is no Cart');
}
await click(buttonWithText('Add to Quote'));
{
  const v = view();
  check(v.focusedShell && !v.closeX, 'cross-audience: re-quoting the same Tier lands back on the locked quoted shell, still no X');
  check(v.cartVisible, 'cross-audience: and the Cart again');
}

// ── 11. Customer-group transition ────────────────────────────────────────
//
// Switching tabs re-resolves which occupants are visible; the navigation
// step must follow the new group rather than persist from the old one. Both
// groups are individually lone here, so BOTH landings stay locked — the tab
// bar itself is the one real way to move between them, quoted state on
// either side notwithstanding.
{
  const enterpriseTab = buttonWithText('Enterprise');
  check(!!enterpriseTab, 'cross-audience: the customer-group tabs are offered');
  await click(enterpriseTab);
  const v = view();
  check(v.focusedShell, 'customer-group switch: the other group\'s single occupant lands in its own shell');
  check(v.focusedName === 'Enterprise Plan', `customer-group switch: showing that group's occupant (got ${v.focusedName})`);
  check(!v.closeX, 'customer-group switch: that occupant is unquoted, so its landing is locked');
  check(!v.cartVisible, 'customer-group switch: an unquoted landing suppresses the Cart even though the quote still holds the other group\'s line');
}
await click(buttonWithText('Personal & Business'));
{
  const v = view();
  check(v.focusedShell && !v.closeX,
    'customer-group switch: switching back shows the still-quoted Personal & Business Tier, locked with no X, not a bounce to a card view');
  check(v.cartVisible, 'customer-group switch: and its Cart line is visible again');
}

// ── 12. Carousel chevrons derive from real overflow ──────────────────────
//
// project-work/2026-09-11-single-visible-tier-permanent-focus.md, item 3.
// The chevrons used to be revealed by viewport media queries, which only
// GUESS at overflow: the CTA-only strip — one Tier card beside one compact
// Upgrade shell — fits at every width, yet still offered controls that
// scrolled to nothing. Visibility is now presence: the nav row is rendered
// only while its own track reports more content width than box width, so
// these checks read the DOM rather than a stylesheet.

trackMetrics.scrollWidth = 0;
trackMetrics.clientWidth = 0;
mount(multiFamily, TIER_VOCAB);
await settle();
{
  const v = view();
  check(v.chevrons === 0, `overflow: a strip whose cards all fit offers no chevrons at all (got ${v.chevrons})`);
}

// The other direction — real overflow must still produce ordinary controls.
trackMetrics.scrollWidth = 1280;
trackMetrics.clientWidth = 640;
mount(multiFamily, TIER_VOCAB);
await settle();
{
  const v = view();
  check(v.chevrons === 2, `overflow: a genuinely scrollable strip offers both chevrons (got ${v.chevrons})`);
  check(!!container.querySelector('.cz-cost-builder__tiers-prev') && !!container.querySelector('.cz-cost-builder__tiers-next'),
    'overflow: and they are the existing prev/next controls, unchanged');
}

// Sub-pixel layout rounding is not overflow.
trackMetrics.scrollWidth = 640.5;
trackMetrics.clientWidth = 640;
mount(multiFamily, TIER_VOCAB);
await settle();
{
  const v = view();
  check(v.chevrons === 0, `overflow: a fraction of a pixel is rounding noise, not somewhere to scroll to (got ${v.chevrons})`);
}

// The reported case: the CTA-only staged strip.
trackMetrics.scrollWidth = 0;
trackMetrics.clientWidth = 0;
mount(catalogueFamily);
await settle();
await click(buttonWithText('Add to Quote'));
{
  const v = view();
  check(v.staged && v.upgradeCta, 'overflow: the CTA-only staged strip is on screen');
  check(v.chevrons === 0, `overflow: and carries no chevrons — the selected Tier plus the compact shell fit, so there is nothing to scroll to (got ${v.chevrons})`);
}

render(null, container);

check(fetchCalls.length === 0, 'no network request was made on any navigation path exercised here');

console.log(`Tier next-step navigation regression: ${checks} checks passed.`);
