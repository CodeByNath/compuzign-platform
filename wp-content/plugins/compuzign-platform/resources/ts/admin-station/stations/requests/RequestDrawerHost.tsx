// CRM-1B: the read-only Request drawer. Registered with
// `supportedModes: ['view']` only — the first single-mode drawer template in
// Admin Station (every other registration supports 'view' | 'edit'), which
// the generic AdminStationDrawer/DrawerContentProps contract already
// supports without change: it clamps a requested mode to what the template
// declares and simply never receives an 'edit' intent here (register.ts
// gives Requests only a `view` actionIntent).
//
// CRM-1C: this composition calls setFooter for Approve/Cancel Request —
// whole-record mutations, pending status only — and setHeaderAction for
// Print / Save PDF (every status; not a mutation, so it lives beside the
// header × rather than in the footer, audit correction after live review).
// It still never calls setCloseGuard — none of these actions leave unsaved
// state to guard against.
//
// Sections render through the shared drawer-kit ReadBlock (the same card
// every module in every other drawer uses) with no `status` and no
// `actions` — a plain read card, no lifecycle pill — rather than inventing a
// second card/section presentation for one read-only surface.

import { useEffect, useState } from 'preact/hooks';
import { ReadBlock } from '@/drawer-kit/ReadBlock';
import { fetchAdminRequest } from '@/api/endpoints/admin';
import { useApi } from '@/hooks/useApi';
import { IconButton } from '@/admin-station/shell/IconButton';
import { PrintIcon } from '@/admin-station/shell/icons';
import { requestComposableDetail, requestItemDisplay } from './requestItemDisplay';
import { useRequestDrawerActions } from './useRequestDrawerActions';
import { RequestDrawerFooter } from './RequestDrawerFooter';
import { RequestDrawerDialogs } from './RequestDrawerDialogs';
import type { DrawerContentProps } from '@/station-manager/drawerTypes';
import type { RequestEntry } from '@/api/types/admin';

const REQUEST_TYPE_LABELS: Record<string, string> = {
  quote_cart: 'Quote request',
  free_it_assessment: 'Free IT assessment',
};

const REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  cancelled: 'Cancelled',
};

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <p class="cz-requests-drawer__fact">
      <strong>{label}</strong>
      <span>{value}</span>
    </p>
  );
}

export function RequestDrawerHost({ recordId, onSaved, setFooter, setHeaderAction }: DrawerContentProps) {
  const api = useApi(() => fetchAdminRequest(String(recordId)));
  // The status PATCH already returns the fresh detail projection — this
  // override lets the drawer reflect it immediately without a second GET
  // round trip through fetchAdminRequest().
  const [override, setOverride] = useState<RequestEntry | null>(null);
  const request: RequestEntry | null = override ?? api.data?.request ?? null;

  const actions = useRequestDrawerActions({
    ref: String(recordId),
    onUpdated: setOverride,
    onSaved,
  });

  useEffect(() => {
    if (!request) {
      setFooter?.(null);
      setHeaderAction?.(null);
      return;
    }
    // Print / Save PDF is available for every status and never mutates —
    // it still honors the same busy-state lock as Approve/Cancel so it
    // can't fire mid-transition, matching the accepted action-lock contract.
    setHeaderAction?.(
      <IconButton label="Print / Save PDF" onClick={() => actions.handlePrint(request)} disabled={actions.pendingAction !== null}>
        <PrintIcon />
      </IconButton>,
    );
    // Approve/Cancel Request are whole-record mutations, reachable only
    // while pending — a terminal Request has nothing to offer here.
    setFooter?.(
      request.status === 'pending'
        ? (
          <RequestDrawerFooter
            pendingAction={actions.pendingAction}
            onApprove={actions.handleApprove}
            onCancelRequest={actions.openCancelConfirm}
          />
        )
        : null,
    );
    return () => {
      setFooter?.(null);
      setHeaderAction?.(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, actions.pendingAction]);

  if (api.loading && !api.data && !override) {
    return <div class="cz-station-drawer__state">Loading Request…</div>;
  }
  if ((api.error || !api.data?.success) && !override) {
    return <div class="cz-station-drawer__state" role="alert">This Request could not be loaded.</div>;
  }
  if (!request) {
    return <></>;
  }

  return (
    <>
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
              {request.items.map((item, index) => {
                const display = requestItemDisplay(item);
                // Live-correction round: beneath the composable ("Build Your
                // Own") aggregate line only — its own stored inclusion names/
                // quantities and per-Leg payment streams, straight from the
                // durable snapshot. Every other line keeps today's flat
                // title/subtitle/price row unchanged.
                const composableDetail = requestComposableDetail(item);
                return (
                  // The submitted snapshot carries no stable per-line id — it is
                  // an immutable array from the customer's own submission, never
                  // reordered or mutated after the fact, so a positional key is safe.
                  <li key={index} class="cz-requests-drawer__item">
                    <div class="cz-requests-drawer__item-row">
                      <span class="cz-requests-drawer__item-copy">
                        <strong>{display.title}</strong>
                        {display.subtitle !== '' && <small>{display.subtitle}</small>}
                      </span>
                      <span class="cz-requests-drawer__item-price">{display.price}</span>
                    </div>
                    {composableDetail && (
                      <div class="cz-requests-drawer__item-detail">
                        {composableDetail.inclusions.length > 0 && (
                          <ul class="cz-requests-drawer__inclusions">
                            {composableDetail.inclusions.map((row) => (
                              <li key={row.key} class="cz-requests-drawer__inclusion-row">
                                <span class="cz-requests-drawer__inclusion-label">{row.label}</span>
                                {row.quantity !== null && (
                                  <span class="cz-requests-drawer__inclusion-qty">{row.quantity}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                        {composableDetail.streams.length > 0 && (
                          <ul class="cz-requests-drawer__streams">
                            {composableDetail.streams.map((stream) => (
                              <li key={stream.source} class="cz-requests-drawer__stream-row">
                                <span class="cz-requests-drawer__stream-label">{stream.label}</span>
                                <span class="cz-requests-drawer__stream-value">{stream.amount}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ReadBlock>
      </div>
      <RequestDrawerDialogs controller={actions} />
    </>
  );
}
