// Tier Workspace Engine — the vertical Tier navigation (Focus view, left).
//
// The left column of the Focus workspace: the selected Family's projected Tier
// occupants as a vertical tab strip. Exactly one Tier is shown in detail at a
// time (the right panel), so this behaves like a real tablist — one option
// selected, the rest reachable. Each tab is a compact summary of its occupant
// card: name, resolved status, price line, and the first authoritative metric
// (the tier's included-feature count).
//
// Real tab semantics, keyboard-driven per the WAI-ARIA pattern: a single tab
// stop (roving tabindex) with Arrow/Home/End moving AND selecting, matching the
// vertical-list radio precedent the former Family selector used. Identity is the
// occupant card's own id (`occupant_id`); this component forwards it untouched.

import { useCallback, useRef } from 'preact/hooks';
import type { VNode } from 'preact';
import type { CategoryGroupStatus } from '@/admin-station/presentation/category-groups/types';
import type { TierListFilter, WorkspaceTierSlot } from '../../surface/packageTierWorkspace/projection';

interface Props {
  slots: WorkspaceTierSlot[];
  selectedId: string | null;
  onSelect: (slotId: string) => void;
  filter: TierListFilter;
  onFilterChange: (filter: TierListFilter) => void;
  // The subordinate composable occupant, rendered as a sixth destination
  // after a visual divider — never subject to the Tiers/Add-ons filter above
  // (it is neither), never merged into `slots`, and never counted by it.
  // Admin UX restructuring: this is the ONLY place the composable occupant
  // enters the tab/filter navigation; it still never becomes a member of
  // TIER_KEYS/normal Tier selection semantics — see projectComposableWorkspaceSlot.
  composableSlot?: WorkspaceTierSlot | null;
}

const FILTER_OPTIONS: { value: TierListFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'tiers', label: 'Tiers' },
  { value: 'addons', label: 'Add-ons' },
];

// The card's 4-state vocabulary collapses to the three the compact chip shows —
// the same collapse the shared status pill makes (both pending flavours read as
// Pending). Kept local because a non-interactive chip inside a tab button cannot
// nest the interactive StationStatusPill (a button within a button).
const STATUS_META: Record<CategoryGroupStatus, { label: string; token: string }> = {
  'active':       { label: 'Active',   token: 'active' },
  'disabled':     { label: 'Disabled', token: 'disabled' },
  'pending-dim':  { label: 'Pending',  token: 'pending' },
  'pending-full': { label: 'Pending',  token: 'pending' },
};

export function TierNavigation({ slots, selectedId, onSelect, filter, onFilterChange, composableSlot = null }: Props): VNode {
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // The composable destination rides the SAME tablist/roving-tabindex as the
  // five filterable slots (real tab semantics for keyboard users), appended
  // after them — it is a rendering/keyboard-nav concern only, never fed back
  // into `slots`/the Tiers/Add-ons filter above it.
  const allTabs = composableSlot ? [...slots, composableSlot] : slots;

  // Arrow/Home/End move focus AND selection together — the tablist pattern where
  // the focused tab is the selected one. Horizontal keys are honoured too so the
  // control is forgiving of either mental model in a vertical list.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent, index: number) => {
      if (allTabs.length === 0) return;
      let next: number | null = null;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        next = (index + 1) % allTabs.length;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        next = (index - 1 + allTabs.length) % allTabs.length;
      } else if (event.key === 'Home') {
        next = 0;
      } else if (event.key === 'End') {
        next = allTabs.length - 1;
      }
      if (next !== null) {
        event.preventDefault();
        onSelect(allTabs[next].slotId);
        optionRefs.current[next]?.focus();
      }
    },
    [allTabs, onSelect],
  );

  const renderTab = (slot: WorkspaceTierSlot, index: number, subordinate: boolean) => {
    const item = slot.item;
    const selected = slot.slotId === selectedId;
    // One tab stop: the selected tab, or the first when nothing is chosen
    // yet, so the strip is entered once and then navigated by arrow keys.
    const isTabStop = selected || (selectedId === null && index === 0);
    const status = item?.status ? STATUS_META[item.status] : null;
    const feature = item?.metrics[0];
    return (
      <button
        key={slot.slotId}
        ref={(el) => { optionRefs.current[index] = el; }}
        type="button"
        role="tab"
        aria-selected={selected}
        tabIndex={isTabStop ? 0 : -1}
        class={`cz-tier-workspace__tab${selected ? ' cz-tier-workspace__tab--selected' : ''}${subordinate ? ' cz-tier-workspace__tab--subordinate' : ''}`}
        onClick={() => onSelect(slot.slotId)}
        onKeyDown={(event) => handleKeyDown(event, index)}
      >
        <span class="cz-tier-workspace__tab-head">
          <span class="cz-tier-workspace__tab-name">{item?.name ?? (subordinate ? slot.label : `${slot.label} Tier`)}</span>
          {status && (
            <span class="cz-tier-workspace__tab-status" data-status={status.token}>
              {status.label}
            </span>
          )}
          {!item && (
            <span class="cz-tier-workspace__tab-status" data-status="empty">Empty</span>
          )}
        </span>
        <span class="cz-tier-workspace__tab-meta">
          {item?.description ? (
            <span class="cz-tier-workspace__tab-price">{item.description}</span>
          ) : <span class="cz-tier-workspace__tab-price">Not configured</span>}
          {feature && (
            <span class="cz-tier-workspace__tab-count">
              {feature.value} {feature.label.toLowerCase()}
            </span>
          )}
        </span>
      </button>
    );
  };

  return (
    <div
      class="cz-tier-workspace__tabs"
      role="tablist"
      aria-orientation="vertical"
      aria-label="Package Tiers"
    >
      <div class="cz-tier-workspace__panel-head">
        <p class="cz-tier-workspace__panel-label">Package Tiers</p>
        <label class="cz-tier-workspace__list-filter">
          <span class="cz-station-visually-hidden">Filter Package Tiers</span>
          <select
            class="cz-tf-control cz-tf-select cz-tf-control--sm cz-tier-workspace__list-filter-select"
            value={filter}
            onChange={(event) => onFilterChange((event.currentTarget as HTMLSelectElement).value as TierListFilter)}
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>
      {slots.length === 0 && (
        <p class="cz-station-empty cz-tier-workspace__list-empty">No occupants match this filter.</p>
      )}
      {slots.map((slot, index) => renderTab(slot, index, false))}
      {composableSlot && (
        <>
          <div class="cz-tier-workspace__tab-divider" role="separator" aria-orientation="horizontal" />
          {renderTab(composableSlot, slots.length, true)}
        </>
      )}
    </div>
  );
}
