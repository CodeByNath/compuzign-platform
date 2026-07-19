// Category Group card — a pure presentation component.
//
// It renders one CategoryGroupCardItem and fetches nothing. Every part is driven
// by data: the metrics are looped through the single metric block (never three
// named blocks), and the actions are handed whole to the split control. Nothing
// here branches on a Category Group's name — the card reports by id/key only.
//
// Composition:
//   header   — medallion │ identity (name + kind) + the existing status pill
//   body     — description, its own subsection beneath the header
//   metrics  — the metric repeater, one labelled row per count
//   actions  — the action control, full width
//
// Regions are separated by rules. This reverses the card's earlier "spacing
// alone" direction deliberately: the metrics are now a LIST of labelled rows
// rather than a row of tiles, and a list needs its rows and its neighbouring
// regions delimited to stay readable. Each rule is drawn by the region that
// follows it, so a card missing a region (no description, no metrics) never
// renders a stray line.
//
// Notifications: the contract carries them (see types.ts) but this phase renders
// none. The platform's only notification renderer is the old-tree
// ModuleNotificationPanel, which this environment must not import and whose
// stylesheet it does not load — so per the phase brief the adapter contract
// exists and the panel is reported as a missing station dependency rather than
// having its UI reinvented here.

import { useId } from 'preact/hooks';
import type { CategoryGroupCardItem, CategoryGroupCardActionEvent } from './types';
import { StationStatusPill } from '../StationStatusPill';
import { StationMetricBlock } from '../StationMetricBlock';
import { StationSplitAction } from '../StationSplitAction';

interface Props {
  item: CategoryGroupCardItem;
  onAction: (event: CategoryGroupCardActionEvent) => void;
}

export function CategoryGroupCard({ item, onAction }: Props) {
  const nameId = useId();
  const Icon = item.icon;

  return (
    <article class="cz-cg-card" aria-labelledby={nameId}>
      <div class="cz-cg-card__header">
        {Icon && (
          <span class="cz-cg-card__medallion">
            <Icon class="cz-cg-card__glyph" />
          </span>
        )}
        <div class="cz-cg-card__identity">
          <div class="cz-cg-card__heading">
            <h3 id={nameId} class="cz-cg-card__name">{item.name}</h3>
            {item.code && <span class="cz-cg-card__code">{item.code}</span>}
          </div>
          {item.kind && <p class="cz-cg-card__kind">{item.kind}</p>}
        </div>
        {item.status && <StationStatusPill status={item.status} notes={item.notifications} />}
      </div>

      {item.description && (
        <div class="cz-cg-card__body">
          <p class="cz-cg-card__description">{item.description}</p>
        </div>
      )}

      {item.metrics.length > 0 && (
        <div class="cz-cg-card__metrics">
          {item.metrics.map((metric) => (
            <StationMetricBlock key={metric.id} metric={metric} />
          ))}
        </div>
      )}

      {item.actions.length > 0 && (
        <div class="cz-cg-card__actions">
          <StationSplitAction
            actions={item.actions}
            controlLabel={item.name}
            onAction={(actionId) => onAction({ cardId: item.id, cardKey: item.key, actionId })}
          />
        </div>
      )}
    </article>
  );
}
