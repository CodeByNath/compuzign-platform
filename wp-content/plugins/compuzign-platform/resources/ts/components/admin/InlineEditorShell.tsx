import type { ComponentChildren } from 'preact';

interface Props {
  title: string;
  onSave: () => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  saveErr: string | null;
  children: ComponentChildren;
}

export function InlineEditorShell({ title, onSave, onCancel, saving, saveErr, children }: Props) {
  return (
    <div class="cz-ies">
      <div class="cz-ies__header">
        <button type="button" class="cz-ies__back" onClick={onCancel} aria-label="Back">
          ‹
        </button>
        <span class="cz-ies__title">{title}</span>
      </div>

      <div class="cz-ies__body">
        {children}
        {saveErr && <p class="cz-admin-error-msg" style="margin-top:var(--cz-space-3)">{saveErr}</p>}
      </div>

      <div class="cz-ies__footer">
        <div class="cz-tf-footer__spacer" />
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--secondary"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--primary"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
