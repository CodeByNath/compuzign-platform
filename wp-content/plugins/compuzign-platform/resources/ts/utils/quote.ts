import type { QuoteItem } from '@/components/cost-builder/types';

export interface QuoteTotals {
  pricedItems: QuoteItem[];
  unpricedItems: QuoteItem[];
  cycleGroups: Record<string, number>;
  cycleEntries: [string, number][];
  hasMixedCycles: boolean;
  singleCycle: [string, number] | null;
}

export function calcQuoteTotals(items: QuoteItem[]): QuoteTotals {
  const pricedItems = items.filter((item) => item.price !== null);
  const unpricedItems = items.filter((item) => item.price === null);

  const cycleGroups = pricedItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.billingCycle] = (acc[item.billingCycle] ?? 0) + (item.price as number);
    return acc;
  }, {});

  const cycleEntries = Object.entries(cycleGroups) as [string, number][];
  const hasMixedCycles = cycleEntries.length > 1;
  const singleCycle = cycleEntries.length === 1 ? cycleEntries[0] : null;

  return { pricedItems, unpricedItems, cycleGroups, cycleEntries, hasMixedCycles, singleCycle };
}
