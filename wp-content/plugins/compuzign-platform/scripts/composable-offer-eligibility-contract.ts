// Contract: resolveComposableEligibleRows() (ComposableOfferBrowser.tsx) —
// project-work/2026-09-06-tier-catalogue-admin-ux-consolidation.md, Phase 1.
//
// This function was extracted verbatim out of ComposableOfferBrowser's own
// `rows` useMemo (the join it already used to decide `if (!offer || !policy
// || rows.length === 0) return null`) so a future caller outside this
// component — the planned "Upgrade your build" gate in
// FamilyTierAdapter.tsx — can ask the identical "does this Family/Tier have
// a real catalogue" question without re-deriving this join as a second,
// parallel business rule. This contract locks the exact join semantics the
// extraction must preserve:
//   1. no composable_offer at all -> no rows;
//   2. an offer with no customer_policy -> no rows (offer alone never
//      authorizes anything — the policy is the sole authorization source);
//   3. an inclusion with no matching policy item_id -> excluded (never
//      "offered anyway");
//   4. a policy item with no matching inclusion -> excluded (a policy can
//      reference nothing that isn't a still-published inclusion);
//   5. a matched inclusion+policy pair -> included, carrying the
//      inclusion's browse metadata (label/unit_price/categories/service)
//      plus the policy entry verbatim;
//   6. row order follows policy.items order, not inclusions order;
//   7. a selected Edition sources its rows from its OWN published
//      catalogue, never the occupant Default's;
//   8-11 (project-work/2026-09-10-composable-edition-catalogue-
//      filtering.md): an Edition published with an empty catalogue offers
//      nothing rather than re-showing Default's rows (inheritance is
//      resolved server-side now, not re-derived here); an inheriting
//      Edition resolves the occupant's own rows through its own published
//      catalogue; an Edition-only policy item joins its own Edition-only
//      row instead of being dropped against Default's; and switching the
//      cue back to Default returns the occupant's catalogue.

