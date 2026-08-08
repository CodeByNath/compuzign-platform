// Tier Edition manifest (Schema architecture S4) — additive, not yet wired
// into any placement (drawer refinement blueprint, Phase 4).
//
// Unlike TIER_ENTITY's shell-occupant participation (a fixed slot the
// occupant travels through), an Edition is a genuine independently
// addressed, independently lifecycled child record with the shared
// StationLifecycle engine's full vocabulary — the same lifecycle shape
// Package Family uses, just owned by the Tier occupant rather than
// top-level. See docs/code-map/tier-edition.md.

import type { TierEdition } from '../../../types';
import { tierEditionOverviewShell, tierEditionInclusionsShell } from '../bindings/tierEdition';
import type { EntitySchema } from '@/drawer-kit/schema/types';

export const TIER_EDITION_ENTITY: EntitySchema = {
  id:    'tier-edition',
  label: { singular: 'Edition', plural: 'Editions' },
  identity: {
    idOf:         (d: TierEdition) => d.id,
    platformIdOf: (d: TierEdition) => d.edition_platform_id,
    titleOf:      (d: TierEdition) => d.title,
  },
  lifecycle: {
    participation: 'canonical',
    statuses:      ['draft', 'active', 'disabled', 'archived', 'trashed'],
  },
  ownership: { parent: 'tier', label: 'Tier' },
  shells: {
    overview:   tierEditionOverviewShell,
    inclusions: tierEditionInclusionsShell,
  },
  actions: {},
  placements: {
    drawer: {
      details: [
        { module: 'overview', mode: 'details' },
        { module: 'inclusions', mode: 'details' },
      ],
      connections: [],
    },
  },
};
