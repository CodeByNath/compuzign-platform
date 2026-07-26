// Canonical Tier-system manifest. It owns instance-level configuration only;
// fixed-slot occupant modules remain in TIER_ENTITY.

import type { EntitySchema } from '@/drawer-kit/schema/types';
import type { TierInstanceRecord } from '../../../types';
import { tierRateSheetAccessShell } from '../bindings/tierInstance';

export const TIER_INSTANCE_ENTITY: EntitySchema = {
  id: 'tier-instance',
  label: { singular: 'Tier System', plural: 'Tier Systems' },
  identity: {
    idOf: (record: TierInstanceRecord) => record.tier_instance_id,
    titleOf: (record: TierInstanceRecord) => record.title,
  },
  lifecycle: {
    participation: 'canonical',
    statuses: ['draft', 'active', 'disabled', 'archived', 'trashed'],
  },
  shells: { 'rate-sheet-access': tierRateSheetAccessShell },
  actions: {},
  placements: {
    drawer: {
      details: [{ module: 'rate-sheet-access', mode: 'details' }],
      connections: [],
    },
  },
};
