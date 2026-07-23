// Category Group cards — the shell's general-purpose card kit. It narrows the
// registry's `unknown[]` to the card contract (the binding guarantees the paired
// source supplies it), renders the existing grid, and forwards each card action
// as an intent carrying that card's own id.
//
// Deliberately NOT one kit per entity: any source whose adapter projects records
// into CategoryGroupCardItem can be bound to this kit, which is why the Package
// Family wall reuses it unchanged. The card already carries loading / error
// props, so this kit is a thin, faithful adapter — not a second grid.

import type { VNode } from 'preact';
import type { TemplateKitProps } from '@/station-manager/registry/templateKits';
import { CategoryGroupCardGrid } from './CategoryGroupCardGrid';
import type { CategoryGroupCardItem } from './types';

function CategoryGroupCardsKit({ items, loading, error, onIntent }: TemplateKitProps): VNode {
  return (
    <CategoryGroupCardGrid
      items={items as CategoryGroupCardItem[]}
      loading={loading}
      error={error}
      onAction={(event) => onIntent(event.cardId, event.actionId)}
    />
  );
}

export { CategoryGroupCardsKit };
