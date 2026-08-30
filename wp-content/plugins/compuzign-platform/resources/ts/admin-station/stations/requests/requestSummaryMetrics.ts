// Pure derivation of the CRM Request summary cards' four counts from the
// already-fetched RequestSummary[] — no re-fetch, no filtering state, no
// browser date parsing. is_today is computed server-side (see
// AdminRequestsController::summarize()); this only tallies it.

import type { RequestSummary } from '@/api/types/admin';
import type { StationMetric } from '@/admin-station/presentation/StationMetricBlock';

export function deriveRequestSummaryMetrics(requests: RequestSummary[]): StationMetric[] {
  let today = 0;
  let pending = 0;
  let approved = 0;

  for (const request of requests) {
    if (request.is_today) today++;
    if (request.status === 'pending') pending++;
    if (request.status === 'approved') approved++;
  }

  return [
    { id: 'all', label: 'All Requests', value: requests.length },
    { id: 'today', label: 'New Today', value: today },
    { id: 'pending', label: 'Pending', value: pending },
    { id: 'approved', label: 'Approved', value: approved },
  ];
}
