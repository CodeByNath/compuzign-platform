// Tier workspace tab contract — the Package-owned skin over the shared station
// tab set.
//
// One accessible selection primitive still serves the lower-deck lanes
// (Details / Connections / Settings). The behaviour — ids, roving focus,
// arrow/Home/End movement, and matching tab/panel relationships — belongs to
// `admin-station/presentation/StationTabSet.tsx`, which knows nothing about
// Tiers. What stays here is the one genuinely Package presentation concern:
// the deck classes those lanes wear. Callers still own the selected id and
// render only domain content.
//
// The compact Stations/Tools category selectors and their nested tabs are
// retired: Connections and Settings now render through the shared
// `TierAccordionSection` instead, so this file no longer carries a second
// tab skin for them.

import type { ComponentChildren, VNode } from 'preact';
import {
  StationTabSet,
  type StationTabSetClasses,
} from '@/admin-station/presentation/StationTabSet';

export interface TierTabItem<Id extends string> {
  id:    Id;
  label: string;
}

interface Props<Id extends string> {
  label:       string;
  items:       readonly TierTabItem<Id>[];
  selectedId:  Id;
  onSelect:    (id: Id) => void;
  renderPanel: (id: Id) => ComponentChildren;
}

const DECK_CLASSES: StationTabSetClasses = {
  list:  'cz-station-tabset__list cz-tier-deck__tabs',
  tab:   'cz-station-tabset__tab',
  panel: 'cz-station-tabset__panel cz-tier-deck__panel',
};

export function TierTabSet<Id extends string>({
  label,
  items,
  selectedId,
  onSelect,
  renderPanel,
}: Props<Id>): VNode {
  return (
    <StationTabSet
      label={label}
      items={items}
      selectedId={selectedId}
      onSelect={onSelect}
      classes={DECK_CLASSES}
      renderPanel={renderPanel}
    />
  );
}
