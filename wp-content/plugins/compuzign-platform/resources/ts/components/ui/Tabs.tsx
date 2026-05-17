export interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export function Tabs({ items, activeId, onChange }: TabsProps) {
  return (
    <div class="cz-tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          role="tab"
          aria-selected={item.id === activeId}
          class={['cz-chip', item.id === activeId && 'is-active'].filter(Boolean).join(' ')}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
