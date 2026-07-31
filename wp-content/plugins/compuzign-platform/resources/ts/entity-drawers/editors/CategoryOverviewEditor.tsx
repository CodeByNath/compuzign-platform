import { AdminField } from '@/drawer-kit/fields';
import type { CategoryOverviewDraft } from '@/api/types/admin';

interface Props {
  draft: CategoryOverviewDraft;
  onChange: (patch: Partial<CategoryOverviewDraft>) => void;
}

// Neutral Category Overview editor: Name and Description only. The retired
// Service Category Group selector (structural group membership) has been
// removed — Category creation and editing carry no group concept.
export function CategoryOverviewEditor({ draft, onChange }: Props) {
  return (
    <div class="cz-tf-form">
      <AdminField
        def={{ id: 'cz-category-name', type: 'text', label: 'Name' }}
        value={draft.name}
        onChange={(name) => onChange({ name })}
      />

      <AdminField
        def={{ id: 'cz-category-description', type: 'textarea', label: 'Description' }}
        value={draft.description}
        onChange={(description) => onChange({ description })}
      />
    </div>
  );
}
