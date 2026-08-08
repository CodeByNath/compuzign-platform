// Tier Edition — pure presentation/draft derivations for one Edition's
// overview module, used by TierEditionDeclarationSwitcher (the Inclusions &
// Editions module's own additional-declarations tab strip, printed inside
// the parent Tier drawer). Kept here, not inlined, so status labelling and
// draft seeding stay in one place.

import type { TierEdition, TierEditionOverviewDraft } from '../../types';

// The single frontend authority for an Edition's Disabled-mask presentation
// (correction plan item 1). Edition's own backend (applyTierEditionDisabledMask,
// PackageSchema.php) mirrors PackageCategoryGroups::applyDisabledMask exactly —
// it never writes edition.is_explicitly_disabled, so that field stays stuck at
// its creation default forever. Package Family and Category (the mature
// full-lifecycle precedents) don't store a raw mask field at all; both derive
// "is this disabled" from the SAME compound this function computes. Every
// Edition presentation concern that needs this fact — the module pill,
// CanonicalEntityFooter's isDisabledMasked, and the Enable/Disable branch —
// must call this, never read edition.is_explicitly_disabled directly. The
// field itself stays on the wire/type shape unchanged; it is simply not read
// for Editions any more.
export function tierEditionDisabledMasked(edition: TierEdition): boolean {
  return edition.platform_status === 'disabled' && edition.previous_platform_status !== null;
}

// Derivation feeding CanonicalEntityFooter (drawer refinement blueprint,
// Phase 6) — same two-clause hasBeenPublished formula Tier's own
// tierDetailModel.buildTierFooterModel and Package Family's
// derivePackageFamilyFooterState already use. Edition genuinely differs from
// Package Family here: CZTE is assigned on first Active (mirroring the
// occupant's own CZT/CZTA), not at an earlier save stage, so
// isNewNeverPublished and !hasBeenPublished always coincide for an Edition —
// unlike Package Family's group_id, which can exist before the record is
// ever truly published. canPublish therefore never gates on identity already
// existing (that would make a first Publish impossible); it gates on the
// SAME module status this Edition's own Overview/Inclusions cards already
// carry (Phase 4/5's evaluateModule result) — 'pending-full' (complete,
// unpublished) or already active with a pending draft.
export function deriveTierEditionFooterState(
  edition: TierEdition,
  moduleStatus: string,
  hasDraft: boolean,
) {
  const isActive = edition.platform_status === 'active';
  const hasBeenPublished = isActive || edition.module_status.overview === 'settled';
  return {
    isNewNeverPublished: !hasBeenPublished,
    hasBeenPublished,
    canPublish: moduleStatus === 'pending-full' || (isActive && hasDraft),
  };
}

export function draftFromTierEdition(edition: TierEdition): TierEditionOverviewDraft {
  return {
    title: edition.title,
    admin_description: edition.admin_description,
    rate_sheet_id: edition.rate_sheet_id,
    rate_sheet_items: edition.rate_sheet_items,
    billing_cycle: edition.billing_cycle,
    contact: edition.contact,
    minimum_term_value: edition.minimum_term_value,
    minimum_term_unit: edition.minimum_term_unit,
    inclusions_override: edition.inclusions_override,
    faq_refs: edition.faq_refs,
  };
}
