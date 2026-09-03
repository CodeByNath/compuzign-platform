// Composable-only middle shell — Admin UX restructuring.
//
// Sits between the upper Tier focus area and the existing lower deck,
// mounted ONLY while the composable occupant's own tab is focused; hidden
// for every normal Tier. Reuses the occupant's already-projected TierDeck
// and settled customer_policy only — no second read, no new endpoint — and
// the shared StationMetricBlock the Family summary panel already renders
// through, so the right column reads as the same "concise stat list"
// grammar rather than a bespoke table.

import type { VNode } from 'preact';
import type { CustomerPolicy } from '@/api/types/cost-builder';
import type { TierDeck } from '../../surface/packageTierWorkspace/deck';
import {
  projectComposableHighlightInclusions,
  summarizeComposableCustomerPolicy,
} from '../../surface/packageTierWorkspace/composableMiddleShell';
import { StationMetricBlock } from '@/admin-station/presentation/StationMetricBlock';
import { PackagesIcon } from '@/admin-station/shell/icons';

interface Props {
  deck: TierDeck;
  policy: CustomerPolicy | null;
  onManageCustomerOptions: () => void;
}

export function TierComposableMiddleShell({ deck, policy, onManageCustomerOptions }: Props): VNode {
  const highlights = projectComposableHighlightInclusions(deck, policy);
  const stats = summarizeComposableCustomerPolicy(policy);

  return (
    <section class="cz-tier-workspace__composable-shell" aria-label="Build Your Own customer selection rules">
      <div class="cz-tier-workspace__composable-highlights">
        <p class="cz-tier-workspace__panel-label">Featured inclusions</p>
        {highlights.length === 0 ? (
          <p class="cz-station-empty">Not configured — every inclusion stays not offered.</p>
        ) : (
          <ul class="cz-tier-workspace__composable-highlight-list">
            {highlights.map((highlight) => (
              <li key={highlight.itemId} class="cz-tier-workspace__composable-highlight">
                <span class="cz-tier-workspace__composable-highlight-icon" aria-hidden="true"><PackagesIcon /></span>
                <span class="cz-tier-workspace__composable-highlight-name">{highlight.name}</span>
                {highlight.featured && <span class="cz-tier-workspace__featured-badge">Featured</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div class="cz-tier-workspace__composable-rules">
        <div class="cz-tier-workspace__panel-head">
          <p class="cz-tier-workspace__panel-label">Customer Selection Rules</p>
          <button type="button" class="cz-tier-deck__button" onClick={onManageCustomerOptions}>
            View/Edit Customer Options
          </button>
        </div>
        <div class="cz-tier-workspace__composable-metrics">
          {stats.map((metric) => <StationMetricBlock key={metric.id} metric={metric} />)}
        </div>
      </div>
    </section>
  );
}
