// Station tab set — the one accessible tab primitive for station presentation.
//
// It owns exactly the behaviour every tab strip shares and nothing else:
//
//   - stable, scoped tab and panel ids;
//   - a single roving tab stop across the strip;
//   - Arrow/Home/End movement with automatic activation;
//   - disabled tabs the keyboard skips and the pointer cannot activate;
//   - matching `tablist` / `tab` / `tabpanel` relationships.
//
// Every panel is rendered and the inactive ones carry `hidden`, so a lane keeps
// its own state while another lane is shown.
//
// The selected id is the caller's state, every panel body is the caller's
// markup, and the class names are the caller's skin: a station that already owns
// a deck presentation substitutes its own names through `classes` rather than
// teaching this file which station is rendering. No station, entity, drawer
// route, data source, or lane meaning is named here.

import { useId, useRef } from 'preact/hooks';
import type { ComponentChildren, VNode } from 'preact';

export interface StationTabItem<Id extends string> {
  id:        Id;
  label:     string;
  disabled?: boolean;
}

/**
 * Class names for the three rendered elements. Each one *replaces* the neutral
 * default for that element, so a caller opts into the shared skin per element
 * rather than fighting it with overrides.
 */
export interface StationTabSetClasses {
  list?:  string;
  tab?:   string;
  panel?: string;
}

interface Props<Id extends string, Item extends StationTabItem<Id>> {
  label:       string;
  items:       readonly Item[];
  selectedId:  Id;
  onSelect:    (id: Id) => void;
  renderPanel: (id: Id) => ComponentChildren;
  // Optional tab body. The default is the item's own label; a caller may render
  // richer content without this file learning what that content means.
  renderTab?:  (item: Item, selected: boolean) => ComponentChildren;
  classes?:    StationTabSetClasses;
}

const MOVEMENT_KEYS = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];

export function StationTabSet<Id extends string, Item extends StationTabItem<Id>>({
  label,
  items,
  selectedId,
  onSelect,
  renderPanel,
  renderTab,
  classes,
}: Props<Id, Item>): VNode {
  const uid = useId();
  const tabRefs = useRef(new Map<Id, HTMLButtonElement>());

  const tabId = (id: Id) => `${uid}-tab-${id}`;
  const panelId = (id: Id) => `${uid}-panel-${id}`;

  // Automatic activation: a movement key selects and focuses in one step, which
  // matches the single-click directness of the strip itself. A disabled tab is
  // never a destination, so the keyboard can never land on an inert panel.
  const onKeyDown = (event: KeyboardEvent) => {
    if (!MOVEMENT_KEYS.includes(event.key)) return;
    const enabled = items.filter((item) => !item.disabled);
    if (enabled.length === 0) return;
    event.preventDefault();

    const current = enabled.findIndex((item) => item.id === selectedId);
    let next: number;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = enabled.length - 1;
    // A missing current (-1) enters the list from the end going left.
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = current <= 0 ? enabled.length - 1 : current - 1;
    else next = (current + 1) % enabled.length;

    const target = enabled[next];
    onSelect(target.id);
    tabRefs.current.get(target.id)?.focus();
  };

  return (
    <>
      <div
        class={classes?.list ?? 'cz-station-tabset__list'}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
      >
        {items.map((item) => {
          const selected = item.id === selectedId;
          return (
            <button
              key={item.id}
              id={tabId(item.id)}
              ref={(element) => {
                if (element) tabRefs.current.set(item.id, element);
                else tabRefs.current.delete(item.id);
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId(item.id)}
              disabled={item.disabled}
              // Roving tabindex: the strip is a single tab stop and the arrow
              // keys move within it.
              tabIndex={selected ? 0 : -1}
              class={classes?.tab ?? 'cz-station-tabset__tab'}
              onClick={() => onSelect(item.id)}
            >
              {renderTab ? renderTab(item, selected) : item.label}
            </button>
          );
        })}
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          id={panelId(item.id)}
          class={classes?.panel ?? 'cz-station-tabset__panel'}
          role="tabpanel"
          aria-labelledby={tabId(item.id)}
          hidden={item.id !== selectedId}
        >
          {renderPanel(item.id)}
        </div>
      ))}
    </>
  );
}
