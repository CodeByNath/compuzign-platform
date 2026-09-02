import type { EntitySchema } from '@/drawer-kit/schema/types';
import { tierCustomerPolicyOverviewShell } from '../bindings/tierCustomerPolicy';
import type { TierCustomerPolicyShellData } from '../bindings/tierCustomerPolicy';

// The composable occupant's own Customer Selection Rules controller. It has
// no lifecycle of its own — it edits customer-facing behaviour over an
// occupant that is already published through the unchanged normal Tier
// occupant editor, so it declares no travel actions and no lifecycle
// statuses. One shell only (no Connections placement): the policy
// references the occupant's own existing inclusion item_ids, so there is no
// separate relationship to show.
export const TIER_CUSTOMER_POLICY_ENTITY: EntitySchema = {
  id: 'tier-customer-policy',
  label: { singular: 'Customer Selection Rules', plural: 'Customer Selection Rules' },
  identity: {
    idOf: (_data: TierCustomerPolicyShellData) => 'customer-policy',
    titleOf: (_data: TierCustomerPolicyShellData) => 'Customer Selection Rules',
  },
  lifecycle: {
    participation: 'shell-occupant',
    statuses: ['active', 'draft'],
  },
  ownership: { parent: 'tier', label: 'Build Your Own' },
  shells: {
    overview: tierCustomerPolicyOverviewShell,
  },
  actions: {},
  placements: {
    drawer: {
      details: [{ module: 'overview', mode: 'details' }],
      connections: [],
    },
  },
};
