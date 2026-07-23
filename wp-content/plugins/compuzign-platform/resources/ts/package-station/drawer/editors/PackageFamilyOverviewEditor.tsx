import type { PackageFamilyOverviewDraft } from '../../usePackageFamilyStation';

interface Props {
  draft: PackageFamilyOverviewDraft;
  onChange: (patch: Partial<PackageFamilyOverviewDraft>) => void;
}

export function PackageFamilyOverviewEditor({ draft, onChange }: Props) {
  return (
    <div class="cz-tf-form">
      <div class="cz-tf-field">
        <label class="cz-tf-label" for="cz-package-family-name">Name</label>
        <input
          id="cz-package-family-name"
          type="text"
          class="cz-tf-input"
          value={draft.name}
          onInput={(event) => onChange({ name: event.currentTarget.value })}
        />
      </div>
      <div class="cz-tf-field">
        <label class="cz-tf-label" for="cz-package-family-description">Description</label>
        <textarea
          id="cz-package-family-description"
          class="cz-tf-textarea"
          value={draft.description}
          onInput={(event) => onChange({ description: event.currentTarget.value })}
        />
      </div>
    </div>
  );
}
