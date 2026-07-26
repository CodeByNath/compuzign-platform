import { AdminField } from '@/drawer-kit/fields';
import type { AdminFieldOption } from '@/drawer-kit/fields';
import type {
  CategoryOverviewDraft,
  ServiceCategoryGroupStationItem,
} from '@/api/types/admin';

interface Props {
  draft: CategoryOverviewDraft;
  onChange: (patch: Partial<CategoryOverviewDraft>) => void;
  groups: ServiceCategoryGroupStationItem[];
  groupId: number | null;
  onGroupChange: (id: number | null) => void;
}

// Neutral Category Overview editor. Group membership remains a separate
// structural field supplied through the edit session and saved by the Category
// station controller; it never enters the overview draft envelope.
//
// Group is the one field whose bound value is not a string: the station stores
// a numeric id, so the conversion happens here, at the boundary that owns the
// draft — not inside the shared field renderer.
export function CategoryOverviewEditor({ draft, onChange, groups, groupId, onGroupChange }: Props) {
  const groupOptions: AdminFieldOption[] = groups.map((group) => ({
    value: String(group.id),
    label: group.name,
  }));

  return (
    <div class="cz-tf-form">
      <AdminField
        def={{ id: 'cz-category-name', type: 'text', label: 'Name' }}
        value={draft.name}
        onChange={(name) => onChange({ name })}
      />

      <AdminField
        def={{
          id: 'cz-category-group',
          type: 'select',
          label: 'Group',
          unsetLabel: 'No group',
          options: groupOptions,
        }}
        value={groupId === null ? '' : String(groupId)}
        onChange={(raw: string) => onGroupChange(raw === '' ? null : Number(raw))}
      />

      <AdminField
        def={{ id: 'cz-category-description', type: 'textarea', label: 'Description' }}
        value={draft.description}
        onChange={(description) => onChange({ description })}
      />
    </div>
  );
}
