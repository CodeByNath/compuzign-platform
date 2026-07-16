// Service station manifest (Schema architecture S4, §9).
//
// Declares — never re-implements — the Service station's identity, lifecycle
// participation, shells, travel actions, and placements. All behaviour stays
// with the Station (StationLifecycle.php, useServiceStation, the module REST
// endpoints); everything here is a reference to existing presentation assets.

import type { ServiceSummary } from '@/admin-station/stations/service';
import {
  serviceOverviewShell,
  serviceInclusionsShell,
  serviceFaqsShell,
  servicePackageSummaryShell,
} from '../shells/bindings/service';
import {
  serviceCatalogTable,
  serviceArchivedTable,
  serviceTrashedTable,
  serviceBinTable,
} from '../tables/service';
import type { EntitySchema } from '../types';

export const SERVICE_ENTITY: EntitySchema = {
  id:    'service',
  label: { singular: 'Service', plural: 'Services' },
  identity: {
    idOf:    (d: ServiceSummary) => d.id,
    titleOf: (d: ServiceSummary) => d.title,
  },

  lifecycle: {
    participation: 'canonical',
    statuses: ['draft', 'active', 'disabled', 'archived', 'trashed'],
  },

  // Keyed by backend module key (service detail: overview / inclusions /
  // faqs). `package` is the related Package Station's primary module,
  // surfaced through the service station's package registry — it registers
  // here so the Connections group can place it (related stations' shells,
  // §8); the shell object itself is shared, never copied.
  shells: {
    overview:   serviceOverviewShell,
    inclusions: serviceInclusionsShell,
    faqs:       serviceFaqsShell,
  },

  // Entity travel actions (StationLifecycle transitions). Declarations only —
  // behaviour arrives as handlers from the owning surface, never from here.
  actions: {
    archive: { id: 'archive', label: 'Archive',       intent: 'secondary' },
    trash:   { id: 'trash',   label: 'Move to Trash', intent: 'danger' },
    restore: { id: 'restore', label: 'Restore',       intent: 'secondary' },
    delete:  {
      id: 'delete', label: 'Permanently delete', intent: 'danger',
      confirm: { prompt: 'Are you sure?', confirmLabel: 'Confirm' },
    },
  },

  placements: {
    // Drawer Tab Contract keys — Details = the station's own shells in the
    // `details` viewpoint; Connections = related stations (Commercial group:
    // the package summary in the `summary` viewpoint).
    drawer: {
      details: [
        { module: 'overview',   mode: 'details' },
        { module: 'inclusions', mode: 'details' },
        { module: 'faqs',       mode: 'details' },
      ],
      connections: [],
    },
    table: serviceCatalogTable,
    travel: {
      archived: serviceArchivedTable,
      trashed:  serviceTrashedTable,
      bin:      serviceBinTable,
    },
  },
};
