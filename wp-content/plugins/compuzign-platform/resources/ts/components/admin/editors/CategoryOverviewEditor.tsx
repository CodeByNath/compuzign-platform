import type { CategoryOverviewDraft } from '@/api/types/admin';

// Category Overview module editor (S6). Name + description only — the slug is
// immutable in v1 (D5) and deliberately absent; category assignment lives on
// the service side (relational ecosystem: the service is the anchor), so there
// is no selector logic here.

interface Props {
  draft:    CategoryOverviewDraft;
  onChange: (patch: Partial<CategoryOverviewDraft>) => void;
}

export function CategoryOverviewEditor({ draft, onChange }: Props) {
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
