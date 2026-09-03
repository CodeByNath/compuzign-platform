import { toCartItems } from '../resources/ts/admin-station/stations/requests/requestLineToCartItem';
import { classifyQuoteItems, quoteItemKey, resolveQuoteItemRole } from '../resources/ts/utils/quote';
import type { RequestLine } from '../resources/ts/api/types/admin';
import type { FamilyTierQuoteItem } from '../resources/ts/components/cost-builder/types';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Composable Request line: ${message}`);
}

// Request/PDF/email propagation phase: proves the ONE line that fixes the
// audit's headline finding — requestLineToCartItem.ts must reconstruct
// isComposable from the durable RequestLine, or every downstream reader
// (Admin print/PDF via QuoteProposalPreview, classifyQuoteItems) silently
// reads a composable line back as primary. Also proves the exact duplicate-
// key defect the audit found: a primary and a composable RequestLine for
// the SAME Family+Tier-Instance must reconstruct to DISTINCT quoteItemKey()
// values, not collide.

const baseFamilyFields = {
  offer_type: 'family_tier' as const,
  familyId: 'pcg_kairos', familyPlatformId: 'CZPG-KAIROS01', familyTitle: 'KAIROS',
  tierInstanceId: 'ti_kairos', tierInstancePlatformId: 'CZTG-KAIROS01',
  tierOccupantId: 'occ_enterprise', tierPlatformId: 'CZT-KAIROS001', tierEditionPlatformId: undefined,
  tierTitle: 'KAIROS Enterprise', price: 490, billingCycle: 'monthly', features: [] as string[],
  isAddon: false, minimumTermValue: null, minimumTermUnit: null,
};

// ── A composable RequestLine reconstructs with the composable role ───────
const composableLine: RequestLine = {
  ...baseFamilyFields,
  tierId: 'composable',
  tierTitle: 'Build Your Own',
  tierOccupantId: 'occ_composable',
  tierPlatformId: 'CZT-KAIROS009',
  isComposable: true,
};
const [reconstructedComposable] = toCartItems([composableLine]) as FamilyTierQuoteItem[];
check(reconstructedComposable.isComposable === true, 'a composable RequestLine reconstructs with isComposable: true');
check(resolveQuoteItemRole(reconstructedComposable) === 'composable', 'resolveQuoteItemRole() reads the reconstructed item as composable, not primary');

// ── A legacy RequestLine with no isComposable key reconstructs as primary,
//    unchanged — the exact backward-compatibility requirement. ───────────
const legacyLine: RequestLine = { ...baseFamilyFields, tierId: 'basic', tierTitle: 'KAIROS Basic' };
const [reconstructedLegacy] = toCartItems([legacyLine]) as FamilyTierQuoteItem[];
check(reconstructedLegacy.isComposable === false, 'a legacy RequestLine with no isComposable key reconstructs with isComposable: false');
check(resolveQuoteItemRole(reconstructedLegacy) === 'primary', 'a legacy RequestLine still resolves to primary, unchanged');

// ── The duplicate-key defect the audit found: primary + composable for the
//    SAME Family+Tier-Instance must reconstruct to DISTINCT keys. Before the
//    isComposable fix, both collapsed to the identical
//    "family:...:instance:...:primary" key. ──────────────────────────────
const primaryLine: RequestLine = { ...baseFamilyFields, tierId: 'enterprise' };
const [reconstructedPrimary, reconstructedComposableSibling] = toCartItems([primaryLine, composableLine]) as FamilyTierQuoteItem[];
const primaryKey = quoteItemKey(reconstructedPrimary);
const composableKey = quoteItemKey(reconstructedComposableSibling);
check(primaryKey !== composableKey, 'a primary and a composable RequestLine for the same Family+Tier-Instance reconstruct to DISTINCT quoteItemKey() values, not a Preact key collision');
check(composableKey.endsWith(':composable'), 'the composable line\'s key carries the :composable suffix quoteItemKey() defines');
check(primaryKey.endsWith(':primary'), 'the primary line\'s key carries the :primary suffix, unaffected by the sibling composable line');

// ── classifyQuoteItems() puts the reconstructed composable item in its own
//    bucket, never in familyMainItems, even when a real primary coexists. ──
const classified = classifyQuoteItems([reconstructedPrimary, reconstructedComposableSibling]);
check(classified.familyMainItems.length === 1 && classified.familyMainItems[0] === reconstructedPrimary, 'familyMainItems contains only the reconstructed primary line');
check(classified.familyComposableItems.length === 1 && classified.familyComposableItems[0] === reconstructedComposableSibling, 'familyComposableItems contains only the reconstructed composable line, never merged into familyMainItems');

console.log('Composable Request line contract passed.');
