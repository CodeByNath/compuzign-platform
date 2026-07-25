import type { PackageFamilyItem } from '../../types';
import type { DrawerTabId } from '@/drawer-kit/DrawerTabs';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';

export interface PackageFamilyDrawerContentProps {
  family: PackageFamilyItem;
  initialTab?: DrawerTabId;
  initialEdit?: boolean;
  onManageTierSystem?: (instanceId: string) => void;
  bridge: EntityDrawerHostBridge;
}

export type PackageFamilyConfirmDialog = 'publish' | 'discard' | 'trash' | 'delete' | null;
export type PackageFamilyExitDialog = 'unsaved' | null;
