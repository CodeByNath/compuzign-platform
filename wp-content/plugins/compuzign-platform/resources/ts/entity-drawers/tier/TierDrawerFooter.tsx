// Tier record-level footer. Pure presentation over the controller's footer
// model: 'none' during module edit (InlineEditorShell carries its own footer),
// 'close-only' at load / package overview, and the Enable-Disable split +
// Publish once a tier is open. Rendered into the host's footer region through
// the bridge.

interface TierDrawerFooterProps {
  mode: 'close-only' | 'none' | 'tier-actions';
  occupied: boolean;
  enabled: boolean;
  hasContent: boolean;
  saving: boolean;
  splitOpen: boolean;
  setSplitOpen: (next: boolean | ((prev: boolean) => boolean)) => void;
  onToggleEnabled: () => void;
  onArchive: () => void;
  onPublish: () => void;
  onClose: () => void;
}

export function TierDrawerFooter({
  mode, occupied, enabled, hasContent, saving, splitOpen, setSplitOpen,
  onToggleEnabled, onArchive, onPublish, onClose,
}: TierDrawerFooterProps) {
  if (mode === 'none') return null;

  if (mode === 'close-only') {
    return (
      <div class="cz-tf-footer">
        <div class="cz-tf-footer__spacer" />
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={onClose}>Close</button>
      </div>
    );
  }

  // mode === 'tier-actions'
  return (
    <div class="cz-tf-footer">
      {occupied && (
        <div class={`cz-footer-split${enabled ? ' cz-footer-split--danger' : ' cz-footer-split--secondary'}`}>
          <button type="button" class="cz-footer-split__btn" disabled={saving} onClick={onToggleEnabled}>
            {saving ? '…' : enabled ? 'Disable' : 'Enable'}
          </button>
          <button
            type="button"
            class="cz-footer-split__chevron"
            disabled={saving}
            onClick={(e) => { e.stopPropagation(); setSplitOpen((o) => !o); }}
            aria-label="More actions"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
            </svg>
          </button>
          {splitOpen && (
            <div class="cz-footer-split__menu">
              <button type="button" class="cz-footer-split__item" disabled={saving} onClick={onArchive}>
                Archive
              </button>
            </div>
          )}
        </div>
      )}
      <div class="cz-tf-footer__spacer" />
      <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={onClose} disabled={saving}>Close</button>
      <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={onPublish} disabled={saving || !hasContent}>
        {saving ? 'Saving…' : 'Publish'}
      </button>
    </div>
  );
}
