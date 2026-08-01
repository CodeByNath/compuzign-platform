// Service drawer seed builders — the drawer's INPUT adapters, shared by hosts.
//
// The Service drawer composition takes a `ServiceItem` seed plus the category
// list. Both hosts must build them the same way, so the two pure functions that
// do it live here rather than inside either host's station file. They were
// previously private to the Command Centre's ServiceCatalogStation, which now
// imports them from here.
//
// The seed is NOT a second service model. It carries just enough for the
// drawer's loading window: `useServiceStation` immediately calls
// fetchAdminServiceDetail(service.id) on mount and everything authoritative
// comes from there.

import type { Category, ServiceItem, TierId, PricingTierData } from '@/api/types/cost-builder';
import type { ServiceSummary } from '@/service-station';

// The lightweight category projection embedded in the Service catalogue
// response. Entries with a null id are dropped — a category the picker cannot
// address is not a choice.
type AdminCategory = { id: number | null; name: string; slug: string; description?: string };

export function normalizeAdminCategories(cats: AdminCategory[]): Category[] {
  return cats
    .filter((c): c is { id: number; name: string; slug: string; description?: string } => c.id !== null)
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? '' }));
}

/**
 * Build the minimal ServiceItem the drawer opens against.
 *
 * Only identity, title/slug, categories and platform/module status are real
 * here; the rest are empty placeholders that the detail fetch replaces. Do not
 * treat the result as an authoritative service.
 */
export function buildServiceItemForStationHandoff(summary: ServiceSummary): ServiceItem {
  return {
    id:         summary.id,
    platformId: summary.platformId,
    title:      summary.title,
    slug:       summary.slug,
    excerpt:    '',
    content:    '',
    categories: normalizeAdminCategories(summary.categories),
    inclusions:   [],
    faqs:         [],
    availability: { is_available: true, message: '' },
    meta: {
      platform_status:           summary.platform_status,
      previous_platform_status:  summary.previous_platform_status ?? '',
      module_status:             summary.module_status as ServiceItem['meta']['module_status'],
      short_description: '',
      long_description:  '',
      billing_cycle:     '',
      sla:               '',
      uptime:            '',
      notes:             '',
      popular_tier:      null,
      popular_label:     null,
      sort_order:        0,
    },
    pricing: {
      tiers:  {} as Record<TierId, PricingTierData>,
      bundle: { title: '', description: '', price: null },
    },
    promotion_tiers: [],
  };
}
