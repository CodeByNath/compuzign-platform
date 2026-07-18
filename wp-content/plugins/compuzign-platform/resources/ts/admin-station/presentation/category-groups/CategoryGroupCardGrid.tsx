// Category Group card grid — the collection component.
//
// Receives items and callbacks; it never fetches. That split is deliberate: the
// future Category Station supplies the data and this stays presentation, so the
// cards can be rendered from any source without changing them.
//
// Renders any number of cards from the supplied order with stable keyed
// rendering, and owns the three collection states (loading, error, empty). There
// is no fixed card count and no per-card layout branch: every card takes the
// same twelve-column span, so a collection of one and a collection of nine use
// the same code path.
//
// The list semantics (role=list/listitem) give assistive tech a count and let a
// card be announced as one item of many.

import type { CategoryGroupCardItem, CategoryGroupCardActionEvent } from './types';
import { CategoryGroupCard } from './CategoryGroupCard';

interface Props {
  items: CategoryGroupCardItem[];
  onAction: (event: CategoryGroupCardActionEvent) => void;
  // Collection state contract. The data source owns these; the grid only renders
  // the resulting state.
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
}

export function CategoryGroupCardGrid({
  items,
  onAction,
  loading = false,
  error = null,
  // Entity-neutral by default: this grid now renders whatever records a binding
  // pairs it with (Service Category Groups, Package Families, …), so its own
  // collection states must not name one entity. A surface that wants specific
  // wording passes it in.
  emptyMessage = 'Nothing to show here yet.',
}: Props) {
  if (loading) {
    return (
      <p class="cz-station-empty" aria-busy="true">
        Loading…
      </p>
    );
  }

  // Announced immediately: a collection that failed to load is not something the
  // user should have to discover by noticing an absence.
  if (error) {
    return (
      <p class="cz-station-empty" role="alert">
        {error}
      </p>
    );
  }

  if (items.length === 0) {
    return <p class="cz-station-empty">{emptyMessage}</p>;
  }

  return (
    <div class="cz-cg-grid" role="list">
      {items.map((item) => (
        <div key={item.id} class="cz-cg-grid__cell" role="listitem">
          <CategoryGroupCard item={item} onAction={onAction} />
        </div>
      ))}
    </div>
  );
}
