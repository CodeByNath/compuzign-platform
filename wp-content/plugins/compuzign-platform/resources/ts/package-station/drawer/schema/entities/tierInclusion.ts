import type { EntitySchema } from '@/drawer-kit/schema/types';
import type { TierInclusionRecord } from '../../inclusion/tierInclusionRecord';
import {
  tierInclusionCategoryShell,
  tierInclusionOverviewShell,
  tierInclusionRateSheetShell,
  tierInclusionServiceShell,
} from '../bindings/tierInclusion';

// A Tier inclusion is a shell occupant: it has no lifecycle of its own. It
// exists while the Tier selects the row and the row exists; publishing,
// archiving and trashing belong to the Tier and to the Rate Sheet. So the
// manifest declares no travel actions and no lifecycle statuses beyond the two
// the selection can honestly be in.
export const TIER_INCLUSION_ENTITY: EntitySchema = {
  id: 'tier-inclusion',
  label: { singular: 'Inclusion', plural: 'Inclusions' },
  identity: {
    // The Tier's selection key, not the display label.
    idOf: (data: TierInclusionRecord) => data.itemId,
    titleOf: (data: TierInclusionRecord) => data.name,
  },
  lifecycle: {
    participation: 'shell-occupant',
    statuses: ['active', 'draft'],
  },
  ownership: { parent: 'tier', label: 'Tier' },
  shells: {
    overview: tierInclusionOverviewShell,
    service: tierInclusionServiceShell,
    category: tierInclusionCategoryShell,
    'rate-sheet': tierInclusionRateSheetShell,
  },
  actions: {},
  placements: {
    drawer: {
      details: [{ module: 'overview', mode: 'details' }],
      connections: [
        { module: 'service', mode: 'connections' },
        { module: 'category', mode: 'connections' },
        { module: 'rate-sheet', mode: 'connections' },
      ],
    },
  },
};
