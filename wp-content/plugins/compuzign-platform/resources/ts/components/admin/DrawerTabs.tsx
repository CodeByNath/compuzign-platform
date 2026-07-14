// Drawer Tab Contract renderer (Schema architecture S1c).
//
// Canonical entity drawer tab bar: Overview | Connections. The internal key
// remains `details` because placements still resolve the entity's detail view.
// Station Manager is a
// separate central ActionShell workspace, never an entity-drawer tab.
// Drawer Tab Contract (AdminWorkstationDrawerPrinciples-v1) encoded in a
// renderer, deliberately NOT configurable. Details = the station's own
// modules; Connections = related stations. Canonical keys 'details' /
// 'connections' retire the legacy per-step 'service' / 'commercial' state
// vocabulary.

export type DrawerBaseTabId = 'details' | 'connections';
export type DrawerTabId = DrawerBaseTabId;

export function DrawerTabs<T extends DrawerTabId>({ active, onSelect }: {
  active:   T;
  onSelect: (tab: T) => void;
}) {
  return (
    <div class="cz-sv-tabs">
      <button
        type="button"
        class={`cz-sv-tab${active === 'details' ? ' cz-sv-tab--active' : ''}`}
        onClick={() => onSelect('details' as T)}
      >
        Overview
      </button>
      <button
        type="button"
        class={`cz-sv-tab${active === 'connections' ? ' cz-sv-tab--active' : ''}`}
        onClick={() => onSelect('connections' as T)}
      >
        Connections
      </button>
    </div>
  );
}
