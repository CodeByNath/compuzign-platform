import type { ServiceCategoryGroupOverviewDraft } from '@/api/types/admin';

// Category Group Overview module editor (Category Group audit, Option B).
// Structural clone of CategoryOverviewEditor.tsx, one level up: name +
// description only — the slug is immutable and deliberately absent. Group
// membership has no selector here (Phase D2, deferred): it lives on the
// category side, not the group side.

interface Props {
  draft:    ServiceCategoryGroupOverviewDraft;
  onChange: (patch: Partial<ServiceCategoryGroupOverviewDraft>) => void;
}

export function ServiceCategoryGroupOverviewEditor({ draft, onChange }: Props) {
  return (
    <div class="cz-tf-form">

      <div class="cz-tf-field">
        <label class="cz-tf-label">Name</label>
        <input type="text" class="cz-tf-input" value={draft.name}
          onInput={(e) => onChange({ name: (e.target as HTMLInputElement).value })} />
      </div>

      <div class="cz-tf-field">
        <label class="cz-tf-label">Description</label>
        <textarea class="cz-tf-textarea" value={draft.description}
          onInput={(e) => onChange({ description: (e.target as HTMLTextAreaElement).value })} />
      </div>

    </div>
  );
}
