import type { EntitySchema } from '@/drawer-kit/schema/types';
import { accountBrandShell } from '../bindings/account';

// Account's one owned module, Brand, sits in the Overview-equivalent 'details'
// slot. Connections is deliberately empty: the singleton has no relationships
// to project — DrawerTabs still renders the fixed two-tab bar (it is not
// configurable), but nothing is placed under it.
export const ACCOUNT_ENTITY: EntitySchema = {
  id: 'account',
  label: { singular: 'Account Profile', plural: 'Account Profile' },
  identity: {
    // The record IS the singleton, addressed by its own fixed native
    // reference (AccountIdentity::NATIVE_PROFILE) rather than a numeric or
    // string record id — there is only ever one.
    idOf: () => 'account-profile',
    platformIdOf: (data) => data.nodes.profile.platformId,
    titleOf: (data) => (data.brand.name?.trim() || 'Account Profile'),
  },
  lifecycle: {
    participation: 'canonical',
    // Archive/Trash/permanent-delete are not implemented for this singleton
    // (flagged, not silently resolved — see docs/code-map/account-station.md).
    statuses: ['active', 'disabled'],
  },
  shells: {
    brand: accountBrandShell,
  },
  // No entity travel actions: Account has no Archive/Trash/Restore/Delete.
  actions: {},
  placements: {
    drawer: {
      details: [{ module: 'brand', mode: 'details' }],
      connections: [],
    },
  },
};
