// Category Group card — a pure presentation component.
//
// It renders one CategoryGroupCardItem and fetches nothing. Every part is driven
// by data: the metrics are looped through the single metric block (never three
// named blocks), and the actions are handed whole to the split control. Nothing
// here branches on a Category Group's name — the card reports by id/key only.
//
// Composition:
//   header   — icon medallion + the existing status pill
//   body     — name, optional code pill, description
//   metrics  — the metric repeater
//   actions  — the split action
//
// No internal dividers: the regions are separated by spacing alone. The card's
// own surface and radius are its only edge treatment.
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
        <span class="cz-cg-card__medallion">
          {Icon && <Icon class="cz-cg-card__glyph" />}
        </span>
        {item.status && <StationStatusPill status={item.status} />}
      </div>

      <div class="cz-cg-card__body">
        <div class="cz-cg-card__heading">
          <h3 id={nameId} class="cz-cg-card__name">{item.name}</h3>
          {item.code && <span class="cz-cg-card__code">{item.code}</span>}
        </div>
        {item.description && <p class="cz-cg-card__description">{item.description}</p>}
      </div>

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
