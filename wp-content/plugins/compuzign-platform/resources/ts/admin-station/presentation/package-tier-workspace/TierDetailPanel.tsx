// Tier Workspace Engine — the selected-Tier detail (Focus view, right).
//
// The right column of the Focus workspace: the ONE Tier selected in the left
// tab strip, shown in full through the same authoritative occupant-card data the
// grid renders — title, kind, resolved status (with its notifications), price
// line, and the tier's authoritative metric counts (included features, common
// questions). It fabricates nothing: the richer configuration (inclusions, Rate
// Sheet rows, FAQs, relationships) lives in the mature Tier drawer, and the
// View / Edit actions dispatch this occupant's `occupant_id` straight into it —
// the same gesture the card offers, unchanged.
//
// Presentation-only: it receives one card item and an action dispatcher and
// fetches nothing. Identity is the card's own id; it is forwarded untouched.

import type { VNode } from 'preact';
import type { CategoryGroupCardItem } from '../category-groups/types';
import { StationStatusPill } from '../StationStatusPill';
import { StationMetricBlock } from '../StationMetricBlock';
import { StationSplitAction } from '../StationSplitAction';

interface Props {
  item: CategoryGroupCardItem;
  onAction: (actionId: string) => void;
}

export function TierDetailPanel({ item, onAction }: Props): VNode {
  const Icon = item.icon;

  return (
    <section class="cz-tier-workspace__detail" role="tabpanel" aria-label={`${item.name} detail`}>
      <header class="cz-tier-workspace__detail-head">
        {Icon && (
          <span class="cz-tier-workspace__detail-medallion">
            <Icon class="cz-tier-workspace__detail-glyph" />
          </span>
        )}
        <div class="cz-tier-workspace__detail-identity">
          <h4 class="cz-tier-workspace__detail-name">{item.name}</h4>
          {item.kind && <p class="cz-tier-workspace__detail-kind">{item.kind}</p>}
        </div>
        {item.status && <StationStatusPill status={item.status} notes={item.notifications} />}
      </header>

      {item.description && (
        <p class="cz-tier-workspace__detail-price">{item.description}</p>
      )}

      {item.metrics.length > 0 && (
        <div class="cz-tier-workspace__detail-metrics">
          {item.metrics.map((metric) => (
            <StationMetricBlock key={metric.id} metric={metric} />
          ))}
        </div>
      )}

      {item.actions.length > 0 && (
        <div class="cz-tier-workspace__detail-actions">
          <StationSplitAction actions={item.actions} controlLabel={item.name} onAction={onAction} />
        </div>
      )}
    </section>
  );
}
