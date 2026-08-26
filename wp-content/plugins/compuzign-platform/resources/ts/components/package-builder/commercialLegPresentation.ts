import type { CommercialLegComponent, CommercialLegPeriod } from '@/api/types/cost-builder';

// Relocated from FamilyTierAdapter.tsx (Phase 7) so PlanDetailsModal.tsx can
// reuse the exact same Period/component presentation helpers without a
// circular import between the two files. Logic unchanged from the original —
// this is a pure relocation, not a new resolution of any of these facts.

// "Month 1–12" / "Month 13–Indefinite" — built entirely from the Period's
// own resolved from_month/to_month, the same "Indefinite" convention the
// Commercial Legs Debug tool already uses for a null to_month. Not a
// marketing label: there is no other existing customer-facing terminology
// for a resolved Period to reuse instead.
export function periodLabel(period: CommercialLegPeriod): string {
  const to = period.to_month === null ? 'Indefinite' : String(period.to_month);
  return `Month ${period.from_month}–${to}`;
}

// One Period's own AVAILABLE commercial components, in the resolver's own
// order — the single place "available" is defined. Never counts an
// unavailable component; never re-sorts or re-groups what the resolver
// already returned.
export function availablePeriodComponents(period: CommercialLegPeriod): CommercialLegComponent[] {
  return period.components.filter((component) => component.available);
}

// Every AVAILABLE commercial component across a variant's resolved Periods,
// in the Periods'/components' own resolved order — the flattened form of
// availablePeriodComponents() above.
export function availableComponents(periods: CommercialLegPeriod[]): CommercialLegComponent[] {
  return periods.flatMap(availablePeriodComponents);
}

// Customer-facing name for one resolved commercial component — the exact
// billing-cycle vocabulary already audited elsewhere in this codebase
// (PricingTiers.tsx's own maps, utils/format.ts's CYCLE_LABELS): monthly/
// annual/annually/quarterly/one-time/upfront. A neutral fallback ('Payment')
// covers both a genuinely null billing_cycle and any future/unmapped value.
const COMPONENT_PAYMENT_NAMES: Record<string, string> = {
  monthly: 'Monthly payment',
  annual: 'Annual payment',
  annually: 'Annual payment',
  quarterly: 'Quarterly payment',
  'one-time': 'One-time payment',
  upfront: 'Upfront payment',
};

export function componentPaymentName(cycle: string | null): string {
  if (cycle === null) return 'Payment';
  return COMPONENT_PAYMENT_NAMES[cycle] ?? 'Payment';
}

// Short, capitalized billing-cycle labels — used by the focused shell's
// "Plan billing" fact and, since Phase 7, the Plan Details popup's own
// Frequency column/sentence labels.
export const PLAN_BILLING_CYCLE_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  annual: 'Annual',
  annually: 'Annual',
  quarterly: 'Quarterly',
  'one-time': 'One-time',
  upfront: 'Upfront',
};
