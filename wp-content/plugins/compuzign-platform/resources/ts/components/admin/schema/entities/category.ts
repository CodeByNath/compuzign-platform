// Category station manifest (Schema architecture S6, §9).
//
// The first station onboarded onto the completed architecture: declared here
// as pure configuration of the existing archetypes — zero new renderer
// components, zero new modes. Behaviour stays with the Station
// (StationLifecycle.php via CategoryMeta, useCategoryStation, the
// /admin/categories REST family); everything here references existing
// presentation assets.

import { CATEGORY_DRAWER_ENTITY } from '@/entity-drawers/schema/entities/category';
import {
  categoryCatalogTable,
  categoryArchivedTable,
  categoryTrashedTable,
  categoryBinTable,
} from '../tables/category';
import type { EntitySchema } from '@/drawer-kit/schema/types';

export const CATEGORY_ENTITY: EntitySchema = {
  ...CATEGORY_DRAWER_ENTITY,

  placements: {
    // Details = the owned overview; Connections = the services summary
    // gateway in the `summary` viewpoint (metrics has a summary-only
    // renderer — a connections-mode slot would render an empty body),
    // exactly like the Service manifest's Package Summary slot.
    drawer: CATEGORY_DRAWER_ENTITY.placements.drawer,
    // v1.2 Collection placement — first realisation: the shared
    // serviceOverviewShell repeated once per assigned service in the summary
    // viewpoint, each card re-selecting the `view` footer that opens the real
    // Service drawer. The surface owns the N bindings.
    table: categoryCatalogTable,
    // D8: `bin` is the consumed schema (the Bin station's Category pane);
    // archived/trashed are declared for travel-preset completeness — no
    // hidden category-archived/category-trash station routes in v1.
    travel: {
      archived: categoryArchivedTable,
      trashed:  categoryTrashedTable,
      bin:      categoryBinTable,
    },
  },
};
