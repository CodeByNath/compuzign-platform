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
  // Per-provider tab naming (e.g. the package provider reads
  // Services / Service Connections / Settings); ids stay stable.
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
