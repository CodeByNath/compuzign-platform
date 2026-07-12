export type ManagerSubTab = 'details' | 'connections' | 'settings';

const TABS: { id: ManagerSubTab; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'connections', label: 'Connections' },
  { id: 'settings', label: 'Settings' },
];

export function ManagerSubTabs({ active, onChange }: {
  active: ManagerSubTab;
  onChange: (tab: ManagerSubTab) => void;
}) {
  return (
    <nav class="cz-manager-subtabs" aria-label="Manager sections">
      {TABS.map((tab) => (
        <button type="button" key={tab.id} class={active === tab.id ? 'is-active' : undefined}
          aria-current={active === tab.id ? 'page' : undefined} onClick={() => onChange(tab.id)}>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
