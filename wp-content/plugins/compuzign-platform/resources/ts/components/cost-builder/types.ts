import type { TierId } from '@/api/types/cost-builder';

// 'bundle' = recommended bundle; 'promotion' = active promotion tier offer
export type QuoteItemTierId = TierId | 'bundle' | 'promotion';

export interface QuoteItem {
  serviceId: number;
  serviceTitle: string;
  tierId: QuoteItemTierId;
  tierTitle: string;
  price: number | null;
  billingCycle: string;
  categoryName: string;
  features: string[];
  // Optional promotion fields — absent on all Core Tier and bundle items.
  offer_type?: 'core_tier' | 'promotion_tier';
  promotion_id?: string;
  billing_label?: string;
}
