import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { FocusedTaskShell } from './FocusedTaskShell';

interface Props {
  title:    string;
  onSave:   () => Promise<void>;
  onCancel: () => void;
  saving:   boolean;
  saveErr:  string | null;
  isDirty?: boolean;
  saveDisabled?: boolean;
  children: ComponentChildren;
}

// Drawer Principle v1 — Edit state shell; same module shell, different
// content. A specialisation of the generic FocusedTaskShell (drawer-kit) —
// this file owns only what's specific to an editing session (the Save/
// Cancel footer grammar, the discard-confirm, the "Live Editor" badge); the
// shared Back+Title+State/Body/Footer structure itself lives in
// FocusedTaskShell.tsx. Same rendered DOM/classes/behaviour as before this
// split.
export function InlineEditorShell({ title, onSave, onCancel, saving, saveErr, isDirty, saveDisabled, children }: Props) {
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
    <FocusedTaskShell
      title={title}
      badge={<span class="cz-module-status-pill cz-module-status-pill--active">Live Editor</span>}
      onBack={handleCancelClick}
      backDisabled={saving}
      footer={confirmingCancel ? (
        <>
          <span style="font-size:var(--admin-fs-s-label);color:var(--admin-text-muted);align-self:center">
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
            disabled={saving || saveDisabled}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      )}
    >
      {children}
      {saveErr && <p class="cz-admin-error-msg" style="margin-top:var(--cz-space-3)">{saveErr}</p>}
    </FocusedTaskShell>
  );
}
