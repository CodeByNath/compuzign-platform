// Contract: draftPreferredDetail()'s customer_policy handling — Phase 2B1.1
// (Admin "Customer Selection Rules" drawer).
//
// TierDrafts.customer_policy is wrapped ({value: CustomerPolicy | null} |
// null), unlike every sibling draft field, because a sanitized policy can
// itself legitimately be null (an explicit clear) and drafts.customer_policy
// === null already means "no pending draft at all"
// (PackageStationController::saveComposableOccupantModule()'s own
// convention — see docs/code-map/tier-composable-occupant-customer-policy.md).
// This locks that draftPreferredDetail() unwraps the three distinct states
// correctly: no draft falls back to the settled value; an explicit pending
// clear ({value: null}) reads as null, never silently falling back to the
// settled value; a pending policy reads as that policy.

import { draftPreferredDetail } from '../resources/ts/package-station/usePackageStation';
import type { PackageStationTier } from '../resources/ts/package-station/usePackageStation';
import type { CustomerPolicy } from '../resources/ts/api/types/cost-builder';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Tier customer policy draft contract: ${message}`);
}

const SETTLED_POLICY: CustomerPolicy = {
  items: [{ item_id: 'hosting', mode: 'required', default_selected: false, quantity: null, price_option: { mode: 'fixed', allowed_price_option_ids: null, default_price_option_id: null }, featured: false }],
};

function baseSlot(overrides: Partial<PackageStationTier>): PackageStationTier {
  return {
    occupant_id: 'occ_1', platform_id: 'CZT-1', addon_platform_id: '', default_leg_platform_id: '',
    headline_leg_id: '', label: 'Build Your Own', ideal_for: '',
    audience_groups: ['personal_business', 'enterprise'],
    price: null, contact: false, billing_cycle: 'monthly',
    minimum_term_value: null, minimum_term_unit: null, from_month: null, to_month: null, legs: [],
    rate_sheet_id: 'rs_1', inclusions_override: [], rate_sheet_items: [], rate_sheet_selections: [],
    features: [], faq_refs: [], enabled: true, is_addon: false,
    drafts: { overview: null, pricing_rules: null, features: null, faqs: null, customer_policy: null },
    module_status: { overview: 'settled', pricing_rules: 'settled', features: 'settled', faqs: 'settled', customer_policy: 'settled' },
    ...overrides,
  };
}

// ── 1. No draft at all — falls back to the settled value ────────────────────

const slotNoDraft = baseSlot({ customer_policy: SETTLED_POLICY });
const detailNoDraft = draftPreferredDetail(slotNoDraft);
check(detailNoDraft.customer_policy === SETTLED_POLICY, '1. drafts.customer_policy === null falls back to the settled occupant value');

const slotNoDraftNoSettled = baseSlot({ customer_policy: null });
check(draftPreferredDetail(slotNoDraftNoSettled).customer_policy === null, '1b. no draft, no settled value either — null, not undefined');

// ── 2. An explicit pending CLEAR ({value: null}) reads as null — never
//    silently falling back to the still-present settled value ─────────────

const slotExplicitClear = baseSlot({
  customer_policy: SETTLED_POLICY,
  drafts: { overview: null, pricing_rules: null, features: null, faqs: null, customer_policy: { value: null } },
});
const detailExplicitClear = draftPreferredDetail(slotExplicitClear);
check(detailExplicitClear.customer_policy === null, '2. an explicit pending clear ({value: null}) reads as null, NOT the settled policy still sitting behind it — this is the exact distinction the wrapper exists to make');

// ── 3. A pending policy draft reads as that policy, not the settled one ────

const DRAFT_POLICY: CustomerPolicy = {
  items: [{ item_id: 'hosting', mode: 'optional', default_selected: true, quantity: { default: 2, min: 1, max: 5, step: 1 }, price_option: { mode: 'fixed', allowed_price_option_ids: null, default_price_option_id: null }, featured: true }],
};
const slotWithDraft = baseSlot({
  customer_policy: SETTLED_POLICY,
  drafts: { overview: null, pricing_rules: null, features: null, faqs: null, customer_policy: { value: DRAFT_POLICY } },
});
const detailWithDraft = draftPreferredDetail(slotWithDraft);
check(detailWithDraft.customer_policy === DRAFT_POLICY, '3. a pending policy draft reads as the draft value, not the settled one behind it');
check(detailWithDraft.customer_policy !== SETTLED_POLICY, '3b. genuinely a different object, not a coincidental reference match');

console.log('Tier customer policy draft contract: PASS');
