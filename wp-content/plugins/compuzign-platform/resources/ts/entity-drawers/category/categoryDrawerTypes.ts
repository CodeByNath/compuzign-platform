import type { CategoryStationItem } from '@/api/types/admin';
import type { ServiceSummary } from '@/service-station';
import type { DrawerTabId } from '@/drawer-kit/DrawerTabs';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';

export interface CategoryDrawerContentProps {
  category: CategoryStationItem;
  assignedServices: ServiceSummary[];
  initialTab?: DrawerTabId;
  initialEdit?: boolean;
  bridge: EntityDrawerHostBridge;
}

export type CategoryExitDialog = 'unsaved' | null;
export type CategoryConfirmDialog = 'publish' | 'discard' | 'trash' | 'delete' | null;
