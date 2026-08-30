// CRM-1B: the Requests list — the shared station list system
// (`cz-station-list`, `cz-station-list__cell`), Requests' own row/column
// classes (`cz-requests-deck__*`, `cz-station-list__row--requests`) added
// per the list system's own rule: a surface adds its selector to the shared
// family, it does not reuse another surface's template (see
// docs/code-map/admin-station-list-system.md). Read-only: the only intent is
// `view`, opening the read-only Request drawer. No status mutation, no
// filters beyond a plain search — CRM-1B is deliberately the smallest
// surface, not a second Service Catalogue.

import { useMemo, useState } from 'preact/hooks';
import { RequestsIcon, ViewIcon, SearchIcon } from '@/admin-station/shell/icons';
import { RequestsSummaryCards } from './RequestsSummaryCards';
import type { RequestSummary } from '@/api/types/admin';
import type { TemplateKitProps } from '@/station-manager/registry/templateKits';

const REQUEST_TYPE_LABELS: Record<string, string> = {
  quote_cart: 'Quote',
  free_it_assessment: 'Assessment',
};

const REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  cancelled: 'Cancelled',
};

function matchesQuery(request: RequestSummary, query: string): boolean {
  if (query === '') return true;
  const haystack = `${request.quote_ref} ${request.platform_id} ${request.contact} ${request.company} ${request.email}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function RequestsCatalogueKit({ items, loading, error, onIntent }: TemplateKitProps) {
  const requests = items as RequestSummary[];
  const [query, setQuery] = useState('');

  const visible = useMemo(
    () => requests.filter((request) => matchesQuery(request, query)),
    [requests, query],
  );

  if (loading && requests.length === 0) {
    return <p class="cz-station-empty">Loading Requests…</p>;
  }
  if (error) {
    return <p class="cz-station-empty" role="alert">{error}</p>;
  }

  return (
    <div class="cz-requests-catalogue">
      <RequestsSummaryCards requests={requests} />

      <div class="cz-requests-catalogue__toolbar" role="search" aria-label="Search Requests">
        <label class="cz-tf-control cz-requests-catalogue__search">
          <span class="cz-station-visually-hidden">Search Requests</span>
          <SearchIcon />
          <input
            type="search"
            class="cz-tf-control__inner"
            value={query}
            placeholder="Search by reference, CZR, contact, company, or email…"
            onInput={(event) => setQuery(event.currentTarget.value)}
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <p class="cz-station-empty">
          {requests.length === 0 ? 'No Requests have been submitted yet.' : 'No Requests match this search.'}
        </p>
      ) : (
        <ul class="cz-station-list">
          {visible.map((request) => (
            <li key={request.quote_ref} class="cz-station-list__row cz-station-list__row--requests">
              <div class="cz-station-list__cell cz-requests-deck__identity">
                <span class="cz-requests-deck__identity-icon" aria-hidden="true"><RequestsIcon /></span>
                <span class="cz-requests-deck__identity-copy">
                  <strong class="cz-requests-deck__identity-name">{request.quote_ref}</strong>
                  <small class="cz-requests-deck__identity-ref">{request.platform_id || 'Not assigned'}</small>
                </span>
              </div>
              <div class="cz-station-list__cell cz-requests-deck__field">
                <span class="cz-requests-deck__field-label">Customer</span>
                <span class="cz-requests-deck__identity-name">{request.contact}</span>
                {request.company !== '' && <small class="cz-requests-deck__identity-ref">{request.company}</small>}
              </div>
              <div class="cz-station-list__cell cz-requests-deck__field">
                <span class="cz-requests-deck__field-label">Type</span>
                {REQUEST_TYPE_LABELS[request.type ?? ''] ?? (request.type || '—')}
              </div>
              <div class="cz-station-list__cell cz-requests-deck__field">
                <span class="cz-requests-deck__field-label">Submitted</span>
                {request.submitted || '—'}
              </div>
              <div class="cz-station-list__cell cz-requests-deck__field">
                <span class="cz-requests-deck__field-label">Status</span>
                {REQUEST_STATUS_LABELS[request.status] ?? request.status}
              </div>
              <div class="cz-station-list__cell cz-requests-deck__row-actions">
                <button
                  type="button"
                  class="cz-requests-deck__button cz-requests-deck__button--primary"
                  onClick={() => onIntent(request.quote_ref, 'view')}
                >
                  <ViewIcon /> View
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
