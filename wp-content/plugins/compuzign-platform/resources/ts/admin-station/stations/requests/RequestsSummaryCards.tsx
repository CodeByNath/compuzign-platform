// CRM Request summary cards — a display-only count strip above the Requests
// list. Reuses the shared StationMetricBlock row primitive directly (see
// admin-station/presentation/StationMetricBlock.tsx); only the small card
// container below is Requests-owned, per the list system's own rule that a
// surface adds its own selector rather than reusing another surface's
// template. Numbers only: no click handler, no intent dispatch, no
// filtering — the four counts are derived client-side from the same
// RequestSummary[] the list already has, so this never becomes a second
// data source.

import { useMemo } from 'preact/hooks';
import { StationMetricBlock } from '@/admin-station/presentation/StationMetricBlock';
import { deriveRequestSummaryMetrics } from './requestSummaryMetrics';
import type { RequestSummary } from '@/api/types/admin';

interface Props {
  requests: RequestSummary[];
}

export function RequestsSummaryCards({ requests }: Props) {
  const metrics = useMemo(() => deriveRequestSummaryMetrics(requests), [requests]);

  return (
    <div class="cz-requests-summary" role="group" aria-label="Request counts">
      {metrics.map((metric) => (
        <div key={metric.id} class="cz-requests-summary__card">
          <StationMetricBlock metric={metric} />
        </div>
      ))}
    </div>
  );
}
