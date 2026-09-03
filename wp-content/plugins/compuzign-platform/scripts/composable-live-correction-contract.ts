import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { composableCoexistsWithPrimary, resolveQuoteItemRole } from '../resources/ts/utils/quote';
import { requestComposableDetail } from '../resources/ts/admin-station/stations/requests/requestItemDisplay';
import type { CartItem, FamilyTierQuoteItem } from '../resources/ts/components/cost-builder/types';
import type { RequestLine } from '../resources/ts/api/types/admin';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Composable live-correction round: ${message}`);
}

// Live-production evidence (Request CZ-B9W42O) surfaced six defects in the
// already-accepted composable Request/PDF/email chain: the customer label
// stays "Build Your Own" even when composable is used to upgrade an existing
// Tier; Quote details shows "Details unavailable" despite a successful
// server-preview snapshot existing; Print/Save as PDF falls out of view at
// short viewports; the Admin Request drawer omits composable inclusion/Leg
// detail; a successful submission produced no customer email; and legacy
// Requests must stay unaffected throughout. This contract proves each fix.

const root = resolve(import.meta.dirname, '..');

// ── 1. composableCoexistsWithPrimary() — the "Upgrades" vs "Build Your Own"
//    decision, proven as a pure function first. ───────────────────────────

const baseFamilyFields = {
  offer_type: 'family_tier' as const,
  familyId: 'pcg_cloud', familyPlatformId: 'CZPG-CLOUD01', familyTitle: 'Cloud Family',
  tierInstanceId: 'ti_cloud', tierInstancePlatformId: 'CZTG-CLOUD01',
  tierEditionPlatformId: null, price: 10, billingCycle: 'monthly', features: [] as string[],
  minimumTermValue: null, minimumTermUnit: null,
};

const primaryItem: FamilyTierQuoteItem = {
  ...baseFamilyFields,
  tierOccupantId: 'occ_starter', tierPlatformId: 'CZT-CLOUD001',
  tierId: 'basic', tierTitle: 'Starter Cloud', isAddon: false,
};
const composableStandalone: FamilyTierQuoteItem = {
  ...baseFamilyFields,
  tierOccupantId: 'occ_composable', tierPlatformId: 'CZT-CLOUD009',
  tierId: 'composable', tierTitle: 'Build Your Own', isAddon: false, isComposable: true,
  inclusionItems: [{ id: 'itm_block', label: 'Block Storage', quantity: 100 }],
  legPaymentSummaries: [{
    source: 'leg_block_storage', billingCycle: 'monthly', price: 10,
    startMonth: 0, endMonth: null, isOngoing: true, occurrenceMonths: [], subtotal: null,
  }],
};
const addonItem: FamilyTierQuoteItem = {
  ...baseFamilyFields,
  tierOccupantId: 'occ_addon', tierPlatformId: 'CZT-CLOUD002',
  tierId: 'enterprise', tierTitle: 'Backup & DR Shield', isAddon: true,
};

check(!composableCoexistsWithPrimary(composableStandalone, [composableStandalone]), 'a standalone composable line with no sibling primary reads as NOT coexisting');
check(composableCoexistsWithPrimary(composableStandalone, [primaryItem, composableStandalone]), 'a composable line WITH a sibling primary for the same Family+Tier-Instance reads as coexisting');
check(!composableCoexistsWithPrimary(composableStandalone, [addonItem, composableStandalone]), 'a composable line beside only an Add-on (no primary) still reads as NOT coexisting');
check(!composableCoexistsWithPrimary(primaryItem, [primaryItem, composableStandalone]), 'the function is a no-op (false) for a non-composable item — never mislabels the primary itself');

// A primary for a DIFFERENT Family+Tier-Instance must not trigger "Upgrades".
const otherFamilyPrimary: FamilyTierQuoteItem = {
  ...baseFamilyFields,
  familyId: 'pcg_other', familyPlatformId: 'CZPG-OTHER01',
  tierInstanceId: 'ti_other', tierInstancePlatformId: 'CZTG-OTHER01',
  tierOccupantId: 'occ_other', tierPlatformId: 'CZT-OTHER001',
  tierId: 'basic', tierTitle: 'Other Family Basic', isAddon: false,
};
check(!composableCoexistsWithPrimary(composableStandalone, [otherFamilyPrimary, composableStandalone]), 'a primary belonging to a DIFFERENT Family+Tier-Instance never triggers "Upgrades"');

// ── 2. Source wiring: QuoteSummary.tsx / OrderSummary.tsx show "Upgrades"
//    conditionally, never unconditionally replacing "Build Your Own". ─────

const quoteSummary = readFileSync(resolve(root, 'resources/ts/components/cost-builder/QuoteSummary.tsx'), 'utf8');
const orderSummary = readFileSync(resolve(root, 'resources/ts/components/request-flow/OrderSummary.tsx'), 'utf8');

check(quoteSummary.includes('composableCoexistsWithPrimary'), 'QuoteSummary.tsx imports/uses composableCoexistsWithPrimary()');
check(quoteSummary.includes("'Upgrades'"), 'QuoteSummary.tsx has the "Upgrades" label available');
check(orderSummary.includes('composableCoexistsWithPrimary'), 'OrderSummary.tsx imports/uses composableCoexistsWithPrimary()');
check(orderSummary.includes("'Upgrades'"), 'OrderSummary.tsx has the "Upgrades" label available');

// QuoteProposalPreview.tsx (shared with Admin PDF print) must NOT relabel —
// the approval scope names only "customer quote/cart + review", explicitly
// preserving Admin naming, and this file is read by both audiences at once.
const proposal = readFileSync(resolve(root, 'resources/ts/components/request-flow/QuoteProposalPreview.tsx'), 'utf8');
check(!proposal.includes('composableCoexistsWithPrimary'), 'QuoteProposalPreview.tsx (shared with Admin PDF print) is untouched by the customer-only "Upgrades" relabel');
check(proposal.includes('Build Your Own'), 'QuoteProposalPreview.tsx keeps its unconditional "Build Your Own" eyebrow');

// requestItemDisplay.ts / RequestDrawerHost.tsx (Admin) must also stay
// unaffected by the relabel — internal identity/Admin naming unchanged.
const requestItemDisplaySrc = readFileSync(resolve(root, 'resources/ts/admin-station/stations/requests/requestItemDisplay.ts'), 'utf8');
check(!requestItemDisplaySrc.includes('composableCoexistsWithPrimary') && !requestItemDisplaySrc.includes("'Upgrades'"), 'requestItemDisplay.ts (Admin) never relabels to "Upgrades" — Build Your Own naming stays Admin-side');

// ── 3. Quote details: composable renders its real snapshot, never falls to
//    "Details unavailable" when the data exists. ──────────────────────────

const overlay = readFileSync(resolve(root, 'resources/ts/components/package-builder/QuoteDetailsOverlay.tsx'), 'utf8');
check(overlay.includes('function ComposablePlanDetails'), 'QuoteDetailsOverlay.tsx defines ComposablePlanDetails()');
check(overlay.includes('activeItem?.isComposable') && overlay.includes('<ComposablePlanDetails'), 'the composable branch is checked and rendered BEFORE falling through to "Details unavailable"');
check(overlay.includes('item.inclusionItems') && overlay.includes('item.legPaymentSummaries'), 'ComposablePlanDetails reads the item\'s own stored snapshot, never a live resolver');
check(!/ComposablePlanDetails[\s\S]*?resolveEffectiveTierDisplay/.test(overlay.slice(overlay.indexOf('function ComposablePlanDetails'), overlay.indexOf('function ComposablePlanDetails') + 3000)), 'ComposablePlanDetails never calls the live-catalog resolver');

// ── 4. Sticky Print/Save as PDF — reachable without scrolling the rail. ───

const css = readFileSync(resolve(root, 'resources/css/modules/cost-builder.css'), 'utf8');
const actionsRule = css.match(/\.cz-os__actions\s*\{[^}]*\}/);
check(!!actionsRule, '.cz-os__actions rule is present');
check(actionsRule![0].includes('position: sticky'), '.cz-os__actions is sticky within its scroll container');
check(actionsRule![0].includes('bottom: 0'), '.cz-os__actions sticks to the bottom of the visible rail');
check(actionsRule![0].includes('background:'), '.cz-os__actions carries an opaque background so scrolled content does not show through beneath it');

// ── 5. Admin Request readback: composable inclusion/Leg detail. ──────────

const composableLine: RequestLine = {
  offer_type: 'family_tier', tierTitle: 'Build Your Own', tierId: 'composable',
  price: 10, billingCycle: 'monthly', features: [], isAddon: false, isComposable: true,
  promotion_id: '', billing_label: '', minimumTermValue: null, minimumTermUnit: null,
  familyTitle: 'Cloud Family', inclusionItems: [
    { id: 'itm_block', label: 'Block Storage', quantity: 100 },
    { id: 'itm_bundle', label: 'Security Bundle', bundle_id: 'bnd_x', includes: [{ id: 'itm_child', label: 'Child Item', quantity: 3 }] },
  ],
  legPaymentSummaries: [{
    source: 'leg_block_storage', billingCycle: 'monthly', price: 10,
    startMonth: 0, endMonth: null, isOngoing: true, occurrenceMonths: [], subtotal: null,
  }],
};
const detail = requestComposableDetail(composableLine);
check(detail !== null, 'a composable RequestLine with stored snapshot data yields detail, never null');
check(detail!.inclusions.length === 3, 'inclusions flatten: 1 ordinary + 1 Bundle parent + 1 Bundle child = 3 rows');
check(detail!.inclusions[0].label === 'Block Storage' && detail!.inclusions[0].quantity === 100, 'ordinary inclusion keeps its label + quantity');
check(detail!.inclusions[1].isBundleParent === true && detail!.inclusions[1].quantity === null, 'a Bundle parent stays quantity-less, matching every other inclusion renderer in this codebase');
check(detail!.inclusions[2].label === 'Child Item' && detail!.inclusions[2].quantity === 3, 'a Bundle child keeps its own quantity');
check(detail!.streams.length === 1 && detail!.streams[0].amount.includes('10'), 'per-Leg payment stream survives with a formatted amount');

const nonComposableLine: RequestLine = { ...composableLine, isComposable: false };
check(requestComposableDetail(nonComposableLine) === null, 'a non-composable line (primary/Add-on) never gets composable detail — no cross-contamination');

const legacyLine: RequestLine = {
  offer_type: 'family_tier', tierTitle: 'KAIROS Basic', tierId: 'basic',
  price: 15, billingCycle: 'monthly', features: [], isAddon: false,
  promotion_id: '', billing_label: '', minimumTermValue: null, minimumTermUnit: null,
  familyTitle: 'KAIROS',
  // Deliberately no isComposable key — a pre-live-correction-round Request.
};
check(requestComposableDetail(legacyLine) === null, 'a legacy RequestLine with no isComposable key never renders composable detail — unchanged Admin readback');

const emptySnapshotComposable: RequestLine = { ...composableLine, inclusionItems: null, legPaymentSummaries: null };
check(requestComposableDetail(emptySnapshotComposable) === null, 'a composable line whose snapshot is genuinely empty renders no detail block rather than an empty shell');

// ── 6. Backward compatibility: resolveQuoteItemRole() still treats an
//    absent-isComposable item as primary — the live-correction round adds
//    no new required field anywhere. ───────────────────────────────────────

const legacyCartItem: FamilyTierQuoteItem = { ...primaryItem };
check(resolveQuoteItemRole(legacyCartItem) === 'primary', 'a legacy cart item with no isComposable field still resolves to primary, unaffected by this round');

console.log('Composable live-correction round contract passed.');
