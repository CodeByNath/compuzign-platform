import type { TierId } from '@/api/types/cost-builder';

// 'bundle' extends the API TierId for frontend-only recommended bundle quote items (no API change needed)
export type QuoteItemTierId = TierId | 'bundle';

export interface QuoteItem {
  serviceId: number;
  serviceTitle: string;
  tierId: QuoteItemTierId;
  tierTitle: string;
  price: number | null;
  billingCycle: string;
  categoryName: string;
  features: string[];
}
