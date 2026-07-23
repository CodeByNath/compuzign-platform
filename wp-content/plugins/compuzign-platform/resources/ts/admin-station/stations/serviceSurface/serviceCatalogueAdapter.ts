// Service → Service Catalogue row adapter.
//
// This is a pure projection. It keeps the Service list route authoritative for
// identity, direct Category, counts, lifecycle, and browse copy. Package Family
// relationships arrive separately from their Package-owned read boundary and
// are joined here without transferring their authority to Service.

import type { ServiceSummary } from '@/service-station';
import {
  packageFamiliesForService,
  type PackageFamilyRelationship,
} from '../packageFamily';
import { decodeHtml } from '@/utils/format';
import { resolveServiceCardStatus } from './serviceCardAdapter';
import type { ServiceCatalogueItem } from '../../presentation/service-catalogue/types';

export function toServiceCatalogueItem(
  summary: ServiceSummary,
  scope: ServiceCatalogueItem['scope'],
  packageFamilyRelationships: PackageFamilyRelationship[],
): ServiceCatalogueItem {
  const categories = summary.categories
    .filter((category) => category.id !== null)
    .map((category) => ({
      id:   category.id,
      name: decodeHtml(category.name),
      slug: category.slug,
    }));

  return {
    id:                 summary.id,
    name:               decodeHtml(summary.title) || 'Untitled service',
    slug:               summary.slug,
    description:        decodeHtml(summary.excerpt ?? '').trim(),
    createdAt:          summary.created_at ?? null,
    categories,
    packageFamilies:    packageFamiliesForService(packageFamilyRelationships, summary.id)
      .map((family) => ({ ...family, name: decodeHtml(family.name) })),
    inclusionCount:     summary.inclusion_count ?? 0,
    faqCount:           summary.faq_count ?? 0,
    platformStatus:     summary.platform_status === 'active'
      ? 'active'
      : summary.platform_status === 'archived' ? 'archived' : 'disabled',
    // Archived records contribute to overview counts only. Home deliberately
    // does not render a travel pill or archived row.
    presentationStatus: scope === 'current' ? resolveServiceCardStatus(summary) : null,
    scope,
  };
}
