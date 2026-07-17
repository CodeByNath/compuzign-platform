// Category Group station manifest (Category Group audit, Option B).
//
// Structural clone of entities/category.ts, one level up: declared here as
// pure configuration of the existing archetypes — zero new renderer
// components, zero new modes. Behaviour stays with the Station
// (StationLifecycle.php via CategoryMeta, useServiceCategoryGroupStation, the
// /admin/category-groups REST family); everything here references existing
// presentation assets.

import type { ServiceCategoryGroupStationItem } from '@/api/types/admin';
import { serviceCategoryGroupOverviewShell } from '../shells/bindings/serviceCategoryGroup';
import {
  serviceCategoryGroupCatalogTable,
  serviceCategoryGroupArchivedTable,
  serviceCategoryGroupTrashedTable,
  serviceCategoryGroupBinTable,
} from '../tables/serviceCategoryGroup';
import type { EntitySchema } from '../types';

export const SERVICE_CATEGORY_GROUP_ENTITY: EntitySchema = {
  id:    'category-group',
  label: { singular: 'Category Group', plural: 'Category Groups' },
  identity: {
    idOf:    (d: ServiceCategoryGroupStationItem) => d.id,
    titleOf: (d: ServiceCategoryGroupStationItem) => d.name,
  },

  lifecycle: {
    participation: 'canonical',
    statuses: ['draft', 'active', 'disabled', 'archived', 'trashed'],
  },

  // Keyed by backend module key (overview / categories). `category` is the
  // related Category station's primary module, registered for the Category
  // Group Categories collection surface — the shared shell object, never a
  // copy (S4 related-stations rule), the same precedent as CATEGORY_ENTITY
  // registering serviceOverviewShell under `service`.
  shells: {
    overview:   serviceCategoryGroupOverviewShell,
  },

  // Entity travel actions (StationLifecycle transitions). Declarations only —
  // behaviour arrives as handlers from the owning surface, never from here.
  actions: {
    archive: { id: 'archive', label: 'Archive',       intent: 'secondary' },
    trash:   { id: 'trash',   label: 'Move to Trash', intent: 'danger' },
    restore: { id: 'restore', label: 'Restore',       intent: 'secondary' },
    delete:  {
      id: 'delete', label: 'Permanently delete', intent: 'danger',
      confirm: { prompt: 'Delete permanently?', confirmLabel: 'Confirm' },
    },
  },

  placements: {
    // Details = the owned overview; Connections = the categories summary
    // gateway in the `summary` viewpoint (metrics has a summary-only renderer —
    // a connections-mode slot would render an empty body), exactly like the
    // Category manifest's Services gateway slot.
    drawer: {
      details: [
        { module: 'overview', mode: 'details' },
      ],
      connections: [],
    },
    // Collection placement — the shared categoryOverviewShell repeated once per
    // child category in the summary viewpoint, each card re-selecting the
    // `view` footer that opens the real Category drawer. The surface owns the
    // N bindings (same v1.2 mechanics as CATEGORY_ENTITY.placements.collections.services).
    table: serviceCategoryGroupCatalogTable,
    // Bin is the consumed schema (the Bin station's Category Group pane);
    // archived/trashed are declared for travel-preset completeness — no hidden
    // category-group-archived/category-group-trash station routes in v1.
    travel: {
      archived: serviceCategoryGroupArchivedTable,
      trashed:  serviceCategoryGroupTrashedTable,
      bin:      serviceCategoryGroupBinTable,
    },
  },
};
