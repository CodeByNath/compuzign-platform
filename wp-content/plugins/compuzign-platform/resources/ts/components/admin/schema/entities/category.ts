// Category station manifest (Schema architecture S6, §9).
//
// The first station onboarded onto the completed architecture: declared here
// as pure configuration of the existing archetypes — zero new renderer
// components, zero new modes. Behaviour stays with the Station
// (StationLifecycle.php via CategoryMeta, useCategoryStation, the
// /admin/categories REST family); everything here references existing
// presentation assets.

import type { CategoryStationItem } from '@/api/types/admin';
import {
  categoryOverviewShell,
  categoryServicesShell,
} from '../shells/bindings/category';
import { serviceOverviewShell } from '../shells/bindings/service';
import {
  categoryCatalogTable,
  categoryArchivedTable,
  categoryTrashedTable,
  categoryBinTable,
} from '../tables/category';
import type { EntitySchema } from '../types';

export const CATEGORY_ENTITY: EntitySchema = {
  id:    'category',
  label: { singular: 'Category', plural: 'Categories' },
  identity: {
    idOf:    (d: CategoryStationItem) => d.id,
    titleOf: (d: CategoryStationItem) => d.name,
  },

  lifecycle: {
    participation: 'canonical',
    statuses: ['draft', 'active', 'disabled', 'archived', 'trashed'],
  },

  // Keyed by backend module key (overview / services). `service` is the
  // related Service station's primary module, registered for the Category
  // Services collection surface (v1.2) — the shared shell object, never a
  // copy (S4 related-stations rule).
  shells: {
    overview: categoryOverviewShell,
    services: categoryServicesShell,
    service:  serviceOverviewShell,
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
    // Details = the owned overview; Connections = the services summary
    // gateway in the `summary` viewpoint (metrics has a summary-only
    // renderer — a connections-mode slot would render an empty body),
    // exactly like the Service manifest's Package Summary slot.
    drawer: {
      details: [
        { module: 'overview', mode: 'details' },
      ],
      connections: [
        { module: 'services', mode: 'summary' },
      ],
    },
    // v1.2 Collection placement — first realisation: the shared
    // serviceOverviewShell repeated once per assigned service in the summary
    // viewpoint, each card re-selecting the `view` footer that opens the real
    // Service drawer. The surface owns the N bindings.
    collections: {
      services: { module: 'service', mode: 'summary', footer: ['view'] },
    },
    table: categoryCatalogTable,
    // D8: `bin` is the consumed schema (the Bin workstation's Category pane);
    // archived/trashed are declared for travel-preset completeness — no
    // hidden category-archived/category-trash workstation routes in v1.
    travel: {
      archived: categoryArchivedTable,
      trashed:  categoryTrashedTable,
      bin:      categoryBinTable,
    },
  },
};
