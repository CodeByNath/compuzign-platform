import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';

interface Props {
  title:    string;
  onSave:   () => Promise<void>;
  onCancel: () => void;
  saving:   boolean;
  saveErr:  string | null;
  isDirty?: boolean;
  children: ComponentChildren;
}

// Drawer Principle v1 — Edit state shell; same module shell, different content
export function InlineEditorShell({ title, onSave, onCancel, saving, saveErr, isDirty, children }: Props) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const handleCancelClick = () => {
    if (isDirty) { setConfirmingCancel(true); return; }
    onCancel();
  };

  const handleDiscardConfirm = () => {
    setConfirmingCancel(false);
    onCancel();
  };

  return (
    <div class="cz-ies">
      <div class="cz-ies__header">
        <span class="cz-ies__title">{title}</span>
        <div class="cz-ies__header-controls">
          <button type="button" class="cz-action-shell__back" onClick={handleCancelClick} disabled={saving} aria-label={`Back from ${title}`}>
            ‹
          </button>
          <span class="cz-ies__live-badge">
            <span class="cz-admin-status-dot" style="color:var(--admin-warning)" />
            <span class="cz-status-pill cz-status-pill--pending">Live Editor</span>
          </span>
        </div>
      </div>

      <div class="cz-ies__body">
        {children}
        {saveErr && <p class="cz-admin-error-msg" style="margin-top:var(--cz-space-3)">{saveErr}</p>}
      </div>

      <div class="cz-ies__footer">
        {confirmingCancel ? (
          <>
            <span style="font-size:var(--cz-text-sm);color:var(--admin-text-secondary);align-self:center">
              Discard unsaved changes?
            </span>
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--secondary"
              onClick={() => setConfirmingCancel(false)}
            >
              Keep editing
            </button>
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--danger"
              onClick={handleDiscardConfirm}
            >
              Discard
            </button>
          </>
        ) : (
          <>
            <div class="cz-tf-footer__spacer" />
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--secondary"
              onClick={handleCancelClick}
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
          </>
        )}
      </div>
    </div>
  );
}
