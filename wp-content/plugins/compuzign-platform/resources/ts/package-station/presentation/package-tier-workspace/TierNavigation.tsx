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
import type { WorkspaceTierSlot } from '../../surface/packageTierWorkspace/projection';

interface Props {
  slots: WorkspaceTierSlot[];
  selectedId: string | null;
  onSelect: (slotId: string) => void;
}

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

export function TierNavigation({ slots, selectedId, onSelect }: Props): VNode {
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow/Home/End move focus AND selection together — the tablist pattern where
  // the focused tab is the selected one. Horizontal keys are honoured too so the
  // control is forgiving of either mental model in a vertical list.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent, index: number) => {
      if (slots.length === 0) return;
      let next: number | null = null;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        next = (index + 1) % slots.length;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        next = (index - 1 + slots.length) % slots.length;
      } else if (event.key === 'Home') {
        next = 0;
      } else if (event.key === 'End') {
        next = slots.length - 1;
      }
      if (next !== null) {
        event.preventDefault();
        onSelect(slots[next].slotId);
        optionRefs.current[next]?.focus();
      }
    },
    [onSelect, slots],
  );

  return (
    <div
      class="cz-tier-workspace__tabs"
      role="tablist"
      aria-orientation="vertical"
      aria-label="Package Tiers"
    >
      <p class="cz-tier-workspace__panel-label">Package Tiers</p>
      {slots.map((slot, index) => {
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
            class={`cz-tier-workspace__tab${selected ? ' cz-tier-workspace__tab--selected' : ''}`}
            onClick={() => onSelect(slot.slotId)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <span class="cz-tier-workspace__tab-head">
              <span class="cz-tier-workspace__tab-name">{item?.name ?? `${slot.label} Tier`}</span>
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
      })}
    </div>
  );
}
