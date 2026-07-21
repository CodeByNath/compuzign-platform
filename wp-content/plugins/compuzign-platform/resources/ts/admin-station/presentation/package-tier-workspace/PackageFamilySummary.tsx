// Tier Workspace Engine — the authoritative Family metrics band (beneath header).
//
// The compact context strip under the header: the selected Package Family's
// resolved status beside its three authoritative `dependents` counts. It is the
// slimmed successor to the former full-height summary panel — the large bottom
// Family Summary is gone, but its authoritative capability is preserved here as
// an optional band, never weakened into a card and never re-derived.
//
// It takes a Family SCOPE (never occupants) and derives its whole shape from the
// pure buildFamilySummary model, so the "which fields" decision stays in one
// tested place and no fabricated figure (estimated margin, demand score, "last
// updated") can enter it. Read-only by design: Family editing stays with the
// Package Families surface and the mature Family drawer, so this band introduces
// no second-drawer routing.

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
    <section class="cz-tier-workspace__metrics" aria-label={`${summary.name} working scope`}>
      <div class="cz-tier-workspace__metrics-status">
        <StationStatusPill status={summary.status} />
      </div>
      <div class="cz-tier-workspace__metrics-list">
        {summary.metrics.map((metric) => (
          <StationMetricBlock key={metric.id} metric={{ ...metric, icon: METRIC_ICONS[metric.id] }} />
        ))}
      </div>
    </section>
  );
}
