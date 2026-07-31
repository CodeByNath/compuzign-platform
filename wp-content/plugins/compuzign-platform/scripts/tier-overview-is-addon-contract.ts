// Editor-to-backend hand-off contract for the occupant-level `is_addon` field
// (Tier System add-on capability, Phase 2).
//
// tsc and the existing Tier contracts already prove the type shapes line up;
// this exercises the actual production merge function the drawer renders
// from — draftPreferredDetail — the same one useTierModuleEditing.openSection
// reads to seed the editor draft and useTierModuleEditing.saveSection posts
// back through saveTierOverview. No DOM is mounted (this repo's contracts
// are fixture-driven against real exported functions, not component
// rendering), but the exact function the UI depends on is exercised, not a
// static type assertion.

import { draftPreferredDetail } from '../resources/ts/package-station/usePackageStation';
import type { PackageStationTier } from '../resources/ts/package-station/usePackageStation';
import type { TierOverviewDraft } from '../resources/ts/package-station/types';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Tier overview is_addon contract: ${message}`);
}

function settledNormalTier(): PackageStationTier {
  return {
    occupant_id: 'occ_abc123',
    label: 'Standard',
    ideal_for: 'Growing teams',
    price: 49,
    contact: false,
    billing_cycle: 'monthly',
    rate_sheet_id: 'rs_a',
    inclusions_override: [],
    rate_sheet_items: [{ item_id: 'rate-vm', quantity: 2 }],
    rate_sheet_selections: [],
    features: [],
    faq_refs: [],
    enabled: true,
    is_addon: false,
    drafts: { overview: null, features: null, faqs: null },
    module_status: { overview: 'settled', features: 'settled', faqs: 'settled' },
  };
}

// ── No pending draft: the settled is_addon value passes straight through ───

const settled = settledNormalTier();
const settledView = draftPreferredDetail(settled);
check(settledView.is_addon === false, 'a settled normal Tier with no draft reports is_addon: false');

// ── The editor stages an overview draft that flips is_addon only ───────────
// Mirrors useTierModuleEditing.openSection seeding TierOverviewEditDraft from
// view.detail, the checkbox flipping it, and saveSection posting the same
// overview draft shape through saveTierOverview.

const stagedDraft: TierOverviewDraft = {
  label: settled.label,
  ideal_for: settled.ideal_for,
  price: null,
  contact: settled.contact,
  billing_cycle: settled.billing_cycle ?? 'monthly',
  rate_sheet_id: settled.rate_sheet_id,
  is_addon: true,
};

const pending: PackageStationTier = {
  ...settled,
  drafts: { ...settled.drafts, overview: stagedDraft },
  module_status: { ...settled.module_status, overview: 'pending' },
};

const pendingView = draftPreferredDetail(pending);
check(pendingView.is_addon === true, 'a pending overview draft with is_addon: true wins over the settled false — the editor previews the unsaved change');
check(pendingView.occupant_id === settled.occupant_id, 'staging an is_addon change does not disturb the occupant identity the drawer reads');
check(pendingView.rate_sheet_id === settled.rate_sheet_id, 'staging an is_addon change does not disturb the Rate Sheet binding the drawer reads');
check(pendingView.rate_sheet_items.length === 1, 'staging an is_addon change does not disturb Rate Sheet selections the drawer reads');
check(pendingView.label === settled.label, 'staging an is_addon change does not disturb other Overview fields');

// ── A draft that edits other overview fields but omits is_addon keeps the
//    settled occupant's value — the checkbox was never touched, so it must
//    not silently flip.

const otherFieldDraft: TierOverviewDraft = {
  label: 'Standard Plus',
  ideal_for: settled.ideal_for,
  price: null,
  contact: settled.contact,
  billing_cycle: settled.billing_cycle ?? 'monthly',
  rate_sheet_id: settled.rate_sheet_id,
  // is_addon intentionally omitted.
};
const untouchedAddon: PackageStationTier = {
  ...settled,
  drafts: { ...settled.drafts, overview: otherFieldDraft },
  module_status: { ...settled.module_status, overview: 'pending' },
};
const untouchedView = draftPreferredDetail(untouchedAddon);
check(untouchedView.label === 'Standard Plus', 'an unrelated overview edit is still draft-preferred');
check(untouchedView.is_addon === false, 'an overview draft that omits is_addon falls back to the settled occupant, never defaulting to false-by-erasure of a true value');

// Same check with a settled add-on occupant, to rule out a coincidental match.
const settledAddon: PackageStationTier = { ...settled, is_addon: true };
const addonDraftOmitsField: TierOverviewDraft = { ...otherFieldDraft };
const addonUntouched: PackageStationTier = {
  ...settledAddon,
  drafts: { ...settledAddon.drafts, overview: addonDraftOmitsField },
  module_status: { ...settledAddon.module_status, overview: 'pending' },
};
check(draftPreferredDetail(addonUntouched).is_addon === true, 'an overview draft that omits is_addon preserves a settled true, not just a settled false');

console.log('Tier overview is_addon contract checks passed.');
