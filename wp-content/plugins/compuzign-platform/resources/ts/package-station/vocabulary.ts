import type { TierId } from '@/api/types/cost-builder';

export const TIER_KEYS: TierId[] = ['basic', 'standard', 'premium', 'enterprise', 'ultimate'];
export const PRIMARY_TIER_INSTANCE_ID = 'ti_primary';

export const TIER_LABELS: Record<string, string> = {
  basic: 'Basic', standard: 'Standard', premium: 'Premium', enterprise: 'Enterprise', ultimate: 'Ultimate',
};
