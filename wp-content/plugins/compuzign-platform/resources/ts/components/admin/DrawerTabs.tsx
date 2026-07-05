// Drawer Tab Contract renderer (Schema architecture S1c).
//
// Fixed two-tab bar: Details | Connections — order and labels are the locked
// Drawer Tab Contract (AdminWorkstationDrawerPrinciples-v1) encoded in a
// renderer, deliberately NOT configurable. Details = the station's own
// modules; Connections = related stations. Canonical keys 'details' /
// 'connections' retire the legacy per-step 'service' / 'commercial' state
// vocabulary.

export type DrawerTabId = 'details' | 'connections';

export function DrawerTabs({ active, onSelect }: {
  active:   DrawerTabId;
  onSelect: (tab: DrawerTabId) => void;
}) {
  return (
    <div class="cz-sv-tabs">
      <button
        type="button"
        class={`cz-sv-tab${active === 'details' ? ' cz-sv-tab--active' : ''}`}
        onClick={() => onSelect('details')}
      >
        Details
      </button>
      <button
        type="button"
        class={`cz-sv-tab${active === 'connections' ? ' cz-sv-tab--active' : ''}`}
        onClick={() => onSelect('connections')}
      >
        Connections
      </button>
    </div>
  );
}
