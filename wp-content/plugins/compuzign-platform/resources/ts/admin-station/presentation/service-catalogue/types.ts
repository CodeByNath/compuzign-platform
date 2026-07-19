import type { CategoryGroupStatus } from '../category-groups/types';

export interface ServiceCatalogueCategory {
  id:   number | null;
  name: string;
  slug: string;
}

/**
 * Browse-first Service row consumed by the Service Catalogue template kit.
 *
 * The row keeps the Service's native numeric identity and contains only facts
 * supplied by the Service list projection. `scope` lets the kit include the
 * archived count in its overview without turning Home into a travel surface.
 */
export interface ServiceCatalogueItem {
  id:                 number;
  name:               string;
  slug:               string;
  description:        string;
  createdAt:          string | null;
  categories:         ServiceCatalogueCategory[];
  familyGroups:       string[];
  inclusionCount:     number;
  faqCount:           number;
  platformStatus:     'active' | 'disabled' | 'archived';
  presentationStatus: CategoryGroupStatus | null;
  scope:               'current' | 'archived';
}
