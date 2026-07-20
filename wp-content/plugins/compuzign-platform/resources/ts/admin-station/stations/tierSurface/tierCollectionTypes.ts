import type { CategoryGroupCardItem } from '../../presentation/category-groups/types';
import type { StationIntentContext, StationRecordId } from '../recordIdentity';

export interface TierCollectionItem extends CategoryGroupCardItem {
  context: StationIntentContext;
}
export interface TierCollectionMeta {
  emptyMessage: 'No tiers configured';
  createLabel: 'Create first tier';
  createRecordId: StationRecordId;
  createContext: StationIntentContext | null;
}
