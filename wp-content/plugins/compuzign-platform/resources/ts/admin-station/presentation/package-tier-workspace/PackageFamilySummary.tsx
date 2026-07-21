// Tier Workspace Engine — the read-only selected-Family summary (Row 2, left).
//
// The wider lower panel. It shows the selected Package Family's authoritative
// working scope and nothing more: its name, its description as a positioning
// line, its status pill, and its three authoritative `dependents` counts. It
// takes a Family SCOPE (never occupants) and derives its whole shape from the
// pure buildFamilySummary model, so this component stays presentation-only and
// the "which fields" decision lives in one tested place.
//
// Read-only by design (this phase): there is deliberately no Edit action here.
// Package Family editing stays with the Package Families surface and the mature
// Family drawer one wall up on this same Packages page — the Tier Workspace
// binding owns only the Tier drawer, and no second-drawer routing is introduced.

import type { ComponentType, VNode } from 'preact';
import type { WorkspaceFamilyScope } from '../../stations/packageTierWorkspace/projection';
import { buildFamilySummary, type FamilySummaryMetric } from '../../stations/packageTierWorkspace/familySummary';
import { StationStatusPill } from '../StationStatusPill';
import { StationMetricBlock } from '../StationMetricBlock';
import { ServicesIcon, RateSheetIcon, TiersIcon } from '../../shell/icons';

// The glyph each authoritative metric shows. Presentation-only, keyed by the
// pure model's metric id — the model itself carries no components.
const METRIC_ICONS: Record<FamilySummaryMetric['id'], ComponentType<{ class?: string }>> = {
  'services':        ServicesIcon,
  'rate-sheet-rows': RateSheetIcon,
  'tier-selections': TiersIcon,
};

export function PackageFamilySummary({ family }: { family: WorkspaceFamilyScope }): VNode {
  const summary = buildFamilySummary(family);

  return (
    <section class="cz-tier-workspace__summary" aria-label={`${summary.name} working scope`}>
      <p class="cz-tier-workspace__panel-title">Family Summary</p>

      <header class="cz-tier-workspace__summary-head">
        <div class="cz-tier-workspace__summary-identity">
          <h4 class="cz-tier-workspace__summary-name">{summary.name}</h4>
          {summary.positioning && (
            <p class="cz-tier-workspace__summary-kind">{summary.positioning}</p>
          )}
        </div>
        <StationStatusPill status={summary.status} />
      </header>

      <div class="cz-tier-workspace__summary-metrics">
        {summary.metrics.map((metric) => (
          <StationMetricBlock key={metric.id} metric={{ ...metric, icon: METRIC_ICONS[metric.id] }} />
        ))}
      </div>
    </section>
  );
}
