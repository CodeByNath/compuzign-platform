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
        <div class="cz-ies__nav">
          <button type="button" class="cz-action-shell__back" onClick={handleCancelClick} disabled={saving} aria-label={`Back from ${title}`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              focusable="false"
            >
              <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
            </svg>
          </button>
          <span class="cz-ies__title">{title}</span>
        </div>
        <span class="cz-ies__live-badge">
          <span class="cz-module-status-pill cz-module-status-pill--active">Live Editor</span>
        </span>
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
