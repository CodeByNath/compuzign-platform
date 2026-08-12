// Tier Workspace Engine — the authoritative Family group summary.
//
// The selected Package Family's name, description, resolved status, and the four
// counts of its collated relationship in the right side of the workspace. It is a
// read-only Family panel, never an editor or Tier-instance owner.
//
// It takes a Family SCOPE plus the composition of that Family's OWN Tiers, and
// derives its whole shape from the pure buildFamilySummary model, so the "which
// fields" decision stays in one tested place and no fabricated figure (estimated
// margin, demand score, "last updated") can enter it. Read-only by design: Family
// editing stays with the Package Families surface and the mature Family drawer,
// so this band introduces no second-drawer routing.

import type { ComponentType, VNode } from 'preact';
import type { WorkspaceFamilyScope } from '../../surface/packageTierWorkspace/projection';
import {
  buildFamilySummary,
  EMPTY_FAMILY_TIER_COMPOSITION,
  type FamilySummaryMetric,
  type FamilyTierComposition,
} from '../../surface/packageTierWorkspace/familySummary';
import { StationStatusPill } from '@/admin-station/presentation/StationStatusPill';
import { StationMetricBlock } from '@/admin-station/presentation/StationMetricBlock';
import { ServicesIcon, RateSheetIcon, TiersIcon, CategoriesIcon } from '@/admin-station/shell/icons';

// The glyph each authoritative metric shows. Presentation-only, keyed by the
// pure model's metric id — the model itself carries no components.
const METRIC_ICONS: Record<FamilySummaryMetric['id'], ComponentType<{ class?: string }>> = {
  'tiers':              TiersIcon,
  'service-categories': CategoriesIcon,
  'services':           ServicesIcon,
  'inclusions':         RateSheetIcon,
};

export function PackageFamilySummary({
  family,
  composition = EMPTY_FAMILY_TIER_COMPOSITION,
}: {
  family: WorkspaceFamilyScope;
  composition?: FamilyTierComposition;
}): VNode {
  const summary = buildFamilySummary(family, composition);

  return (
    <section class="cz-tier-workspace__family-summary" aria-label={`${summary.name} summary`}>
      <header class="cz-tier-workspace__family-head">
        <div class="cz-tier-workspace__family-identity">
          <h4 class="cz-tier-workspace__family-name">{summary.name}</h4>
          {summary.positioning && (
            <p class="cz-tier-workspace__family-description">{summary.positioning}</p>
          )}
        </div>
        <StationStatusPill status={summary.status} />
      </header>
      <div class="cz-tier-workspace__family-metrics">
        {summary.metrics.map((metric) => (
          <StationMetricBlock key={metric.id} metric={{ ...metric, icon: METRIC_ICONS[metric.id] }} />
        ))}
      </div>
    </section>
  );
}
