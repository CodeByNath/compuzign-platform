// Drawer Tab Contract renderer (Schema architecture S1c).
//
// Canonical entity drawer tab bar: Overview | Connections | Settings. The
// internal keys remain `details` / `connections` / `settings`; placements still
// resolve the entity's detail view. Station Manager is a separate central
// ActionShell workspace, never an entity-drawer tab.
//
// The canonical tab SET, labels, and ORDER are renderer-encoded and NOT
// per-entity configurable. What IS entity-driven is presence: a tab renders
// only when the entity declares that placement group (passed as `available`).
// This keeps the contract fixed while letting an entity that owns no Settings
// (Service, Category, Tier) omit the tab, and an entity that does (Package
// Family, for its Tools / Skills) show it — without a shell-level branch.

export type DrawerBaseTabId = 'details' | 'connections' | 'settings';
export type DrawerTabId = DrawerBaseTabId;

// Fixed canonical order + labels. Encoded here, never supplied by a caller.
const CANONICAL_TABS: { id: DrawerBaseTabId; label: string }[] = [
  { id: 'details',     label: 'Overview' },
  { id: 'connections', label: 'Connections' },
  { id: 'settings',    label: 'Settings' },
];

export function DrawerTabs<T extends DrawerTabId>({ active, available, onSelect }: {
  active:     T;
  // Which canonical tabs this entity declares. Omitted → the historical
  // Overview | Connections pair (both always present).
  available?: readonly DrawerTabId[];
  onSelect:   (tab: T) => void;
}) {
  const shown = CANONICAL_TABS.filter((tab) => (
    available ? available.includes(tab.id) : tab.id !== 'settings'
  ));

  return (
    <div class="cz-sv-tabs">
      {shown.map((tab) => (
        <button
          key={tab.id}
          type="button"
          class={`cz-sv-tab${active === tab.id ? ' cz-sv-tab--active' : ''}`}
          onClick={() => onSelect(tab.id as T)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
