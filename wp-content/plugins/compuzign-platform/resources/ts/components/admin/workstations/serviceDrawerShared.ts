import type { TierId } from '@/api/types/cost-builder';

// Shared helpers for the service drawer step files (ServiceViewStep / ServiceTierStep).

export function decodeHtml(s: string): string {
  if (typeof document === 'undefined') return s;
  const el = document.createElement('textarea');
  el.innerHTML = s;
  return el.value;
}

export const TIER_KEYS: TierId[] = ['basic', 'standard', 'premium', 'enterprise'];

export const TIER_LABELS: Record<string, string> = {
  basic: 'Basic', standard: 'Standard', premium: 'Premium', enterprise: 'Enterprise',
};
