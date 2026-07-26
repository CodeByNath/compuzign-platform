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
  // Mirrors the reference implementation (resolveOverviewStatus, Service
  // Overview): incomplete → pending-dim, complete but not live → pending-full,
  // live → active. It NEVER returns 'disabled'.
  //
  // Disabled is a user action, owned by the record footer's enable/disable
  // control — not something a module infers. A Package Family has no `draft`
  // state (`'active' | 'disabled' | 'archived' | 'trashed'`), so a Family that
  // was created and never activated is stored `disabled` exactly like one an
  // operator switched off. Reading a Disabled pill off that ambiguity told a
  // brand-new record it had been turned off, and contradicted the footer offering
  // to enable it.
  resolveStatus: (family, ctx) => {
    if (ctx.moduleTransition === 'not-configured' || !family.name.trim()) return 'pending-dim';
    if (ctx.moduleTransition === 'pending') return 'pending-full';
    return ctx.platformStatus === 'active' ? 'active' : 'pending-full';
  },
};

export interface PackageFamilyRelationshipsLike {
  services: number;
  rateSheetRows: number;
  tierSelections: number;
}

// No lifecycle of its own — it follows the Family's, like tierFeaturesModule
// follows its Tier's, and reads Pending rather than Disabled until the Family is
// live. A projection cannot be "switched off"; only the record can.
export const packageFamilyRelationshipsModule: ModuleDefinition<PackageFamilyRelationshipsLike> = {
  key:         'package-family-relationships',
  emptyPrompt: 'No Services, Rate Sheet rows, or Tier selections use this Package Family yet.',
  isEmpty:     ({ services, rateSheetRows, tierSelections }) => services + rateSheetRows + tierSelections === 0,
  problems:    () => [],
  resolveStatus: (_relationships, ctx) => ctx.platformStatus === 'active' ? 'active' : 'pending-full',
};

export interface PackageFamilyCapabilitiesLike {
  tier: { enabled: boolean };
}

/** Capability absence is valid; only the Family platform lifecycle drives status. */
export const packageFamilyCapabilitiesModule: ModuleDefinition<PackageFamilyCapabilitiesLike> = {
  key:         'package-family-capabilities',
  isEmpty:     () => false,
  problems:    () => [],
  resolveStatus: (_capabilities, ctx) => ctx.platformStatus === 'active' ? 'active' : 'pending-full',
};
