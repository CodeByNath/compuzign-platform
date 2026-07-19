import type { PackageFamilyItem } from '@/api/types/admin';
import type { EntitySchema } from '@/drawer-kit/schema/types';
import {
  packageFamilyOverviewShell,
  packageFamilyRelationshipsShell,
} from '../bindings/packageFamily';

export const PACKAGE_FAMILY_ENTITY: EntitySchema = {
  id: 'package-family',
  label: { singular: 'Package Family', plural: 'Package Families' },
  identity: {
    idOf: (data: PackageFamilyItem) => data.group_id,
    titleOf: (data: PackageFamilyItem) => data.label,
  },
  lifecycle: {
    participation: 'canonical',
    statuses: ['draft', 'active', 'disabled', 'archived', 'trashed'],
  },
  shells: {
    overview: packageFamilyOverviewShell,
    relationships: packageFamilyRelationshipsShell,
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
      connections: [{ module: 'relationships', mode: 'connections' }],
    },
  },
};
