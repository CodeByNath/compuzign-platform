// Tier station manifest (Schema architecture S4, §9).
//
// Shell-occupant participation: the five tier shells (basic / standard /
// premium / enterprise / ultimate) are fixed slots on the Service-owned Package Station;
// the occupant travels (archive → bin → restore/swap/retarget), the shell
// never does. Behaviour stays with usePackageStation and the engine (D1–D4);
// everything here references existing presentation assets.

import type { SurfaceTierDetail } from '@/api/types/admin';
import {
  tierOverviewShell,
  tierFeaturesShell,
  tierFaqsShell,
  tierPricingShell,
} from '../shells/bindings/tier';
import { serviceOverviewShell } from '../shells/bindings/service';
import type { EntitySchema } from '../types';

export const TIER_ENTITY: EntitySchema = {
  id:    'tier',
  label: { singular: 'Tier', plural: 'Tiers' },
  identity: {
    // A shell-occupant has no id of its own — it is identified by the shell
    // (tier slot) it occupies, which the placement supplies; the occupant's
    // label is its display identity.
    idOf:    (d: SurfaceTierDetail) => d.label,
    titleOf: (d: SurfaceTierDetail) => d.label,
  },

  lifecycle: {
    participation: 'shell-occupant',
    // Occupants live (enabled/disabled) and travel (archived/trashed via the
    // occupant bin); they are never draft instances — an unsettled shell is
    // empty, not a draft.
    statuses: ['active', 'disabled', 'archived', 'trashed'],
  },

  ownership: { parent: 'service', label: 'Service' },

  // Keyed by backend module key (tier lifecycle endpoints: overview /
  // features / faqs). `service` is the parent station's primary module,
  // registered for the Connections group placement (shared shell object).
  shells: {
    overview: tierOverviewShell,
    features: tierFeaturesShell,
    faqs:     tierFaqsShell,
    pricing:  tierPricingShell,
    service:  serviceOverviewShell,
  },

  // Occupant travel actions (engine D2–D4). The restore-conflict flows
  // (swap / retarget / discard-and-retry) are richer than a declaration —
  // they stay with ServiceTierStep (recorded S3b deferral).
  actions: {
    archive: { id: 'archive', label: 'Archive',       intent: 'secondary' },
    restore: { id: 'restore', label: 'Restore',       intent: 'secondary' },
    trash:   { id: 'trash',   label: 'Move to Trash', intent: 'secondary' },
    delete:  {
      id: 'delete', label: 'Delete Permanently', intent: 'danger',
      confirm: { prompt: 'Delete permanently?', confirmLabel: 'Confirm' },
    },
  },

  placements: {
    drawer: {
      details: [
        { module: 'overview', mode: 'details' },
        { module: 'features', mode: 'details' },
        { module: 'faqs',     mode: 'details' },
        { module: 'pricing',  mode: 'details' },
      ],
      connections: [
        { module: 'service', mode: 'connections' },
      ],
    },
    // No table placements: the tier bin pane stays card-based (S3b recorded
    // deferral — restore-conflict flows are not expressible in RowActionDef).
  },
};
