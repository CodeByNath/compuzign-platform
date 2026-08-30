// CRM-1B correction: RequestSchema::sanitizeItems() unsets serviceTitle/
// categoryName for a `family_tier` line and stores familyTitle/tierTitle/
// tierEditionTitle instead — a drawer that always reads serviceTitle shows a
// blank primary name for exactly the Package Family/Tier requests CRM most
// needs to review. This pure projection picks the right stored fields for
// whichever shape the line actually is, so RequestDrawerHost.tsx has nothing
// to branch on and this logic is testable without mounting a component.
//
// Never re-resolves catalog data and never computes from legPaymentSummaries
// — the price shown is always the line's own stored headline price/
// billingCycle snapshot, never implied as a total contract value.

import type { RequestLine } from '@/api/types/admin';

export interface RequestItemDisplay {
  title: string;
  subtitle: string;
  price: string;
}

export function requestItemDisplay(item: RequestLine): RequestItemDisplay {
  const isFamily = item.offer_type === 'family_tier';

  const title = isFamily
    ? (item.familyTitle || 'Package Family')
    : (item.serviceTitle || 'Service');

  const subtitleParts = isFamily
    ? [item.tierTitle, item.tierEditionTitle ?? undefined]
    : [item.categoryName, item.tierTitle];
  const subtitle = subtitleParts.filter((part): part is string => !!part).join(' · ');

  const price = item.price === null
    ? 'Custom pricing'
    : `$${item.price.toFixed(2)}${item.billingCycle ? ` / ${item.billingCycle}` : ''}`;

  return { title, subtitle, price };
}
