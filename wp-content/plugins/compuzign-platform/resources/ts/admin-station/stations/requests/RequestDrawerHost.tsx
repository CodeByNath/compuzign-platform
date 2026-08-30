// CRM-1B: the read-only Request drawer. Registered with
// `supportedModes: ['view']` only — the first single-mode drawer template in
// Admin Station (every other registration supports 'view' | 'edit'), which
// the generic AdminStationDrawer/DrawerContentProps contract already
// supports without change: it clamps a requested mode to what the template
// declares and simply never receives an 'edit' intent here (register.ts
// gives Requests only a `view` actionIntent). This composition never calls
// setFooter/setCloseGuard — there is nothing to save and nothing to guard —
// so the shell renders its default close-only chrome, exactly as documented
// for content that supplies neither.
//
// Sections render through the shared drawer-kit ReadBlock (the same card
// every module in every other drawer uses) with no `status` and no
// `actions` — a plain read card, no lifecycle pill, no footer — rather than
// inventing a second card/section presentation for one read-only surface.

import { ReadBlock } from '@/drawer-kit/ReadBlock';
import { fetchAdminRequest } from '@/api/endpoints/admin';
import { useApi } from '@/hooks/useApi';
import type { DrawerContentProps } from '@/station-manager/drawerTypes';
import type { RequestEntry, RequestLine } from '@/api/types/admin';

const REQUEST_TYPE_LABELS: Record<string, string> = {
  quote_cart: 'Quote request',
  free_it_assessment: 'Free IT assessment',
};

const REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  cancelled: 'Cancelled',
};

function formatPrice(item: RequestLine): string {
  if (item.price === null) return 'Custom pricing';
  const cycle = item.billingCycle ? ` / ${item.billingCycle}` : '';
  return `$${item.price.toFixed(2)}${cycle}`;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <p class="cz-requests-drawer__fact">
      <strong>{label}</strong>
      <span>{value}</span>
    </p>
  );
}

export function RequestDrawerHost({ recordId }: DrawerContentProps) {
  const api = useApi(() => fetchAdminRequest(String(recordId)));

  if (api.loading && !api.data) {
    return <div class="cz-station-drawer__state">Loading Request…</div>;
  }
  if (api.error || !api.data?.success) {
    return <div class="cz-station-drawer__state" role="alert">This Request could not be loaded.</div>;
  }

  const request: RequestEntry = api.data.request;

  return (
    <div class="cz-requests-drawer">
      <ReadBlock title="Request identity">
        <Fact label="Reference" value={request.quote_ref} />
        <Fact label="Platform ID" value={request.platform_id || 'Not assigned'} />
        <Fact label="Status" value={REQUEST_STATUS_LABELS[request.status] ?? request.status} />
        <Fact label="Type" value={REQUEST_TYPE_LABELS[request.type] ?? request.type} />
        <Fact label="Submitted" value={request.submitted} />
      </ReadBlock>

      <ReadBlock title="Contact">
        <Fact label="Contact" value={request.contact} />
        <Fact label="Company" value={request.company || '—'} />
        <Fact label="Email" value={request.email} />
        <Fact label="Phone" value={request.phone || '—'} />
        {request.category && <Fact label="Category" value={request.category} />}
        {request.notes !== '' && <p class="cz-requests-drawer__notes">{request.notes}</p>}
      </ReadBlock>

      <ReadBlock title="Submitted items">
        {request.items.length === 0 ? (
          <p class="cz-station-empty">No cart items — this is a {REQUEST_TYPE_LABELS[request.type] ?? request.type}.</p>
        ) : (
          <ul class="cz-requests-drawer__items">
            {request.items.map((item, index) => (
              // The submitted snapshot carries no stable per-line id — it is an
              // immutable array from the customer's own submission, never
              // reordered or mutated after the fact, so a positional key is safe.
              <li key={index} class="cz-requests-drawer__item">
                <span class="cz-requests-drawer__item-copy">
                  <strong>{item.serviceTitle}</strong>
                  <small>{[item.categoryName, item.tierTitle].filter(Boolean).join(' · ')}</small>
                </span>
                <span class="cz-requests-drawer__item-price">{formatPrice(item)}</span>
              </li>
            ))}
          </ul>
        )}
      </ReadBlock>
    </div>
  );
}