import { resolveComposableEligibleRows } from '../resources/ts/components/package-builder/ComposableOfferBrowser';
import type { CustomerPolicyItem, PackageBuilderFamily, PricingEditionOption, PricingTierData, ServiceInclusion } from '../resources/ts/api/types/cost-builder';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Composable offer eligibility contract: ${message}`);
}

function family(pricing: Partial<PackageBuilderFamily['pricing']>): PackageBuilderFamily {
  return {
    family_id: 'pcg_test', family_platform_id: 'CZPG-TEST01', title: 'Test Family',
    description: '', tier_instance_id: 'ti_test', tier_instance_platform_id: 'CZTG-TEST01',
    popular_tier: null, popular_label: null, included_categories: [],
    pricing: { tiers: {}, ...pricing },
  } as unknown as PackageBuilderFamily;
}

function inclusion(overrides: Partial<ServiceInclusion>): ServiceInclusion {
  return { id: 'x', label: 'X', ...overrides };
}

function policyItem(overrides: Partial<CustomerPolicyItem>): CustomerPolicyItem {
  return {
    item_id: 'x',
    mode: 'optional',
    default_selected: false,
    quantity: null,
    price_option: { mode: 'fixed', allowed_price_option_ids: null, default_price_option_id: null },
    featured: false,
    ...overrides,
  };
}

function offer(overrides: Partial<PricingTierData>): PricingTierData {
  return {
    price: null, billing_cycle: '', inclusions: [], features: [],
    ...overrides,
  } as PricingTierData;
}

function edition(overrides: Partial<PricingEditionOption>): PricingEditionOption {
  return {
    id: 'ed', label: 'Edition', price: null, contact: false, billing_cycle: null,
    minimum_term_value: null, minimum_term_unit: null, inclusions_override: [],
    ...overrides,
  } as PricingEditionOption;
}

// ── 1. No composable_offer at all -> no rows ────────────────────────────────

check(
  resolveComposableEligibleRows(family({ composable_offer: null })).length === 0,
  'a Family with no composable_offer has zero eligible rows',
);
check(
  resolveComposableEligibleRows(family({})).length === 0,
  'a Family whose pricing omits composable_offer entirely has zero eligible rows',
);

// ── 2. Offer present, customer_policy absent -> no rows ─────────────────────

check(
  resolveComposableEligibleRows(family({
    composable_offer: offer({ inclusions: [inclusion({ id: 'a', label: 'A' })], customer_policy: null }),
  })).length === 0,
  'an offer with inclusions but no customer_policy has zero eligible rows — the offer alone never authorizes anything',
);

// ── 3. Inclusion with no matching policy item_id -> excluded ────────────────

const onlyPolicyMatched = resolveComposableEligibleRows(family({
  composable_offer: offer({
    inclusions: [inclusion({ id: 'matched', label: 'Matched' }), inclusion({ id: 'unmatched', label: 'Unmatched' })],
    customer_policy: { items: [policyItem({ item_id: 'matched' })] },
  }),
}));
check(onlyPolicyMatched.length === 1, 'an inclusion with no matching policy entry is excluded, not offered anyway');
check(onlyPolicyMatched[0].item_id === 'matched', 'the surviving row is the one the policy actually authorizes');

// ── 4. Policy item with no matching inclusion -> excluded ───────────────────

const onlyInclusionMatched = resolveComposableEligibleRows(family({
  composable_offer: offer({
    inclusions: [inclusion({ id: 'real', label: 'Real' })],
    customer_policy: { items: [policyItem({ item_id: 'real' }), policyItem({ item_id: 'stale-reference' })] },
  }),
}));
check(onlyInclusionMatched.length === 1, 'a policy item referencing a since-removed/unpublished inclusion is excluded');
check(onlyInclusionMatched[0].item_id === 'real', 'the surviving row is the one with a real inclusion behind it');

// ── 5. Matched pair carries browse metadata + the policy entry verbatim ─────

const featuredPolicy = policyItem({ item_id: 'seats', mode: 'required', featured: true });
const matched = resolveComposableEligibleRows(family({
  composable_offer: offer({
    inclusions: [inclusion({ id: 'seats', label: 'Extra Seats', unit_price: 25, categories: ['compute'], service: 'Kairos' })],
    customer_policy: { items: [featuredPolicy] },
  }),
}));
check(matched.length === 1, 'exactly one row for the one matched pair');
check(matched[0].label === 'Extra Seats' && matched[0].unitPrice === 25, 'browse metadata comes from the inclusion');
check(matched[0].categories[0] === 'compute' && matched[0].service === 'Kairos', 'categories/service come from the inclusion');
check(matched[0].policy === featuredPolicy, 'the policy entry is carried through verbatim, not copied/rebuilt');

// ── 6. Row order follows policy.items order, not inclusions order ───────────

const ordered = resolveComposableEligibleRows(family({
  composable_offer: offer({
    inclusions: [inclusion({ id: 'b', label: 'B' }), inclusion({ id: 'a', label: 'A' })],
    customer_policy: { items: [policyItem({ item_id: 'a' }), policyItem({ item_id: 'b' })] },
  }),
}));
check(ordered.map((row) => row.item_id).join(',') === 'a,b', 'row order follows policy.items order, not the inclusions array order');

// ── 7. A selected Edition with a non-empty inclusions_override uses its
//    OWN rows/prices, not the occupant Default's offer.inclusions ──────────
//    project-work/2026-09-06-tier-catalogue-admin-ux-consolidation.md,
//    defect 2 — restores the inclusionSource selection lost when a584ede0
//    was reverted and rebuilt in 0a13fd14.

const editionOverride = edition({
  id: 'ed_pro',
  customer_policy: { items: [policyItem({ item_id: 'seats', mode: 'required' })] },
  inclusions_override: [inclusion({ id: 'seats', label: 'Edition-only Seats', unit_price: 99 })],
});
const editionRows = resolveComposableEligibleRows(family({
  composable_offer: offer({
    inclusions: [inclusion({ id: 'seats', label: 'Default Seats', unit_price: 25 })],
    customer_policy: { items: [policyItem({ item_id: 'seats', mode: 'required' })] },
    edition_options: [editionOverride],
  }),
}), 'ed_pro');
check(editionRows.length === 1, 'the selected Edition resolves exactly one eligible row');
check(editionRows[0].label === 'Edition-only Seats' && editionRows[0].unitPrice === 99, 'a non-empty inclusions_override sources the row, never the occupant Default\'s offer.inclusions');

// ── 8. A selected Edition with an EMPTY inclusions_override publishes an
//    empty catalogue — it does NOT silently fall back to the occupant
//    Default's rows. project-work/2026-09-10-composable-edition-catalogue-
//    filtering.md: inheritance is now resolved server-side
//    (PackageRepository::compileOccupantSlotForCostBuilder() publishes the
//    occupant's own resolved rows as an Edition's catalogue when that
//    Edition has no Rate Sheet binding of its own), so a client-side copy of
//    that rule can only re-show Default rows for an Edition that genuinely
//    has none — which is exactly how every Edition tab ended up rendering
//    the identical Default catalogue.

const editionEmptyOverride = edition({
  id: 'ed_basic',
  customer_policy: { items: [policyItem({ item_id: 'seats', mode: 'required' })] },
  inclusions_override: [],
});
const emptyEditionRows = resolveComposableEligibleRows(family({
  composable_offer: offer({
    inclusions: [inclusion({ id: 'seats', label: 'Default Seats', unit_price: 25 })],
    customer_policy: { items: [policyItem({ item_id: 'seats', mode: 'required' })] },
    edition_options: [editionEmptyOverride],
  }),
}), 'ed_basic');
check(emptyEditionRows.length === 0, 'an Edition published with an empty catalogue offers no rows — never the occupant Default\'s rows re-shown under that Edition\'s tab');

// ── 9. Server-side inheritance is what an inheriting Edition looks like on
//    the wire: the occupant's own resolved rows, published ON the Edition.
//    The rows must resolve identically to Default's, through the Edition's
//    own published catalogue rather than a client-side fallback.

const defaultRows = [inclusion({ id: 'seats', label: 'Default Seats', unit_price: 25 })];
const inheritingRows = resolveComposableEligibleRows(family({
  composable_offer: offer({
    inclusions: defaultRows,
    customer_policy: { items: [policyItem({ item_id: 'seats', mode: 'required' })] },
    edition_options: [edition({ id: 'ed_inherit', customer_policy: null, inclusions_override: defaultRows })],
  }),
}), 'ed_inherit');
check(inheritingRows.length === 1, 'an Edition inheriting the occupant\'s catalogue server-side resolves the same single row');
check(inheritingRows[0].label === 'Default Seats' && inheritingRows[0].unitPrice === 25, 'the inherited row carries the occupant\'s own resolved browse metadata');

// ── 10. An Edition policy item that exists ONLY on that Edition's own
//    catalogue joins instead of being dropped — the customer-visible half of
//    the projection defect: the policy used to be joined against Default's
//    rows, so an Edition-only row silently disappeared.

const editionOnlyRows = resolveComposableEligibleRows(family({
  composable_offer: offer({
    inclusions: [inclusion({ id: 'seats', label: 'Default Seats', unit_price: 25 })],
    customer_policy: { items: [policyItem({ item_id: 'seats', mode: 'required' })] },
    edition_options: [edition({
      id: 'ed_sovereign',
      customer_policy: { items: [policyItem({ item_id: 'gpu', mode: 'required' })] },
      inclusions_override: [inclusion({ id: 'gpu', label: 'GPU Node', unit_price: 500, categories: ['compute'], service: 'Kairos' })],
    })],
  }),
}), 'ed_sovereign');
check(editionOnlyRows.length === 1, 'an Edition-only policy item joins its own Edition-only row');
check(editionOnlyRows[0].item_id === 'gpu' && editionOnlyRows[0].unitPrice === 500, 'the joined row is the Edition\'s own, with its own price');
check(editionOnlyRows[0].categories[0] === 'compute' && editionOnlyRows[0].service === 'Kairos', 'Edition-only rows carry their own browse metadata');

// ── 11. Switching the cue back to Default (editionId null) returns the
//    occupant's own rows — the tab switch is a real content switch in both
//    directions, never a one-way latch onto an Edition catalogue.

const bothDirections = family({
  composable_offer: offer({
    inclusions: [inclusion({ id: 'seats', label: 'Default Seats', unit_price: 25 })],
    customer_policy: { items: [policyItem({ item_id: 'seats', mode: 'required' })] },
    edition_options: [edition({
      id: 'ed_sovereign',
      customer_policy: { items: [policyItem({ item_id: 'gpu', mode: 'required' })] },
      inclusions_override: [inclusion({ id: 'gpu', label: 'GPU Node', unit_price: 500 })],
    })],
  }),
});
check(resolveComposableEligibleRows(bothDirections, 'ed_sovereign')[0].item_id === 'gpu', 'selecting the Edition cue renders that Edition\'s catalogue');
check(resolveComposableEligibleRows(bothDirections, null)[0].item_id === 'seats', 'returning to the Default cue renders the occupant\'s own catalogue again');
check(resolveComposableEligibleRows(bothDirections).length === 1, 'the coarse no-editionId eligibility caller is unaffected — still the occupant\'s own rows');

console.log('Composable offer eligibility contract: PASS');
