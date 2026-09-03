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

import { chargeTypeLabel } from '@/utils/paymentSummary';
import { formatPrice } from '@/utils/format';
import type { RequestInclusionItem, RequestLegPaymentSummary, RequestLine } from '@/api/types/admin';

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

// Live-correction round: the composable ("Build Your Own") aggregate line's
// own stored inclusion names/quantities + per-Leg payment summaries, for the
// Admin Request readback beneath its summary row (requestItemDisplay() above
// stays a flat title/subtitle/price for every line type — this is additive,
// composable-only detail). Same stored-snapshot-only contract as every other
// Request surface: never re-resolved from live Rate Sheet/occupant/policy
// state, and never persisted `composableSelection`.
export interface RequestComposableInclusionRow {
  key: string;
  label: string;
  quantity: number | null;
  isBundleParent: boolean;
}

export interface RequestComposableStreamRow {
  source: string;
  label: string;
  amount: string;
}

export interface RequestComposableDetail {
  inclusions: RequestComposableInclusionRow[];
  streams: RequestComposableStreamRow[];
}

function flattenInclusions(items: RequestInclusionItem[]): RequestComposableInclusionRow[] {
  return items.flatMap((inclusion, i) => [
    {
      key: inclusion.id || String(i),
      label: inclusion.label,
      quantity: inclusion.bundle_id ? null : (inclusion.quantity ?? null),
      isBundleParent: !!inclusion.bundle_id,
    },
    ...(inclusion.includes ?? []).map((child, ci) => ({
      key: `${inclusion.id || i}:${child.id || ci}`,
      label: child.label,
      quantity: child.quantity ?? null,
      isBundleParent: false,
    })),
  ]);
}

function streamRow(stream: RequestLegPaymentSummary): RequestComposableStreamRow {
  return {
    source: stream.source,
    label: chargeTypeLabel(stream.billingCycle),
    amount: formatPrice(stream.price),
  };
}

export function requestComposableDetail(item: RequestLine): RequestComposableDetail | null {
  if (!item.isComposable) return null;

  const inclusions = flattenInclusions(item.inclusionItems ?? []);
  const streams = (item.legPaymentSummaries ?? []).map(streamRow);

  return inclusions.length === 0 && streams.length === 0 ? null : { inclusions, streams };
}
