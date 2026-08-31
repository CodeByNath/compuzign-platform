// CRM-1C: maps the durable Request snapshot's own line shape (`RequestLine`,
// api/types/admin.ts — deliberately independent of cost-builder/types.ts,
// same reasoning as RequestLegPaymentSummary/RequestInclusionItem) onto the
// customer proposal renderer's `CartItem` union, so QuoteProposalPreview can
// render it unmodified. Snapshot fields only — never re-resolved from live
// catalog/Family data, matching RequestDrawerHost's existing read-only
// contract for this same data.

import type { RequestLine } from '@/api/types/admin';
import type { CartItem, FamilyTierQuoteItem, QuoteItem, QuoteItemTierId } from '@/components/cost-builder/types';
import type { TierId } from '@/api/types/cost-builder';

export function toCartItems(items: RequestLine[]): CartItem[] {
  return items.map(toCartItem);
}

function toCartItem(item: RequestLine): CartItem {
  if (item.offer_type === 'family_tier') {
    const familyItem: FamilyTierQuoteItem = {
      offer_type: 'family_tier',
      familyId: item.familyId ?? '',
      familyPlatformId: item.familyPlatformId ?? '',
      familyTitle: item.familyTitle ?? '',
      tierInstanceId: item.tierInstanceId ?? '',
      tierInstancePlatformId: item.tierInstancePlatformId ?? '',
      tierOccupantId: item.tierOccupantId ?? '',
      tierPlatformId: item.tierPlatformId ?? '',
      tierEditionPlatformId: item.tierEditionPlatformId ?? null,
      tierEditionTitle: item.tierEditionTitle ?? null,
      tierId: item.tierId as TierId,
      tierTitle: item.tierTitle,
      price: item.price,
      billingCycle: item.billingCycle,
      features: item.features,
      inclusionItems: item.inclusionItems ?? undefined,
      isAddon: item.isAddon,
      minimumTermValue: item.minimumTermValue,
      minimumTermUnit: item.minimumTermUnit,
      legPaymentSummaries: item.legPaymentSummaries ?? null,
    };
    return familyItem;
  }

  const legacyItem: QuoteItem = {
    serviceId: item.serviceId ?? 0,
    serviceTitle: item.serviceTitle ?? '',
    tierId: item.tierId as QuoteItemTierId,
    tierTitle: item.tierTitle,
    price: item.price,
    billingCycle: item.billingCycle,
    categoryName: item.categoryName ?? '',
    features: item.features,
    offer_type: item.offer_type === 'core_tier' || item.offer_type === 'promotion_tier' ? item.offer_type : undefined,
    promotion_id: item.promotion_id || undefined,
    billing_label: item.billing_label || undefined,
    isAddon: item.isAddon,
    minimumTermValue: item.minimumTermValue,
    minimumTermUnit: item.minimumTermUnit,
    serviceDescription: item.serviceDescription ?? undefined,
    bundleDescription: item.bundleDescription ?? undefined,
  };
  return legacyItem;
}
