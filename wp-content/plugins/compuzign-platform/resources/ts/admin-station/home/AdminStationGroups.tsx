// Station-group region — dynamic tabs plus the active group panel.
//
// The shell renders only the groups it receives, in the supplied order, and
// holds nothing but the active-group selection. It contains no station-specific
// conditional and imports no station module.
//
// Active group: derived (see resolveActiveGroupId), never mirrored into state,
// so a configuration change can never leave a stale or invalid selection behind.
// The stored value is only what the user *requested*; what is *rendered* is
// always re-resolved against the current groups.
//
// Activation is automatic: arrow keys move focus and select in one step, which
// matches the single-click directness of the Header pills. Disabled groups are
// skipped by the keyboard and can never be activated.
//
// Scroll ownership: only `__panel` scrolls. The tablist holds its place because
// the Home shell is bounded to the viewport and the panel is the scroll owner —
// not because the panel has been given an artificial height.

import { useState, useRef, useCallback, useId } from 'preact/hooks';
import type { AdminStationGroup } from './stationHome';
import { resolveActiveGroupId } from './stationHome';

interface Props {
  groups: AdminStationGroup[];
}

const MOVEMENT_KEYS = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];

export function AdminStationGroups({ groups }: Props) {
  const [requestedId, setRequestedId] = useState<string | null>(null);
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const baseId = useId();

  const activeId = resolveActiveGroupId(groups, requestedId);
  const activeGroup = groups.find((group) => group.id === activeId) ?? null;

  const tabId = (id: string) => `${baseId}-tab-${id}`;
  const panelId = (id: string) => `${baseId}-panel-${id}`;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!MOVEMENT_KEYS.includes(event.key)) {
      return;
    }

    const enabled = groups.filter((group) => !group.disabled);
    if (enabled.length === 0) {
      return;
    }
    event.preventDefault();

    const current = enabled.findIndex((group) => group.id === activeId);
    let next: number;
    if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = enabled.length - 1;
    } else if (event.key === 'ArrowLeft') {
      // A missing current (-1) enters the list from the end going left.
      next = current <= 0 ? enabled.length - 1 : current - 1;
    } else {
      next = (current + 1) % enabled.length;
    }

    const target = enabled[next];
    setRequestedId(target.id);
    tabRefs.current.get(target.id)?.focus();
  }, [groups, activeId]);

  // An empty collection renders no tablist: a tablist with no tab is invalid
  // semantics, and the shell must not invent a default group to fill it.
  if (groups.length === 0) {
    return (
      <section class="cz-station-groups">
        <p class="cz-station-empty">No station groups have been configured.</p>
      </section>
    );
  }

  return (
    <section class="cz-station-groups">
      <div class="cz-station-groups__tablist" role="tablist" aria-label="Station groups" onKeyDown={handleKeyDown}>
        {groups.map((group) => {
          const selected = group.id === activeId;
          const Icon = group.icon;
          return (
            <button
              key={group.id}
              ref={(el) => {
                if (el) {
                  tabRefs.current.set(group.id, el);
                } else {
                  tabRefs.current.delete(group.id);
                }
              }}
              type="button"
              role="tab"
              id={tabId(group.id)}
              class="cz-station-tab"
              aria-selected={selected}
              aria-controls={panelId(group.id)}
              disabled={group.disabled}
              // Roving tabindex: the tablist is a single tab stop and the arrow
              // keys move within it.
              tabIndex={selected ? 0 : -1}
              onClick={() => setRequestedId(group.id)}
            >
              {Icon && <Icon class="cz-station-tab__icon" />}
              <span class="cz-station-tab__label">{group.label}</span>
            </button>
          );
        })}
      </div>

      {activeGroup ? (
        <div
          role="tabpanel"
          id={panelId(activeGroup.id)}
          aria-labelledby={tabId(activeGroup.id)}
          class="cz-station-groups__panel"
          // Focusable so the panel is reachable and scrollable by keyboard even
          // when the group content holds nothing focusable.
          tabIndex={0}
        >
          {activeGroup.content}
        </div>
      ) : (
        // Reached only when every supplied group is disabled: the tabs stay
        // visible and legible, but no panel can be shown.
        <p class="cz-station-empty">No station group is available.</p>
      )}
    </section>
  );
}
