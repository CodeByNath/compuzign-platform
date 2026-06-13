import type { ComponentChildren } from 'preact';

interface Props {
  title: string;
  onSave: () => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  saveErr: string | null;
  children: ComponentChildren;
}

// Drawer Principle v1 — Edit state shell; same module shell, different content
export function InlineEditorShell({ title, onSave, onCancel, saving, saveErr, children }: Props) {
  return (
    <div class="cz-ies">
      <div class="cz-ies__header">
        <span class="cz-ies__title">{title}</span>
        <div class="cz-ies__header-controls">
          <button type="button" class="cz-action-shell__back" onClick={onCancel} disabled={saving} aria-label={`Back from ${title}`}>
            ‹
          </button>
          <span class="cz-ies__live-badge">
            <span class="cz-admin-status-dot" style="color:var(--admin-success)" />
            <span class="cz-status-pill cz-status-pill--active">Live Editor</span>
          </span>
        </div>
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
