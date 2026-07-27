// Tier workspace tab contract — the Package-owned skin over the shared station
// tab set.
//
// One accessible selection primitive still serves the lower-deck lanes, compact
// category selectors, and nested connection tabs. The behaviour — ids, roving
// focus, arrow/Home/End movement, and matching tab/panel relationships — now
// belongs to `admin-station/presentation/StationTabSet.tsx`, which knows nothing
// about Tiers. What stays here is the part that is genuinely Package
// presentation: which deck classes each variant wears, and what a compact
// selector card renders inside its tab. Callers still own the selected id and
// render only domain content.

import type { ComponentChildren, VNode } from 'preact';
import {
  StationTabSet,
  type StationTabSetClasses,
} from '@/admin-station/presentation/StationTabSet';
import { ChevronDownIcon } from '@/admin-station/shell/icons';

export interface TierTabItem<Id extends string> {
  id:       Id;
  label:    string;
  icon?:    VNode;
  summary?: string | null;
}

type TierTabVariant = 'deck' | 'selectors' | 'nested';

interface Props<Id extends string> {
  label:       string;
  items:       readonly TierTabItem<Id>[];
  selectedId:  Id;
  onSelect:    (id: Id) => void;
  variant:     TierTabVariant;
  renderPanel: (id: Id) => ComponentChildren;
}

// Deck lanes and nested tabs wear the shared strip and add only the deck's own
// inset and panel spacing. Compact selectors are a card grid rather than a
// strip, so they replace the strip skin outright and keep only the shared panel.
const VARIANT_CLASSES: Record<TierTabVariant, StationTabSetClasses> = {
  deck: {
    list:  'cz-station-tabset__list cz-tier-deck__tabs',
    tab:   'cz-station-tabset__tab',
    panel: 'cz-station-tabset__panel cz-tier-deck__panel',
  },
  nested: {
    list:  'cz-station-tabset__list cz-tier-deck__tabs--nested',
    tab:   'cz-station-tabset__tab',
    panel: 'cz-station-tabset__panel cz-tier-deck__tabpanel',
  },
  selectors: {
    list:  'cz-tier-deck__selector-grid',
    tab:   'cz-tier-deck__selector-card',
    panel: 'cz-station-tabset__panel cz-tier-deck__connection-panel',
  },
};

export function TierTabSet<Id extends string>({
  label,
  items,
  selectedId,
  onSelect,
  variant,
  renderPanel,
}: Props<Id>): VNode {
  return (
    <StationTabSet
      label={label}
      items={items}
      selectedId={selectedId}
      onSelect={onSelect}
      classes={VARIANT_CLASSES[variant]}
      renderPanel={renderPanel}
      renderTab={variant === 'selectors' ? selectorCard : undefined}
    />
  );
}

// A compact selector states its category, its one-line summary when the
// projection supplies one, and the chevron that reads as "opens below".
function selectorCard(item: TierTabItem<string>): ComponentChildren {
  return (
    <>
      {item.icon && <span class="cz-tier-deck__selector-icon" aria-hidden="true">{item.icon}</span>}
      <span class="cz-tier-deck__selector-copy">
        <span class="cz-tier-deck__selector-title">{item.label}</span>
        {item.summary !== null && item.summary !== undefined && (
          <span class="cz-tier-deck__selector-summary">{item.summary}</span>
        )}
      </span>
      <span class="cz-tier-deck__selector-chevron" aria-hidden="true"><ChevronDownIcon /></span>
    </>
  );
}
