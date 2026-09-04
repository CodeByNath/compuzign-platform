import {
  composableDraftIsStale,
  deriveComposedProjection,
  finaliseUpgradeQuoteDraft,
  hasUnfinalisedUpgradeDraft,
  removeFamilyTierSystemQuoteItems,
  replaceFamilyNormalQuoteItem,
} from '../resources/ts/utils/quote';
import { startingPaymentsByCycle } from '../resources/ts/utils/paymentSummary';
import { COMPOSABLE_QUOTE_TIER_ID } from '../resources/ts/components/cost-builder/types';
import type { CartItem, ComposedUpgradeBase, ComposedUpgradeExtras, FamilyTierQuoteItem } from '../resources/ts/components/cost-builder/types';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Upgrade quote draft contract: ${message}`);
}

const FAMILY_ID = 'fam-1';
const FAMILY_PLATFORM_ID = 'CZPG-1';
const TIER_INSTANCE_ID = 'inst-1';
const TIER_INSTANCE_PLATFORM_ID = 'CZTG-1';

function primaryItem(overrides: Partial<FamilyTierQuoteItem> = {}): FamilyTierQuoteItem {
  return {
    offer_type: 'family_tier',
    familyId: FAMILY_ID,
    familyPlatformId: FAMILY_PLATFORM_ID,
    familyTitle: 'KAIROS',
    tierInstanceId: TIER_INSTANCE_ID,
    tierInstancePlatformId: TIER_INSTANCE_PLATFORM_ID,
    tierOccupantId: 'occ-basic',
    tierPlatformId: 'CZT-BASIC',
    tierEditionPlatformId: null,
    tierId: 'basic',
    tierTitle: 'Starter Cloud',
    price: 150,
    billingCycle: 'monthly',
    features: ['2 vCPU'],
    inclusionItems: [{ id: 'base-item', label: '2 vCPU', quantity: 1 }],
    isAddon: false,
    minimumTermValue: 12,
    minimumTermUnit: 'months',
    planDurationMonths: 12,
    legPaymentSummaries: [
      { source: 'base-leg', billingCycle: 'monthly', price: 150, startMonth: 0, endMonth: 12, isOngoing: false, occurrenceMonths: [0, 1], subtotal: 1800 },
    ],
    ...overrides,
  };
}

function draftItem(base: { tierPlatformId: string; tierEditionPlatformId: string | null }, overrides: Partial<FamilyTierQuoteItem> = {}): FamilyTierQuoteItem {
  return {
    offer_type: 'family_tier',
    familyId: FAMILY_ID,
    familyPlatformId: FAMILY_PLATFORM_ID,
    familyTitle: 'KAIROS',
    tierInstanceId: TIER_INSTANCE_ID,
    tierInstancePlatformId: TIER_INSTANCE_PLATFORM_ID,
    tierOccupantId: 'occ-composable',
    tierPlatformId: 'CZT-COMPOSABLE',
    tierEditionPlatformId: null,
    tierId: COMPOSABLE_QUOTE_TIER_ID,
    tierTitle: 'Build Your Own',
    price: 50,
    billingCycle: 'monthly',
    features: ['Extra Storage'],
    inclusionItems: [{ id: 'upgrade-item', label: 'Extra Storage', quantity: 1 }],
    isAddon: false,
    isComposable: true,
    composableSelection: [{ item_id: 'upgrade-item', selected: true }],
    minimumTermValue: null,
    minimumTermUnit: null,
    legPaymentSummaries: [
      { source: 'upgrade-leg', billingCycle: 'monthly', price: 50, startMonth: 0, endMonth: 12, isOngoing: false, occurrenceMonths: [0, 1], subtotal: 600 },
    ],
    upgradeDraftBase: base,
    ...overrides,
  };
}

function addonItem(overrides: Partial<FamilyTierQuoteItem> = {}): FamilyTierQuoteItem {
  return {
    offer_type: 'family_tier',
    familyId: FAMILY_ID,
    familyPlatformId: FAMILY_PLATFORM_ID,
    familyTitle: 'KAIROS',
    tierInstanceId: TIER_INSTANCE_ID,
    tierInstancePlatformId: TIER_INSTANCE_PLATFORM_ID,
    tierOccupantId: 'occ-addon',
    tierPlatformId: 'CZT-ADDON',
    tierEditionPlatformId: null,
    tierId: 'premium',
    tierTitle: 'Backup Add-on',
    price: 20,
    billingCycle: 'monthly',
    features: [],
    isAddon: true,
    minimumTermValue: null,
    minimumTermUnit: null,
    ...overrides,
  };
}

// ── composableDraftIsStale ───────────────────────────────────────────────────

{
  const primary = primaryItem();
  const draft = draftItem({ tierPlatformId: primary.tierPlatformId, tierEditionPlatformId: primary.tierEditionPlatformId });
  check(!composableDraftIsStale(draft, [primary, draft]), 'a draft matching the current primary is not stale');
}
{
  const draft = draftItem({ tierPlatformId: 'CZT-BASIC', tierEditionPlatformId: null });
  check(composableDraftIsStale(draft, [draft]), 'a draft with no matching primary at all is stale');
}
{
  const differentPrimary = primaryItem({ tierPlatformId: 'CZT-PRO', tierTitle: 'Business Pro' });
  const draft = draftItem({ tierPlatformId: 'CZT-BASIC', tierEditionPlatformId: null });
  check(composableDraftIsStale(draft, [differentPrimary, draft]), 'a draft whose base was replaced with a different Tier/Edition is stale');
}
{
  const finalised = draftItem({ tierPlatformId: 'CZT-BASIC', tierEditionPlatformId: null }, { upgradeDraftBase: undefined, isComposedUpgrade: true });
  check(!composableDraftIsStale(finalised, [finalised]), 'a finalised line (no upgradeDraftBase) is never stale');
}

// ── replaceFamilyNormalQuoteItem drops a stale draft, keeps a valid one ──────

{
  const primary = primaryItem();
  const draft = draftItem({ tierPlatformId: primary.tierPlatformId, tierEditionPlatformId: primary.tierEditionPlatformId });
  const newPrimary = primaryItem({ tierPlatformId: 'CZT-PRO', tierTitle: 'Business Pro' });
  const result = replaceFamilyNormalQuoteItem([primary, draft], newPrimary);
  check(!result.includes(draft), 'replacing the primary with a DIFFERENT Tier/Edition drops the now-stale draft');
  check(result.includes(newPrimary), 'the new primary is present after replace');
}
{
  const primary = primaryItem();
  const draft = draftItem({ tierPlatformId: primary.tierPlatformId, tierEditionPlatformId: primary.tierEditionPlatformId });
  const samePrimaryAgain = primaryItem();
  const result = replaceFamilyNormalQuoteItem([primary, draft], samePrimaryAgain);
  check(result.includes(draft), 'replacing the primary with the SAME Tier/Edition unchanged keeps the draft');
}
{
  const primary = primaryItem();
  const draft = draftItem({ tierPlatformId: primary.tierPlatformId, tierEditionPlatformId: primary.tierEditionPlatformId }, { upgradeDraftBase: undefined, isComposedUpgrade: true });
  const newPrimary = primaryItem({ tierPlatformId: 'CZT-PRO', tierTitle: 'Business Pro' });
  const result = replaceFamilyNormalQuoteItem([primary, draft], newPrimary);
  check(result.includes(draft), 'a finalised composed line survives the primary being replaced');
}

// ── removeFamilyTierSystemQuoteItems drops a stale draft and add-ons, keeps a finalised line ──

{
  const primary = primaryItem();
  const draft = draftItem({ tierPlatformId: primary.tierPlatformId, tierEditionPlatformId: primary.tierEditionPlatformId });
  const addon = addonItem();
  const result = removeFamilyTierSystemQuoteItems([primary, draft, addon], FAMILY_ID, TIER_INSTANCE_ID);
  check(!result.includes(primary), 'primary is removed');
  check(!result.includes(addon), 'add-on is removed alongside the primary (existing cascade)');
  check(!result.includes(draft), 'the now-stale draft (its base is gone) is removed too');
}
{
  const primary = primaryItem();
  const finalised = draftItem({ tierPlatformId: primary.tierPlatformId, tierEditionPlatformId: primary.tierEditionPlatformId }, { upgradeDraftBase: undefined, isComposedUpgrade: true });
  const result = removeFamilyTierSystemQuoteItems([primary, finalised], FAMILY_ID, TIER_INSTANCE_ID);
  check(result.includes(finalised), 'a finalised composed line survives the primary being removed entirely');
}

// ── hasUnfinalisedUpgradeDraft ───────────────────────────────────────────────

{
  const primary = primaryItem();
  const draft = draftItem({ tierPlatformId: primary.tierPlatformId, tierEditionPlatformId: primary.tierEditionPlatformId });
  check(hasUnfinalisedUpgradeDraft([primary, draft]), 'a valid draft counts as unfinalised');
  const stale = draftItem({ tierPlatformId: 'CZT-GONE', tierEditionPlatformId: null });
  check(hasUnfinalisedUpgradeDraft([stale]), 'a stale draft still counts as unfinalised (it must be finalised or removed, not silently submitted)');
  const finalised = draftItem({ tierPlatformId: primary.tierPlatformId, tierEditionPlatformId: primary.tierEditionPlatformId }, { upgradeDraftBase: undefined, isComposedUpgrade: true });
  check(!hasUnfinalisedUpgradeDraft([primary, finalised]), 'a finalised line does not block submission');
  check(!hasUnfinalisedUpgradeDraft([primary]), 'no composable line at all does not block submission');
}

// ── deriveComposedProjection ─────────────────────────────────────────────────

{
  const base: ComposedUpgradeBase = {
    tierOccupantId: 'occ-basic', tierPlatformId: 'CZT-BASIC', tierEditionPlatformId: null,
    tierId: 'basic', tierTitle: 'Starter Cloud', tierEditionTitle: null,
    inclusionItems: [{ id: 'shared-item', label: 'Storage', quantity: 10 }],
    legPaymentSummaries: [{ source: 'base-leg', billingCycle: 'monthly', price: 150, startMonth: 0, endMonth: 12, isOngoing: false, occurrenceMonths: [0], subtotal: 1800 }],
    price: 150, billingCycle: 'monthly', minimumTermValue: 12, minimumTermUnit: 'months', planDurationMonths: 12,
  };
  const upgrade: ComposedUpgradeExtras = {
    tierOccupantId: 'occ-composable', tierPlatformId: 'CZT-COMPOSABLE',
    inclusionItems: [{ id: 'shared-item', label: 'Storage', quantity: 5 }],
    legPaymentSummaries: [{ source: 'upgrade-leg', billingCycle: 'monthly', price: 50, startMonth: 0, endMonth: 12, isOngoing: false, occurrenceMonths: [0], subtotal: 600 }],
    price: 50, billingCycle: 'monthly', minimumTermValue: null, minimumTermUnit: null,
    composableSelection: [{ item_id: 'shared-item', selected: true }],
  };
  const projection = deriveComposedProjection(base, upgrade);
  check(projection.inclusionItems!.length === 2, 'inclusionItems is the concatenation of both children, no dedup even on a shared item_id');
  check(projection.inclusionItems![0].provenance === 'base' && projection.inclusionItems![1].provenance === 'upgrade', 'each inclusion entry is tagged with its correct provenance');
  check(projection.legPaymentSummaries!.length === 2, 'legPaymentSummaries is the concatenation of both children');
  check(projection.legPaymentSummaries![0].provenance === 'base' && projection.legPaymentSummaries![1].provenance === 'upgrade', 'each stream entry is tagged with its correct provenance');
  check(projection.price === base.price && projection.billingCycle === base.billingCycle, 'headline price/cycle come from base only');
  check(projection.minimumTermValue === base.minimumTermValue && projection.minimumTermUnit === base.minimumTermUnit, 'commitment comes from base only, never the upgrade');
  check(projection.planDurationMonths === base.planDurationMonths, 'plan duration comes from base only');
}

// ── finaliseUpgradeQuoteDraft ────────────────────────────────────────────────

{
  const primary = primaryItem();
  const draft = draftItem({ tierPlatformId: primary.tierPlatformId, tierEditionPlatformId: primary.tierEditionPlatformId });
  const addon = addonItem();
  const items: CartItem[] = [primary, draft, addon];
  const result = finaliseUpgradeQuoteDraft(items, FAMILY_ID, TIER_INSTANCE_ID);

  check(!result.includes(primary), 'finalisation removes the primary line');
  check(!result.includes(addon), 'finalisation removes add-on lines (existing primary-removal cascade), never orphans them');
  const finalItem = result.find((item) => (item as FamilyTierQuoteItem).isComposedUpgrade) as FamilyTierQuoteItem | undefined;
  check(!!finalItem, 'the composable line is replaced with a finalised composed item');
  check(finalItem!.upgradeDraftBase === undefined, 'the draft marker is cleared on finalisation');
  check(finalItem!.composedBase?.tierPlatformId === primary.tierPlatformId, 'composedBase carries the exact base identity');
  check(finalItem!.composedUpgrade?.tierPlatformId === draft.tierPlatformId, 'composedUpgrade carries the exact upgrade occupant identity');
  check(finalItem!.tierId === COMPOSABLE_QUOTE_TIER_ID && finalItem!.tierTitle === 'Build Your Own', 'top-level identity stays the composable occupant\'s own category label, never the base\'s');
  check(finalItem!.inclusionItems!.length === 2, 'top-level inclusionItems is the derived projection, one entry per child');
  check(finalItem!.legPaymentSummaries!.length === 2, 'top-level legPaymentSummaries is the derived projection, one entry per child');
}
{
  // No-op cases: absent or stale draft.
  const primary = primaryItem();
  const noDraft = finaliseUpgradeQuoteDraft([primary], FAMILY_ID, TIER_INSTANCE_ID);
  check(noDraft === [primary][0] || noDraft.length === 1, 'finalising with no draft present is a no-op');

  const staleDraft = draftItem({ tierPlatformId: 'CZT-GONE', tierEditionPlatformId: null });
  const items = [primary, staleDraft];
  const result = finaliseUpgradeQuoteDraft(items, FAMILY_ID, TIER_INSTANCE_ID);
  check(result === items, 'finalising a stale draft (base no longer matches) is a no-op, not a throw');
}

// ── legacy items are untouched by every new predicate ────────────────────────

{
  const legacyPrimary = primaryItem();
  const legacyComposable = draftItem({ tierPlatformId: legacyPrimary.tierPlatformId, tierEditionPlatformId: null }, { upgradeDraftBase: undefined });
  check(!composableDraftIsStale(legacyComposable, [legacyPrimary, legacyComposable]), 'a legacy standalone composable (no upgradeDraftBase at all) is never treated as a draft');
  check(!hasUnfinalisedUpgradeDraft([legacyPrimary, legacyComposable]), 'a legacy standalone composable never blocks submission');
  const afterRemove = removeFamilyTierSystemQuoteItems([legacyPrimary, legacyComposable], FAMILY_ID, TIER_INSTANCE_ID);
  check(afterRemove.includes(legacyComposable), 'a legacy standalone composable survives primary removal exactly as before this feature existed');
}

// ── Production live-validation regression scenario (KAIROS — IaaS) ──────────
// Reproduces the auditor's exact browser scenario: an exact base Tier
// (Starter Cloud, its own multi-stream commercial legs: $156.50/month +
// $80/year) with an add-on (Backup & DR Shield) temporarily attached, plus
// an in-progress Upgrade draft (Block Storage, $10/month, ongoing). Asserts
// the ONE finalised Build Your Own result retains both peers' full facts —
// nothing about deriveComposedProjection()/finaliseUpgradeQuoteDraft()
// itself was broken (see the isolated unit assertions above); the actual
// production defect was a SEPARATE effect in ComposableOfferBrowser.tsx
// re-committing over this correct result seconds later (see
// shouldAutoCommitComposableSelection() in
// scripts/composable-finalise-race-contract.ts for that regression).
{
  const FAMILY_ID = 'pcg_kairos_iaas';
  const TIER_INSTANCE_ID = 'ti_kairos_iaas';

  const starterCloud: FamilyTierQuoteItem = {
    offer_type: 'family_tier',
    familyId: FAMILY_ID, familyPlatformId: 'CZPG-KAIROS01', familyTitle: 'KAIROS — IaaS',
    tierInstanceId: TIER_INSTANCE_ID, tierInstancePlatformId: 'CZTG-KAIROS01',
    tierOccupantId: 'occ-starter', tierPlatformId: 'CZT-STARTER01', tierEditionPlatformId: null,
    tierId: 'basic', tierTitle: 'Starter Cloud',
    price: 156.5, billingCycle: 'monthly',
    features: ['2 vCPU', '8 GB RAM'],
    inclusionItems: [
      { id: 'vcpu', label: '2 vCPU', quantity: 2 },
      { id: 'ram', label: '8 GB RAM', quantity: 8 },
      { id: 'os', label: 'SUSE Linux', quantity: 1 },
      { id: 'block-storage-base', label: 'Block Storage', quantity: 50 },
      { id: 'baas', label: 'Backup Storage — BaaS', quantity: 1 },
      { id: 'ip', label: 'Static IP Block', quantity: 1 },
    ],
    isAddon: false,
    minimumTermValue: 12, minimumTermUnit: 'months', planDurationMonths: 12,
    legPaymentSummaries: [
      { source: 'starter-monthly', billingCycle: 'monthly', price: 156.5, startMonth: 0, endMonth: 12, isOngoing: false, occurrenceMonths: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], subtotal: 1878 },
      { source: 'starter-yearly', billingCycle: 'annual', price: 80, startMonth: 0, endMonth: 12, isOngoing: false, occurrenceMonths: [0], subtotal: 80 },
    ],
  };
  const drShield: FamilyTierQuoteItem = {
    offer_type: 'family_tier',
    familyId: FAMILY_ID, familyPlatformId: 'CZPG-KAIROS01', familyTitle: 'KAIROS — IaaS',
    tierInstanceId: TIER_INSTANCE_ID, tierInstancePlatformId: 'CZTG-KAIROS01',
    tierOccupantId: 'occ-dr-shield', tierPlatformId: 'CZT-DRSHIELD01', tierEditionPlatformId: null,
    tierId: 'premium', tierTitle: 'Backup & DR Shield',
    price: 25, billingCycle: 'monthly', features: [], isAddon: true,
    minimumTermValue: null, minimumTermUnit: null,
  };
  const blockStorageDraft: FamilyTierQuoteItem = {
    offer_type: 'family_tier',
    familyId: FAMILY_ID, familyPlatformId: 'CZPG-KAIROS01', familyTitle: 'KAIROS — IaaS',
    tierInstanceId: TIER_INSTANCE_ID, tierInstancePlatformId: 'CZTG-KAIROS01',
    tierOccupantId: 'occ-composable', tierPlatformId: 'CZT-COMPOSABLE01', tierEditionPlatformId: null,
    tierId: COMPOSABLE_QUOTE_TIER_ID, tierTitle: 'Build Your Own',
    price: 10, billingCycle: 'monthly',
    features: ['Block Storage'],
    inclusionItems: [{ id: 'block-storage-upgrade', label: 'Block Storage', quantity: 100 }],
    isAddon: false, isComposable: true,
    composableSelection: [{ item_id: 'block-storage-upgrade', selected: true, quantity: 100 }],
    minimumTermValue: null, minimumTermUnit: null,
    legPaymentSummaries: [
      { source: 'block-storage-upgrade', billingCycle: 'monthly', price: 10, startMonth: 0, endMonth: null, isOngoing: true, occurrenceMonths: [], subtotal: null },
    ],
    upgradeDraftBase: { tierPlatformId: starterCloud.tierPlatformId, tierEditionPlatformId: starterCloud.tierEditionPlatformId },
  };

  const items: CartItem[] = [starterCloud, drShield, blockStorageDraft];
  const result = finaliseUpgradeQuoteDraft(items, FAMILY_ID, TIER_INSTANCE_ID);

  check(result.length === 1, 'finalising collapses primary + add-on + draft into exactly one item');
  const finalItem = result[0] as FamilyTierQuoteItem;
  check(finalItem.tierTitle === 'Build Your Own' && finalItem.isComposedUpgrade === true, 'the one remaining item is the finalised Build Your Own result');
  check(finalItem.composedBase?.tierPlatformId === starterCloud.tierPlatformId, 'composedBase peer is present and carries the exact base identity');
  check(finalItem.composedUpgrade?.tierPlatformId === blockStorageDraft.tierPlatformId, 'composedUpgrade peer is present and carries the exact upgrade identity');

  check(finalItem.price === 156.5 && finalItem.billingCycle === 'monthly', 'headline price/cycle reflect the base plan, never the upgrade alone');

  const baseInclusions = finalItem.inclusionItems!.filter((entry) => entry.provenance !== 'upgrade');
  const upgradeInclusions = finalItem.inclusionItems!.filter((entry) => entry.provenance === 'upgrade');
  check(baseInclusions.length === 6, 'every base inclusion (2 vCPU/8GB RAM/OS/base Block Storage/BaaS/Static IP) survives finalisation');
  check(upgradeInclusions.length === 1 && upgradeInclusions[0].label === 'Block Storage', 'the upgrade inclusion is present alongside the base, not instead of it');

  check(finalItem.legPaymentSummaries!.length === 3, 'both of the base plan\'s streams (monthly + yearly) AND the upgrade\'s stream are all present');
  const monthlyStreams = finalItem.legPaymentSummaries!.filter((s) => s.billingCycle === 'monthly');
  check(monthlyStreams.length === 2 && monthlyStreams.some((s) => s.price === 156.5) && monthlyStreams.some((s) => s.price === 10), 'the base plan\'s own $156.50 monthly stream is never dropped in favour of only the $10 upgrade stream');

  // The exact figure the auditor found wrong ("Monthly $10" instead of the
  // combined $166.50): startingPaymentsByCycle summed across this one
  // finalised item's own concatenated streams must combine base + upgrade
  // per cycle, not silently drop the base's contribution.
  const starting = startingPaymentsByCycle([finalItem.legPaymentSummaries ?? []]);
  const monthlyTotal = starting.find(([cycle]) => cycle === 'monthly')?.[1];
  const annualTotal = starting.find(([cycle]) => cycle === 'annual')?.[1];
  check(monthlyTotal === 166.5, `combined starting monthly payment is base $156.50 + upgrade $10 = $166.50 (got ${monthlyTotal})`);
  check(annualTotal === 80, `the base plan's separate $80 yearly stream is preserved, never merged into the monthly figure (got ${annualTotal})`);
}

console.log('Upgrade quote draft contract passed.');
