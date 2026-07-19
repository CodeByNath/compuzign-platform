// Service → Service Catalogue row adapter.
//
// This is a pure projection. It keeps the Service list route authoritative for
// identity, hierarchy, counts, lifecycle, and browse copy, while expressing
// those facts in the local presentation contract consumed by the registered
// Service Catalogue template kit.

import type { ServiceSummary } from '../service';
import { decodeHtml } from '@/utils/format';
import { resolveServiceCardStatus } from './serviceCardAdapter';
import type { ServiceCatalogueItem } from '../../presentation/service-catalogue/types';

function uniqueLabels(labels: Array<string | null | undefined>): string[] {
  return [...new Set(labels.map((label) => label?.trim()).filter((label): label is string => Boolean(label)))];
}

export function toServiceCatalogueItem(
  summary: ServiceSummary,
  scope: ServiceCatalogueItem['scope'],
): ServiceCatalogueItem {
  const categories = summary.categories
    .filter((category) => category.id !== null)
    .map((category) => ({
      id:   category.id,
      name: decodeHtml(category.name),
      slug: category.slug,
    }));

  const familyGroups = uniqueLabels(
    summary.categories.map((category) => category.group_name ? decodeHtml(category.group_name) : null),
  );

  return {
    id:                 summary.id,
    name:               decodeHtml(summary.title) || 'Untitled service',
    slug:               summary.slug,
    description:        decodeHtml(summary.excerpt ?? '').trim(),
    createdAt:          summary.created_at ?? null,
    categories,
    familyGroups,
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
