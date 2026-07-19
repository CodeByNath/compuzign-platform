// Category module rules (S6) — the Category's owned overview module and its
// relation-summary gateway, plus the Service Category Group pair one level up
// (Category-owned taxonomy; the group module resolves byte-for-byte like its
// Category counterpart).

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

// ── Category Group modules (Category Group audit, Option B) ──────────────────
// Same two-module shape as Category, one level up: an owned overview module and
// a relation-summary gateway — here counting child categories instead of
// assigned services. Byte-for-byte the same resolution rules as their Category
// counterparts (station_role is a storage/relation concern; it does not change
// how a station's own modules resolve).

export interface ServiceCategoryGroupOverviewLike {
  name:        string;
  description: string;
  slug:        string;
}

export const serviceCategoryGroupOverviewModule: ModuleDefinition<ServiceCategoryGroupOverviewLike> = {
  key:                'category-group-overview',
  emptyPrompt:        'Edit and name this category group.',
  isEmpty:            (g) => !g.name.trim(),
  includeDraftInTail: true,
  // Completeness = name only; description is OPTIONAL (matches Category — never
  // re-add a "Description missing" gate).
  problems: (g) => {
    const out: ModuleNote[] = [];
    if (!g.name.trim()) out.push({ id: 'category-group-overview.name.missing', message: 'Name missing', type: 'error' });
    return out;
  },
  resolveStatus: (g, ctx) => {
    if (ctx.moduleTransition === 'not-configured') return 'pending-dim';
    if (!g.name.trim())                            return 'pending-dim';
    if (ctx.moduleTransition === 'pending')        return 'pending-full';
    return ctx.platformStatus === 'active' ? 'active' : 'disabled';
  },
};

// Service Category Group Categories — the relation-summary gateway, one level up from
// categoryServicesModule: counts child category terms, not services.
