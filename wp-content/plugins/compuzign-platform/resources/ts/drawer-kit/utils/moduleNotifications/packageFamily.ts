// Package Family module rules — Package-owned commercial group overview plus its
// read-only dependency projection. These use the same evaluator, status-pill,
// and notification-panel system as every other mature drawer module.

import type { ModuleDefinition } from './shared';

export interface PackageFamilyOverviewLike {
  name: string;
  description: string;
}

export const packageFamilyOverviewModule: ModuleDefinition<PackageFamilyOverviewLike> = {
  key:                'package-family-overview',
  emptyPrompt:        'Edit and name this Package Family.',
  isEmpty:            (family) => !family.name.trim(),
  includeDraftInTail: true,
  problems: (family) => family.name.trim()
    ? []
    : [{ id: 'package-family-overview.name.missing', message: 'Name missing', type: 'error' }],
  resolveStatus: (family, ctx) => {
    if (ctx.moduleTransition === 'not-configured' || !family.name.trim()) return 'pending-dim';
    if (ctx.platformStatus === 'disabled') {
      return ctx.moduleTransition === 'settled' ? 'disabled' : 'pending-dim';
    }
    if (ctx.moduleTransition === 'pending') return 'pending-full';
    return 'active';
  },
};

export interface PackageFamilyRelationshipsLike {
  services: number;
  rateSheetRows: number;
  tierSelections: number;
}

export const packageFamilyRelationshipsModule: ModuleDefinition<PackageFamilyRelationshipsLike> = {
  key:         'package-family-relationships',
  emptyPrompt: 'No Services, Rate Sheet rows, or Tier selections use this Package Family yet.',
  isEmpty:     ({ services, rateSheetRows, tierSelections }) => services + rateSheetRows + tierSelections === 0,
  problems:    () => [],
  resolveStatus: (_relationships, ctx) => ctx.platformStatus === 'active' ? 'active' : 'disabled',
};
