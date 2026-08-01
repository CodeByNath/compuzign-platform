// Category module rules (S6) — the Category's owned overview module and its
// relation-summary gateway.

import type { ModuleDefinition, ModuleNote } from './shared';

// Category Overview — the category's single owned module. Data is the
// draft-preferred projection (name + description; slug is immutable, D5, and
// carried for display only). Completeness = name + description, matching the
// service overview's stance (description required).

export interface CategoryOverviewLike {
  name:        string;
  description: string;
  slug:        string;
}

export const categoryOverviewModule: ModuleDefinition<CategoryOverviewLike> = {
  key:                'category-overview',
  emptyPrompt:        'Edit and name this category.',
  isEmpty:            (c) => !c.name.trim(),
  includeDraftInTail: true,
  // Completeness = name only; description is OPTIONAL (no "Description missing" error).
  problems: (c) => {
    const out: ModuleNote[] = [];
    if (!c.name.trim()) out.push({ id: 'category-overview.name.missing', message: 'Name missing', type: 'error' });
    return out;
  },
  // Canonical 5-state resolution per the S6 blueprint: settled+active → active;
  // incomplete → pending-dim; complete-unsettled → pending-full; platform
  // disabled → disabled (the category is deliberately off, not awaiting first
  // publish — deliberate divergence from the service overview's pending-full).
  resolveStatus: (c, ctx) => {
    if (ctx.moduleTransition === 'not-configured') return 'pending-dim';
    if (!c.name.trim())                            return 'pending-dim';
    if (ctx.moduleTransition === 'pending')        return 'pending-full';
    return ctx.platformStatus === 'active' ? 'active' : 'disabled';
  },
};

// Category Services — the relation-summary gateway (D4). Pure synchronous
// projection of assigned-service counts; no own lifecycle (Boundary Test), so
// status follows the category's platform status. Precedent: tierFeaturesModule.

export interface CategoryServicesLike {
  total: number;
  active: number;
  disabled: number;
}

export const categoryServicesModule: ModuleDefinition<CategoryServicesLike> = {
  key:         'category-services',
  emptyPrompt: 'No Services are assigned to this Category yet.',
  isEmpty:     ({ total }) => total === 0,
  problems:    () => [],
  resolveStatus: (_counts, ctx) => ctx.platformStatus === 'active' ? 'active' : 'disabled',
};
