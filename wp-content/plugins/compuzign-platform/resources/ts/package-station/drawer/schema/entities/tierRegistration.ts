import type { EntitySchema } from '@/drawer-kit/schema/types';
import { tierRegistrationOverviewShell } from '../bindings/tierRegistration';
import type { TierRegistrationShellData } from '../bindings/tierRegistration';

// A Tier system being registered is canonical — it becomes a real record the
// moment it is saved — but it declares no travel actions, because registering is
// ONE creation and nothing else. Publishing, disabling and archiving belong to
// the instance afterwards, reached through the workspace rather than here.
//
// Connections is empty on purpose: a Tier system that does not exist yet is
// connected to nothing, and the Family it may be given to is a field of this
// module rather than a connection to browse.
export const TIER_REGISTRATION_ENTITY: EntitySchema = {
  id: 'tier-registration',
  label: { singular: 'Tier System', plural: 'Tier Systems' },
  identity: {
    idOf: (data: TierRegistrationShellData) => data.reference ?? '',
    titleOf: (data: TierRegistrationShellData) => data.title,
  },
  lifecycle: {
    participation: 'canonical',
    statuses: ['draft', 'active'],
  },
  shells: { overview: tierRegistrationOverviewShell },
  actions: {},
  placements: {
    drawer: {
      details: [{ module: 'overview', mode: 'details' }],
      connections: [],
    },
  },
};
