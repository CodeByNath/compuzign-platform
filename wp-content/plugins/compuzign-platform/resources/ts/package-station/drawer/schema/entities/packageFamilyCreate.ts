import type { EntitySchema } from '@/drawer-kit/schema/types';
import { packageFamilyOverviewShell } from '../bindings/packageFamily';
import type { PackageFamilyOverviewShellData } from '../bindings/packageFamily';

// A Package Family being created. It declares no travel actions, because
// creating is ONE save and nothing else — archiving, trashing and restoring
// belong to the Family afterwards, reached through the mature Family drawer.
//
// It reuses that drawer's OWN Family Overview shell rather than describing the
// same two fields again: the module a Family is read and edited through is the
// module it is created through, so the create surface cannot drift from it.
//
// Connections is empty on purpose: a Family that does not exist yet is connected
// to nothing, and the optional Tier capability that may follow the save is a
// record-level choice on the drawer footer, not a connection to browse.
export const PACKAGE_FAMILY_CREATE_ENTITY: EntitySchema = {
  id: 'package-family-create',
  label: { singular: 'Package Family', plural: 'Package Families' },
  identity: {
    idOf: (data: PackageFamilyOverviewShellData) => data.groupId,
    titleOf: (data: PackageFamilyOverviewShellData) => data.name,
  },
  lifecycle: {
    participation: 'canonical',
    statuses: ['draft', 'active'],
  },
  shells: { overview: packageFamilyOverviewShell },
  actions: {},
  placements: {
    drawer: {
      details: [{ module: 'overview', mode: 'details' }],
      connections: [],
    },
  },
};
