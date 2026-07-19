import type { CategoryStationItem } from '@/api/types/admin';
import type { EntitySchema } from '@/drawer-kit/schema/types';
import { categoryOverviewShell, categoryServicesShell } from '../bindings/category';

// Host-neutral Category drawer manifest. Command Centre extends this exact
// manifest with its table/travel placements; Admin Station consumes only the
// drawer placement, so neither host's renderer tree crosses the boundary.
export const CATEGORY_DRAWER_ENTITY: EntitySchema = {
  id: 'category',
  label: { singular: 'Category', plural: 'Categories' },
  identity: {
    idOf: (data: CategoryStationItem) => data.id,
    titleOf: (data: CategoryStationItem) => data.name,
  },
  lifecycle: {
    participation: 'canonical',
    statuses: ['draft', 'active', 'disabled', 'archived', 'trashed'],
  },
  shells: {
    overview: categoryOverviewShell,
    services: categoryServicesShell,
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
      connections: [{ module: 'services', mode: 'connections' }],
    },
  },
};
