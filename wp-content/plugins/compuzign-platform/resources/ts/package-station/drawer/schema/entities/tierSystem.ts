import type { EntitySchema } from '@/drawer-kit/schema/types';
import { tierSystemOverviewShell, tierRateSheetAccessShell } from '../bindings/tierSystem';

// The one Tier System manifest. Tier System registration is the pending/
// new-record state of this SAME lifecycle, not a separate product workflow —
// so one entity serves both an unpublished draft (no `tier_instance_id` yet)
// and a persisted instance. Fixed-slot occupant modules (Basic/Standard/
// Premium/Enterprise/Ultimate) remain entirely on TIER_ENTITY; this manifest
// owns instance-level configuration only.
export const TIER_SYSTEM_ENTITY: EntitySchema = {
  id: 'tier-system',
  label: { singular: 'Tier System', plural: 'Tier Systems' },
  identity: {
    idOf: (data: { reference: string | null }) => data.reference ?? '',
    platformIdOf: (data: { platformId: string | null }) => data.platformId ?? '',
    titleOf: (data: { title: string }) => data.title,
  },
  lifecycle: {
    participation: 'canonical',
    statuses: ['draft', 'active', 'disabled', 'archived', 'trashed'],
  },
  shells: {
    overview:            tierSystemOverviewShell,
    'rate-sheet-access':  tierRateSheetAccessShell,
  },
  actions: {},
  placements: {
    drawer: {
      details: [
        { module: 'overview', mode: 'details' },
        { module: 'rate-sheet-access', mode: 'details' },
      ],
      connections: [],
    },
  },
};
