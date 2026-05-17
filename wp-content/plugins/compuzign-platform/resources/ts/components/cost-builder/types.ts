import type { TierId } from '@/api/types/cost-builder';

export interface QuoteItem {
  serviceId: number;
  serviceTitle: string;
  tierId: TierId;
  tierTitle: string;
  price: number | null;
  billingCycle: string;
}
