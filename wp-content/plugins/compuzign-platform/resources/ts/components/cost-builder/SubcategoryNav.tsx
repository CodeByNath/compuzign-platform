import type { ServiceItem } from '@/api/types/cost-builder';

interface SubcategoryNavProps {
  services: ServiceItem[];
  activeId: number | null;
  onChange: (id: number) => void;
}

export function SubcategoryNav({ services, activeId, onChange }: SubcategoryNavProps) {
  if (services.length <= 1) return null;

  return (
    <nav class="cz-cost-builder__subnav" aria-label="Service subcategories">
      {services.map((s) => (
        <button
          key={s.id}
          role="tab"
          aria-selected={s.id === activeId}
          class={['cz-sub-tab', s.id === activeId && 'is-active'].filter(Boolean).join(' ')}
          onClick={() => onChange(s.id)}
        >
          {s.title}
        </button>
      ))}
    </nav>
  );
}
