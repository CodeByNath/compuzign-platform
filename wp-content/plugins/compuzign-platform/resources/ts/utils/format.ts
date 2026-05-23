export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return 'Contact Us';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const CYCLE_LABELS: Record<string, string> = {
  monthly:    '/ mo',
  annual:     '/ yr',
  quarterly:  '/ qtr',
  'one-time': '',
};

export function formatCycleLabel(billingCycle: string): string {
  return CYCLE_LABELS[billingCycle] ?? '';
}
