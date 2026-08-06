// Contract: the Cost Builder in-card Tier Edition switch (Phase 7).
//
// Exercises the actual production function the switch renders from —
// resolveEffectiveTierDisplay — the same "test the real exported function,
// not a static type assertion" convention tier-overview-is-addon-contract.ts
// already established for is_addon. Also source-scans PricingTiers.tsx to
// confirm the switch changes only what one card DISPLAYS, never which Tier
// is selected, never the normal/add-on split, and never introduces a second
// card or comparison row.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveEffectiveTierDisplay } from '../resources/ts/components/cost-builder/PricingTiers';
import type { PricingTierData } from '../resources/ts/api/types/cost-builder';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Tier Edition switch contract: ${message}`);
}

// ── resolveEffectiveTierDisplay: pure logic ──────────────────────────────────

const legacyTier: PricingTierData = {
  price: 49, billing_cycle: 'monthly', inclusions: [{ id: 'inc-1', label: 'Base inclusion' }],
  features: [], is_addon: false,
};
const legacyDisplay = resolveEffectiveTierDisplay(legacyTier, 'monthly', null);
check(legacyDisplay.price === 49, 'a Tier with no edition_options resolves its own price unchanged');
check(legacyDisplay.billingCycle === 'monthly', 'a Tier with no edition_options resolves its own billing_cycle unchanged');
check(legacyDisplay.selectedEdition === null, 'a Tier with no edition_options has no selected Edition');

const tierWithEditions: PricingTierData = {
  price: 49, billing_cycle: 'monthly', inclusions: [{ id: 'inc-occ', label: 'Occupant inclusion' }],
  features: [], is_addon: false,
  edition_options: [
    { id: 'edt_a', label: 'Monthly', price: 49, contact: false, billing_cycle: 'monthly', minimum_term_value: null, minimum_term_unit: null, inclusions_override: [], is_default: true },
    { id: 'edt_b', label: 'Annual', price: 490, contact: false, billing_cycle: 'annually', minimum_term_value: 12, minimum_term_unit: 'month', inclusions_override: [{ id: 'inc-edt', label: 'Edition-specific inclusion' }], is_default: false },
  ],
};

const beforeSwitch = resolveEffectiveTierDisplay(tierWithEditions, 'monthly', null);
check(beforeSwitch.price === 49, 'before any switch, the Tier\'s own resolved-default price is shown (the backend default, not the frontend guessing)');
check(beforeSwitch.selectedEdition === null, 'before any switch, no Edition is locally selected — the switch is inert until touched');

const afterSwitch = resolveEffectiveTierDisplay(tierWithEditions, 'monthly', 'edt_b');
check(afterSwitch.price === 490, 'switching to a different Edition shows THAT Edition\'s own price');
check(afterSwitch.billingCycle === 'annually', 'switching to a different Edition shows THAT Edition\'s own billing_cycle');
check(afterSwitch.inclusionLabels.includes('Edition-specific inclusion'), 'switching to a different Edition with its own override shows that override, not the occupant\'s');
check(afterSwitch.selectedEdition?.id === 'edt_b', 'the resolved selectedEdition matches the switch');

const inheritedSwitch = resolveEffectiveTierDisplay(tierWithEditions, 'monthly', 'edt_a');
check(
  inheritedSwitch.inclusionLabels.includes('Occupant inclusion'),
  'switching to an Edition with an empty declaration override still inherits the occupant\'s own inclusions',
);

// ── Source scan: the switch never touches Tier selection or the Add-on split ─

const root = resolve(import.meta.dirname, '..');
const pricingTiers = readFileSync(resolve(root, 'resources/ts/components/cost-builder/PricingTiers.tsx'), 'utf8');

check(
  pricingTiers.includes('isActive && \'cz-cost-builder__tier--selected\''),
  'the selected-Tier visual state still derives from the same isActive prop the Edition switch never touches',
);
check(
  !pricingTiers.match(/setSelectedEditionId[^)]*onSelect|onSelect[^)]*setSelectedEditionId/),
  'the Edition switch handler and the Tier-selection handler (onSelect/onClick) are never wired together',
);
check(
  pricingTiers.includes("stopPropagation()"),
  'clicking an Edition switch button stops propagation so it can never also trigger the card\'s own Tier-selection onClick',
);
check(
  pricingTiers.includes('const normalTiers = tiers.filter((tier) => tier.id in pricing.tiers && !pricing.tiers[tier.id].is_addon)')
    && pricingTiers.includes('const addonTiers = tiers.filter((tier) => tier.id in pricing.tiers && pricing.tiers[tier.id].is_addon)'),
  'the normal-Tier / Add-on split still derives from is_addon alone, unaffected by edition_options',
);
check(
  (pricingTiers.match(/function TierCard/g) ?? []).length === 1,
  'there is still exactly one TierCard renderer shared by both strips — no second/Edition-specific card component',
);
check(
  !pricingTiers.includes('ComparePlans') && !pricingTiers.match(/edition.*compare|compare.*edition/i),
  'PricingTiers introduces no comparison-row concept of its own for Editions',
);

console.log('Tier Edition switch contract checks passed.');
