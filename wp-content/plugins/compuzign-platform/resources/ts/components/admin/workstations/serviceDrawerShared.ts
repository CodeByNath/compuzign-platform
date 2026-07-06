import type { ServiceItem, TierId } from '@/api/types/cost-builder';
import type { ShellBinding } from '@/components/admin/schema/types';
import type { ServiceOverviewShellData } from '@/components/admin/schema/shells/bindings/service';

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

// Related-service connection binding for the tier/promotion drawers'
// Connections tabs (S3a): the Service Overview shell in the `connections`
// viewpoint. The full parent ServiceItem (richer than the station's service
// stub) supplies title/content/categories when available; the station stub
// supplies the child-relation counts. Read-only relational view — the only
// handler is View (back to the Service drawer); state carries the parent's
// presentation status with no notes.
export function serviceConnectionBinding(
  serviceItem: ServiceItem | undefined,
  stub: { title: string; inclusions?: unknown[]; faqs?: unknown[] },
  onView?: () => void,
): ShellBinding<ServiceOverviewShellData> {
  const status = (serviceItem?.meta?.platform_status ?? 'disabled') === 'active' ? 'active' : 'disabled';
  return {
    data: {
      title: decodeHtml(serviceItem?.title ?? stub.title) || 'Untitled service',
      category: serviceItem && serviceItem.categories.length > 0
        ? serviceItem.categories.map((c) => decodeHtml(c.name)).join(', ')
        : 'Not selected',
      content: serviceItem?.content ? decodeHtml(serviceItem.content) : '',
      includes: {
        features: stub.inclusions?.length ?? 0,
        faqs:     stub.faqs?.length ?? 0,
      },
    },
    state:    { status, notes: [] },
    hasDraft: false,
    handlers: onView ? { view: onView } : {},
  };
}
