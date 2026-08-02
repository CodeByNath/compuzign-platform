import type { PackageFamilyItem } from '../../../types';
import type { EntitySchema } from '@/drawer-kit/schema/types';
import {
  packageFamilyOverviewShell,
  packageFamilyCapabilitiesShell,
  packageFamilyRelationshipsShell,
} from '../bindings/packageFamily';

export const PACKAGE_FAMILY_ENTITY: EntitySchema = {
  id: 'package-family',
  label: { singular: 'Package Family', plural: 'Package Families' },
  identity: {
    idOf: (data: PackageFamilyItem) => data.group_id,
    platformIdOf: (data: PackageFamilyItem) => data.platform_id,
    titleOf: (data: PackageFamilyItem) => data.label,
  },
  lifecycle: {
    participation: 'canonical',
    statuses: ['draft', 'active', 'disabled', 'archived', 'trashed'],
  },
  shells: {
    overview: packageFamilyOverviewShell,
    relationships: packageFamilyRelationshipsShell,
    capabilities: packageFamilyCapabilitiesShell,
  },
  actions: {
    archive: { id: 'archive', label: 'Archive', intent: 'secondary' },
    trash: { id: 'trash', label: 'Move to Trash', intent: 'danger' },
    restore: { id: 'restore', label: 'Restore', intent: 'secondary' },
    delete: {
      id: 'delete', label: 'Permanently delete', intent: 'danger',
      confirm: { prompt: 'Delete permanently?', confirmLabel: 'Confirm' },
    },
  },
  placements: {
    drawer: {
      details: [{ module: 'overview', mode: 'details' }],
      connections: [
        { module: 'relationships', mode: 'connections' },
        { module: 'capabilities', mode: 'connections' },
      ],
    },
  },
};
