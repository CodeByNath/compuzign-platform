// Tier Edition — pure presentation/draft derivations for one Edition's
// overview module, used by TierEditionDeclarationSwitcher (the Inclusions &
// Editions module's own additional-declarations tab strip, printed inside
// the parent Tier drawer). Kept here, not inlined, so status labelling and
// draft seeding stay in one place.

import type { TierEdition, TierEditionOverviewDraft } from '../../types';
import { totalCommitmentMonths } from './tierDetailModel';

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
    // Mirrors the Tier occupant's own buildTierFooterModel.footerHasContent:
    // raw pending content (hasDraft) makes something publishable, full stop —
    // never gated on platform_status/hasBeenPublished. moduleStatus here is a
    // PRESENTATION result (tierEditionModuleState's 5-state pill); the Tier
    // lifecycle never asks that layer whether something is publishable, only
    // the raw module_status/draft state, so canPublish must not either.
    canPublish: moduleStatus === 'pending-full' || hasDraft,
  };
}

// Edition's own draft-preferred projection — the SAME requirement Default
// Tier's usePackageStation.draftPreferredDetail() already satisfies
// (StationDrawerLifecycleContract-v1.md §7: "draft-preferred module data" is
// part of the locked conformance bar, not an occupant-only nicety). A pending
// drafts.overview always wins over the last-settled fields for everything
// this Edition displays or re-edits — module_status/platform_status/drafts
// stay the untouched raw values, exactly like draftPreferredDetail's own
// `{...slot, <content fields> }` shape.
//
// This is a distinct implementation from draftPreferredDetail, not a copy of
// it: the occupant's draft lives in three separately-shaped module slots
// (overview/features/faqs) that need per-field reconciliation, while an
// Edition's single consolidated 'overview' draft already carries every
// content field under the SAME names TierEdition itself uses (confirmed by
// TierEditionOverviewDraft's shape) — a plain override is the correct
// merge for this shape, not a smaller/incomplete stand-in for the Tier one.
export function draftPreferredEdition(edition: TierEdition): TierEdition {
  const draft = edition.drafts.overview;
  return draft ? { ...edition, ...draft } : edition;
}

export function draftFromTierEdition(edition: TierEdition): TierEditionOverviewDraft {
  // Coverage window default for an Edition that has never configured one:
  // 0 through Indefinite (null) with no commitment yet, or 0 through the
  // full commitment when one is already configured. Mirrors the
  // occupant's own equivalent seed in useTierModuleEditing.ts.
  const totalMonths = totalCommitmentMonths(edition.minimum_term_value, edition.minimum_term_unit);
  return {
    title: edition.title,
    admin_description: edition.admin_description,
    rate_sheet_id: edition.rate_sheet_id,
    rate_sheet_items: edition.rate_sheet_items,
    // Written into the draft itself, not just displayed — matching the
    // occupant's own seed exactly. Leg Default's own card previously showed
    // "Monthly" via a display-only fallback that was never saved, so an
    // Edition whose admin never explicitly touched this field persisted
    // billing_cycle: null and its Default Leg silently never appeared in
    // resolveCommercialLegTimeline()'s output (commercialLegTimelineChildren()
    // gates the 'default' child on a non-empty billing_cycle).
    billing_cycle: edition.billing_cycle ?? 'monthly',
    contact: edition.contact,
    minimum_term_value: edition.minimum_term_value,
    minimum_term_unit: edition.minimum_term_unit,
    from_month: edition.from_month ?? 0,
    to_month:   edition.to_month ?? totalMonths,
    legs: edition.legs,
    headline_leg_id: edition.headline_leg_id,
    inclusions_override: edition.inclusions_override,
    faq_refs: edition.faq_refs,
  };
}
