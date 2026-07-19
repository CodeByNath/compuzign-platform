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
export function CategoryOverviewEditor({ draft, onChange, groups, groupId, onGroupChange }: Props) {
  return (
    <div class="cz-tf-form">
      <div class="cz-tf-field">
        <label class="cz-tf-label" for="cz-category-name">Name</label>
        <input
          id="cz-category-name"
          type="text"
          class="cz-tf-input"
          value={draft.name}
          onInput={(event) => onChange({ name: event.currentTarget.value })}
        />
      </div>

      <div class="cz-tf-field">
        <label class="cz-tf-label" for="cz-category-group">Group</label>
        <select
          id="cz-category-group"
          class="cz-tf-select"
          value={groupId ?? ''}
          onChange={(event) => {
            const raw = event.currentTarget.value;
            onGroupChange(raw === '' ? null : Number(raw));
          }}
        >
          <option value="">No group</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>{group.name}</option>
          ))}
        </select>
      </div>

      <div class="cz-tf-field">
        <label class="cz-tf-label" for="cz-category-description">Description</label>
        <textarea
          id="cz-category-description"
          class="cz-tf-textarea"
          value={draft.description}
          onInput={(event) => onChange({ description: event.currentTarget.value })}
        />
      </div>
    </div>
  );
}
