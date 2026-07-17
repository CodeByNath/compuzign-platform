import type { ServiceCategoryGroupStationItem, CategoryOverviewDraft } from '@/api/types/admin';

// Category Overview module editor (S6). Name + description — the slug is
// immutable in v1 (D5) and deliberately absent; category-to-service assignment
// lives on the service side (relational ecosystem: the service is the
// anchor), so there is no service selector here.
//
// Group field (Category Group audit, Phase D2): an optional picker of existing
// live Service Service Category Groups + "No group". Structural, not draft content — group/id
// is delivered and changed via extras (groups/groupId/onGroupChange), never
// through `draft`/`onChange`, and persists through the dedicated
// PATCH /admin/categories/{id}/group endpoint, not the overview_draft
// envelope. No inline group creation here — pick from existing groups only.

interface Props {
  draft:         CategoryOverviewDraft;
  onChange:      (patch: Partial<CategoryOverviewDraft>) => void;
  groups:        ServiceCategoryGroupStationItem[];
  groupId:       number | null;
  onGroupChange: (id: number | null) => void;
}

export function CategoryOverviewEditor({ draft, onChange, groups, groupId, onGroupChange }: Props) {
  return (
    <div class="cz-tf-form">

      <div class="cz-tf-field">
        <label class="cz-tf-label">Name</label>
        <input type="text" class="cz-tf-input" value={draft.name}
          onInput={(e) => onChange({ name: (e.target as HTMLInputElement).value })} />
      </div>

      <div class="cz-tf-field">
        <label class="cz-tf-label">Group</label>
        <select
          class="cz-tf-select"
          value={groupId ?? ''}
          onChange={(e) => {
            const raw = (e.target as HTMLSelectElement).value;
            onGroupChange(raw === '' ? null : Number(raw));
          }}
        >
          <option value="">No group</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>

      <div class="cz-tf-field">
        <label class="cz-tf-label">Description</label>
        <textarea class="cz-tf-textarea" value={draft.description}
          onInput={(e) => onChange({ description: (e.target as HTMLTextAreaElement).value })} />
      </div>

    </div>
  );
}
