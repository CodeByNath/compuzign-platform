// Contract: Upgrade Journey Finalisation — the auditor's "Finalise can
// capture a stale draft" finding. ComposableOfferBrowser live-syncs a
// customer edit only after a 400ms debounced preview resolves and onCommit
// updates the cart; without checking that the CURRENT local selection
// matches what is actually committed, clicking Finalise during that window
// could silently finalise an older draft, discarding the customer's latest
// edit. Proves isFinaliseBuildReady()/composableChoicesMatch() (the pure
// guard the component now uses) block Finalise for exactly this race and
// re-enable it only once the exact latest choice is committed — fixture-
// driven against the real exported functions, no DOM/timers/mounted
// component, same precedent as composable-quote-cart-contract.ts.

import { composableChoicesMatch, isFinaliseBuildReady } from '../resources/ts/components/package-builder/ComposableOfferBrowser';
import type { FamilyTierQuoteItem } from '../resources/ts/components/cost-builder/types';
import { COMPOSABLE_QUOTE_TIER_ID } from '../resources/ts/components/cost-builder/types';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Composable finalise race contract: ${message}`);
}

const PRIMARY_BASE = { tierPlatformId: 'CZT-BASIC01', tierEditionPlatformId: null as string | null };

function primaryItem(): FamilyTierQuoteItem {
  return {
    offer_type: 'family_tier',
    familyId: 'pcg_kairos', familyPlatformId: 'CZPG-KAIROS01', familyTitle: 'KAIROS',
    tierInstanceId: 'ti_kairos', tierInstancePlatformId: 'CZTG-KAIROS01',
    tierOccupantId: 'occ_basic', tierPlatformId: PRIMARY_BASE.tierPlatformId, tierEditionPlatformId: PRIMARY_BASE.tierEditionPlatformId,
    tierId: 'basic', tierTitle: 'Starter Cloud',
    price: 150, billingCycle: 'monthly', features: [], isAddon: false,
    minimumTermValue: null, minimumTermUnit: null,
  };
}

function committedDraft(quantity: number): FamilyTierQuoteItem {
  return {
    offer_type: 'family_tier',
    familyId: 'pcg_kairos', familyPlatformId: 'CZPG-KAIROS01', familyTitle: 'KAIROS',
    tierInstanceId: 'ti_kairos', tierInstancePlatformId: 'CZTG-KAIROS01',
    tierOccupantId: 'occ_composable', tierPlatformId: 'CZT-COMPOSABLE01', tierEditionPlatformId: null,
    tierId: COMPOSABLE_QUOTE_TIER_ID, tierTitle: 'Build Your Own',
    price: 50, billingCycle: 'monthly', features: [], isAddon: false, isComposable: true,
    composableSelection: [{ item_id: 'extra-storage', selected: true, quantity }],
    minimumTermValue: null, minimumTermUnit: null,
    upgradeDraftBase: { ...PRIMARY_BASE },
  };
}

const primary = primaryItem();

// ── 1. Existing committed draft, no pending edit: Finalise is ready ────────
{
  const initialCartItem = committedDraft(5);
  const currentChoice = [{ item_id: 'extra-storage', selected: true, quantity: 5 }];
  const ready = isFinaliseBuildReady({ context: 'upgrade_your_build', previewLoading: false, previewOk: true, currentChoice, initialCartItem, primaryItem: primary });
  check(ready, 'a committed draft whose selection matches the current local choice is ready to finalise');
}

// ── 2. New edit made, BEFORE any debounce/preview/commit has run ──────────
// (previewLoading is still false — the debounce timer hasn't even fired yet
// — this is exactly the window the auditor's reported race exploits).
{
  const initialCartItem = committedDraft(5); // still reflects the OLD quantity
  const currentChoice = [{ item_id: 'extra-storage', selected: true, quantity: 10 }]; // customer just changed it
  const ready = isFinaliseBuildReady({ context: 'upgrade_your_build', previewLoading: false, previewOk: true, currentChoice, initialCartItem, primaryItem: primary });
  check(!ready, 'Finalise is blocked the instant the local choice diverges from the committed draft, even before previewLoading turns true');
}

// ── 3. Debounce has now fired, preview request is in flight ───────────────
{
  const initialCartItem = committedDraft(5);
  const currentChoice = [{ item_id: 'extra-storage', selected: true, quantity: 10 }];
  const ready = isFinaliseBuildReady({ context: 'upgrade_your_build', previewLoading: true, previewOk: true, currentChoice, initialCartItem, primaryItem: primary });
  check(!ready, 'Finalise stays blocked while previewLoading is true, independent of the choice-match check');
}

// ── 4. The latest preview resolved successfully and onCommit updated the cart ──
{
  const initialCartItem = committedDraft(10); // onCommit has now updated it
  const currentChoice = [{ item_id: 'extra-storage', selected: true, quantity: 10 }];
  const ready = isFinaliseBuildReady({ context: 'upgrade_your_build', previewLoading: false, previewOk: true, currentChoice, initialCartItem, primaryItem: primary });
  check(ready, 'Finalise re-enables once the committed draft reflects the exact latest local choice');
}

// ── 5. Stale-response race: an older in-flight request commits the OLD ────
// choice AFTER the customer has already moved on to a newer local edit —
// must never re-enable Finalise for the stale committed value.
{
  const initialCartItem = committedDraft(5); // a late/stale response just committed the OLD quantity
  const currentChoice = [{ item_id: 'extra-storage', selected: true, quantity: 15 }]; // customer is already on a THIRD value
  const ready = isFinaliseBuildReady({ context: 'upgrade_your_build', previewLoading: false, previewOk: true, currentChoice, initialCartItem, primaryItem: primary });
  check(!ready, 'a stale response committing an old choice never re-enables Finalise for the customer\'s newer local edit');
}

// ── 6. A failed preview also blocks Finalise, even if the choice happens to match ──
{
  const initialCartItem = committedDraft(5);
  const currentChoice = [{ item_id: 'extra-storage', selected: true, quantity: 5 }];
  const ready = isFinaliseBuildReady({ context: 'upgrade_your_build', previewLoading: false, previewOk: false, currentChoice, initialCartItem, primaryItem: primary });
  check(!ready, 'Finalise is blocked when the last resolved preview failed, per the auditor\'s "pending or failed" requirement');
}

// ── 7. build_your_own context never offers Finalise, regardless of state ──
{
  const initialCartItem = committedDraft(5);
  const currentChoice = [{ item_id: 'extra-storage', selected: true, quantity: 5 }];
  const ready = isFinaliseBuildReady({ context: 'build_your_own', previewLoading: false, previewOk: true, currentChoice, initialCartItem, primaryItem: primary });
  check(!ready, 'Finalise is never offered outside the upgrade_your_build context');
}

// ── 8. composableChoicesMatch is order-independent ─────────────────────────
{
  const a = [{ item_id: 'x', selected: true, quantity: 1 }, { item_id: 'y', selected: true }];
  const b = [{ item_id: 'y', selected: true }, { item_id: 'x', selected: true, quantity: 1 }];
  check(composableChoicesMatch(a, b), 'composableChoicesMatch ignores array order');
  check(!composableChoicesMatch(a, [{ item_id: 'x', selected: true, quantity: 2 }, { item_id: 'y', selected: true }]), 'composableChoicesMatch detects a changed quantity');
}

console.log('Composable finalise race contract passed.');
