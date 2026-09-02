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
import type { CategoryGroupCardItem } from '@/admin-station/presentation/category-groups/types';
import type { WorkspaceTierSlot } from '../../surface/packageTierWorkspace/projection';
import { StationStatusPill } from '@/admin-station/presentation/StationStatusPill';
import { StationMetricBlock } from '@/admin-station/presentation/StationMetricBlock';
import { StationSplitAction } from '@/admin-station/presentation/StationSplitAction';

interface Props {
  slot: WorkspaceTierSlot;
  familyName: string | null;
  hasInstance: boolean;
  onAction: (actionId: string) => void;
  onOpenSettings: () => void;
  // True only for the subordinate composable occupant's own slot — swaps the
  // empty-state "Fixed Tier slot"/"<label> Tier" copy for wording that never
  // claims it is one of the five fixed slots. Every existing caller omits
  // this and is unaffected.
  isSubordinate?: boolean;
}

// The subordinate composable occupant's own empty-state copy — extracted so
// it never drifts back to peer-Tier wording ("This Tier"/"Tier slot") and so
// the composable-occupant-workspace contract can assert that directly.
// Exported for that contract.
export function subordinateEmptyStateCopy(label: string): { heading: string; body: string } {
  return {
    heading: 'This composable occupant is ready to configure.',
    body: `Configure ${label} in the existing Tier tool.`,
  };
}

export function TierDetailPanel({ slot, familyName, hasInstance, onAction, onOpenSettings, isSubordinate = false }: Props): VNode {
  const item: CategoryGroupCardItem | null = slot.item;
  if (!item) {
    const title = isSubordinate ? slot.label : `${slot.label} Tier`;
    return (
      <section class="cz-tier-workspace__detail" role="tabpanel" aria-label={`${title} detail`}>
        <header class="cz-tier-workspace__detail-head">
          <div class="cz-tier-workspace__detail-identity">
            <h4 class="cz-tier-workspace__detail-name">{title}</h4>
            <p class="cz-tier-workspace__detail-kind">
              {isSubordinate ? 'Subordinate composable occupant' : 'Fixed Tier slot'}
            </p>
          </div>
          <span class="cz-tier-workspace__tab-status" data-status="empty">Empty</span>
        </header>
        <div class="cz-tier-workspace__empty-focus">
          <div class="cz-tier-workspace__empty-copy">
            {isSubordinate ? (
              <>
                <h5>{subordinateEmptyStateCopy(slot.label).heading}</h5>
                <p>{subordinateEmptyStateCopy(slot.label).body}</p>
              </>
            ) : (
              <>
                <h5>{hasInstance ? 'This Tier is ready to configure.' : 'Tier capability is optional.'}</h5>
                <p>
                  {hasInstance
                    ? `Configure the ${slot.label} slot in the existing Tier tool.`
                    : `${familyName ?? 'This Package Family'} is complete without a Tier assignment. Configure the Tier system from Settings below.`}
                </p>
              </>
            )}
          </div>
          <button
            type="button"
            class="cz-tier-deck__button cz-tier-deck__button--primary"
            onClick={() => hasInstance ? onAction('edit') : onOpenSettings()}
          >
            {hasInstance ? `Configure ${slot.label}` : 'Open Tier settings'}
          </button>
        </div>
      </section>
    );
  }
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
          {item.kind && (
            <p class="cz-tier-workspace__detail-kind">
              {item.kind}
              {slot.isPopular && <span class="cz-tier-workspace__popular-badge">Popular</span>}
            </p>
          )}
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
