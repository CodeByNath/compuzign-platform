export type ManagerSubTab = 'details' | 'connections' | 'settings';

const DEFAULT_LABELS: Record<ManagerSubTab, string> = {
  details: 'Details',
  connections: 'Connections',
  settings: 'Settings',
};

const TAB_ORDER: ManagerSubTab[] = ['details', 'connections', 'settings'];

export function ManagerSubTabs({ active, onChange, labels }: {
  active: ManagerSubTab;
  onChange: (tab: ManagerSubTab) => void;
  // Optional presentation overrides; the Station Manager's primary Services
  // and Packages workspaces use the canonical labels.
  labels?: Partial<Record<ManagerSubTab, string>>;
}) {
  return (
    <nav class="cz-manager-subtabs" aria-label="Manager sections">
      {TAB_ORDER.map((tab) => (
        <button type="button" key={tab} class={active === tab ? 'is-active' : undefined}
          aria-current={active === tab ? 'page' : undefined} onClick={() => onChange(tab)}>
          {labels?.[tab] ?? DEFAULT_LABELS[tab]}
        </button>
      ))}
    </nav>
  );
}
