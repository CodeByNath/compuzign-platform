import { useEffect, useState } from 'preact/hooks';
import { useApi } from '@/hooks/useApi';
import { fetchAdminRequests, fetchAdminRequest } from '@/api/endpoints/admin';
import { Spinner } from '@/components/ui/Spinner';
import type { ActionConfig, StepContext } from '../ActionShell';
import type { RequestEntry, RequestSummary } from '@/api/types/admin';

interface Props {
  refreshKey: number;
  openAction: (config: ActionConfig) => void;
}

// ── Request detail step ───────────────────────────────────────────────────────

function RequestDetailStep({ ctx }: { ctx: StepContext }) {
  const [request, setRequest] = useState<RequestEntry | null>(null);
  const ref = ctx.stepData.ref as string;

  useEffect(() => {
    ctx.setProgress('loading', 'Loading…');
    fetchAdminRequest(ref)
      .then((res) => {
        setRequest(res.request);
        ctx.setProgress('idle');
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load request.';
        ctx.setProgress('error', msg);
      });
  }, [ref]);

  if (ctx.progress === 'loading') {
    return (
      <div class="cz-action-progress">
        <Spinner label="Loading request details…" />
      </div>
    );
  }

  if (ctx.progress === 'error') {
    return <div class="cz-admin-error-msg">{ctx.message}</div>;
  }

  if (!request) return null;

  const total = request.items.reduce((sum, item) => sum + (item.price ?? 0), 0);
  const hasTotal = request.items.some((i) => i.price !== null);

  return (
    <div class="cz-req-detail">
      <div class="cz-req-detail__section">
        <p class="cz-req-detail__section-title">Contact</p>
        <div class="cz-req-contact-grid">
          <div class="cz-req-contact-grid__item">
            <span class="cz-req-contact-grid__label">Name</span>
            <span class="cz-req-contact-grid__value">{request.contact || '—'}</span>
          </div>
          <div class="cz-req-contact-grid__item">
            <span class="cz-req-contact-grid__label">Company</span>
            <span class="cz-req-contact-grid__value">{request.company || '—'}</span>
          </div>
          <div class="cz-req-contact-grid__item">
            <span class="cz-req-contact-grid__label">Email</span>
            <span class="cz-req-contact-grid__value">
              <a href={`mailto:${request.email}`} class="cz-req-link">{request.email}</a>
            </span>
          </div>
          <div class="cz-req-contact-grid__item">
            <span class="cz-req-contact-grid__label">Phone</span>
            <span class="cz-req-contact-grid__value">{request.phone || '—'}</span>
          </div>
          <div class="cz-req-contact-grid__item">
            <span class="cz-req-contact-grid__label">Submitted</span>
            <span class="cz-req-contact-grid__value">{request.submitted || '—'}</span>
          </div>
        </div>
        {request.notes && (
          <div class="cz-req-notes">
            <span class="cz-req-contact-grid__label">Notes</span>
            <p class="cz-req-notes__text">{request.notes}</p>
          </div>
        )}
      </div>

      <div class="cz-req-detail__section">
        <p class="cz-req-detail__section-title">Services ({request.items.length})</p>
        <div class="cz-req-items-wrap">
          <table class="cz-req-items-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Category</th>
                <th>Tier</th>
                <th>Billing</th>
                <th style="text-align:right">Price</th>
              </tr>
            </thead>
            <tbody>
              {request.items.map((item, i) => (
                <tr key={i}>
                  <td class="cz-req-items-table__name">{item.serviceTitle}</td>
                  <td style="color:var(--admin-text-muted);font-size:12px">{item.categoryName}</td>
                  <td>
                    <span class="cz-tier-badge">{item.tierTitle}</span>
                  </td>
                  <td style="color:var(--admin-text-muted);font-size:12px">{item.billingCycle || '—'}</td>
                  <td style="text-align:right;font-variant-numeric:tabular-nums">
                    {item.price !== null ? `$${item.price.toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            {hasTotal && (
              <tfoot>
                <tr>
                  <td colspan={4} style="text-align:right;font-size:12px;color:var(--admin-text-muted);padding:10px 14px">
                    Estimated total
                  </td>
                  <td style="text-align:right;font-weight:700;color:var(--admin-text);padding:10px 14px">
                    ${total.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div class="cz-action-shell__footer">
        <button type="button" class="cz-admin-btn cz-admin-btn--ghost" onClick={ctx.close}>
          Close
        </button>
      </div>
    </div>
  );
}

// ── Main workstation ──────────────────────────────────────────────────────────

export function RequestsWorkstation({ refreshKey, openAction }: Props) {
  const { data, loading, error, refetch } = useApi(fetchAdminRequests);

  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey]);

  const openDetail = (summary: RequestSummary) => {
    openAction({
      id: `request-${summary.quote_ref}`,
      mode: 'drawer',
      title: `Quote — ${summary.quote_ref}`,
      initialStepData: { ref: summary.quote_ref },
      steps: [
        {
          id: 'detail',
          title: 'Quote Detail',
          component: RequestDetailStep,
        },
      ],
    });
  };

  if (loading) {
    return (
      <div class="cz-admin-loading">
        <Spinner label="Loading requests…" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div class="cz-admin-error-msg">{error}</div>
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" style="margin-top:12px" onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

  const requests = data?.requests ?? [];

  return (
    <div>
      <div class="cz-ws-header">
        <div>
          <h2 class="cz-ws-title">Requests & Quotes</h2>
          <p class="cz-ws-subtitle">
            {requests.length} quote request{requests.length !== 1 ? 's' : ''} received
          </p>
        </div>
        <div class="cz-ws-actions">
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={refetch}>
            Refresh
          </button>
        </div>
      </div>

      {requests.length === 0 ? (
        <div class="cz-admin-empty">
          <p>No quote requests yet. Submissions from the cost builder will appear here.</p>
        </div>
      ) : (
        <div class="cz-ws-card" style="padding:0;overflow:hidden">
          <div class="cz-req-table-wrap">
            <table class="cz-req-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Contact</th>
                  <th>Company</th>
                  <th>Submitted</th>
                  <th style="text-align:center">Items</th>
                  <th style="text-align:right">Est. Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.quote_ref} class="cz-req-table__row">
                    <td>
                      <span class="cz-req-ref-badge">{req.quote_ref}</span>
                    </td>
                    <td class="cz-req-table__contact">
                      <span class="cz-req-table__name">{req.contact}</span>
                      <span class="cz-req-table__email">{req.email}</span>
                    </td>
                    <td style="color:var(--admin-text-muted);font-size:13px">{req.company || '—'}</td>
                    <td style="color:var(--admin-text-muted);font-size:12px;white-space:nowrap">{req.submitted}</td>
                    <td style="text-align:center">
                      <span class="cz-req-item-count">{req.item_count}</span>
                    </td>
                    <td style="text-align:right;font-variant-numeric:tabular-nums;font-size:13px">
                      {req.total !== null ? `$${req.total.toLocaleString()}` : '—'}
                    </td>
                    <td style="text-align:right">
                      <button
                        type="button"
                        class="cz-admin-btn cz-admin-btn--ghost"
                        style="padding:5px 12px;font-size:12px"
                        onClick={() => openDetail(req)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
