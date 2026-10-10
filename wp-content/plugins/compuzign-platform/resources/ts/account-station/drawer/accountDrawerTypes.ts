// Neutral Account drawer contracts — host-agnostic, mirroring
// serviceDrawerTypes.ts/packageFamilyDrawerTypes.ts. Admin Station is the
// only host today, but the composition names neither host nor entity beyond
// its own AccountDetail seed.

import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import type { DrawerTabId } from '@/drawer-kit/DrawerTabs';
import type { AccountDetail } from '../types';

export interface AccountDrawerContentProps {
  account: AccountDetail;
  initialTab?: DrawerTabId;
  initialEdit?: boolean;
  bridge: EntityDrawerHostBridge;
}

export type AccountExitDialog = 'unsaved' | null;
