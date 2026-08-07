// Tier Edition — pure presentation/draft derivations for one Edition's
// overview module, used by TierEditionDeclarationSwitcher (the Inclusions &
// Editions module's own additional-declarations tab strip, printed inside
// the parent Tier drawer). Kept here, not inlined, so status labelling and
// draft seeding stay in one place.

import type { TierEdition, TierEditionOverviewDraft } from '../../types';

export function tierEditionStatusLabel(edition: TierEdition): string {
  switch (edition.platform_status) {
    case 'active':   return 'Active';
    case 'archived': return 'Archived';
    case 'trashed':  return 'Trashed';
    case 'disabled': return edition.previous_platform_status !== null ? 'Disabled' : 'Pending';
    default:         return edition.platform_status;
  }
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
