// Drawer Tab Contract renderer (Schema architecture S1c).
//
// Canonical tab bar: Details | Connections, plus the optional terminal Manager
// tab when a registered writable relation provider makes it available.
// Drawer Tab Contract (AdminWorkstationDrawerPrinciples-v1) encoded in a
// renderer, deliberately NOT configurable. Details = the station's own
// modules; Connections = related stations. Canonical keys 'details' /
// 'connections' retire the legacy per-step 'service' / 'commercial' state
// vocabulary.

export type DrawerBaseTabId = 'details' | 'connections';
export type DrawerTabId = DrawerBaseTabId | 'manager';

export function DrawerTabs<T extends DrawerTabId>({ active, onSelect, showManager = false }: {
  active:   T;
  onSelect: (tab: T) => void;
  showManager?: boolean;
}) {
  return (
    <div class="cz-sv-tabs">
      <button
        type="button"
        class={`cz-sv-tab${active === 'details' ? ' cz-sv-tab--active' : ''}`}
        onClick={() => onSelect('details' as T)}
      >
        Details
      </button>
      <button
        type="button"
        class={`cz-sv-tab${active === 'connections' ? ' cz-sv-tab--active' : ''}`}
        onClick={() => onSelect('connections' as T)}
      >
        Connections
      </button>
      {showManager && (
        <button
          type="button"
          class={`cz-sv-tab${active === 'manager' ? ' cz-sv-tab--active' : ''}`}
          onClick={() => onSelect('manager' as T)}
        >
          Manager
        </button>
      )}
    </div>
  );
}
