// Service record-level footer — the whole-record actions (Enable/Disable,
// Archive, Move to Trash, Close, Publish). Pure presentation: it declares
// intent and calls handlers; every behaviour is owned by the controller and,
// beneath it, useServiceStation. Rendered into the host's footer region through
// the bridge (never inside the scrolling body), so module-level footers inside
// the drawer content are untouched.

interface ServiceDrawerFooterProps {
  tab: 'details' | 'connections';
  platformStatus: string;
  isNewNeverPublished: boolean;
  hasBeenPublished: boolean;
  canPublish: boolean;
  loadingStatus: boolean;
  splitOpen: boolean;
  setSplitOpen: (next: boolean | ((prev: boolean) => boolean)) => void;
  onToggleActive: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onPublish: () => void;
  onClose: () => void;
}

export function ServiceDrawerFooter({
  tab, platformStatus, isNewNeverPublished, hasBeenPublished, canPublish, loadingStatus,
  splitOpen, setSplitOpen, onToggleActive, onArchive, onTrash, onPublish, onClose,
}: ServiceDrawerFooterProps) {
  const isLiveState = platformStatus === 'active' || platformStatus === 'disabled';

  return (
    <div class="cz-tf-footer">
      {/* Split button — visible for active/disabled states */}
      {tab === 'details' && isLiveState && (
        <div class={`cz-footer-split${platformStatus === 'active' || isNewNeverPublished ? ' cz-footer-split--danger' : ' cz-footer-split--secondary'}`}>
          {/* Primary: Active → Disable · Disabled+published → Enable · new never-published → Move to Trash */}
          <button
            type="button"
            class="cz-footer-split__btn"
            disabled={loadingStatus}
            onClick={() => { if (isNewNeverPublished) onTrash(); else onToggleActive(); }}
          >
            {loadingStatus
              ? '…'
              : platformStatus === 'active'
                ? 'Disable'
                : isNewNeverPublished
                  ? 'Move to Trash'
                  : 'Enable'}
          </button>
          <button
            type="button"
            class="cz-footer-split__chevron"
            disabled={loadingStatus}
            onClick={(e) => { e.stopPropagation(); setSplitOpen((v) => !v); }}
            aria-label="More actions"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
            </svg>
          </button>
          {splitOpen && (
            <div class="cz-footer-split__menu">
              <button
                type="button"
                class="cz-footer-split__item"
                disabled={!hasBeenPublished || loadingStatus}
                onClick={onArchive}
              >
                Archive
              </button>
              {/* Move to Trash is the primary action for new never-published drafts —
                  don't repeat it inside the dropdown in that state. */}
              {!isNewNeverPublished && (
                <button
                  type="button"
                  class="cz-footer-split__item"
                  disabled={loadingStatus}
                  onClick={onTrash}
                >
                  Move to Trash
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {!(tab === 'details' && isLiveState) && <div class="cz-tf-footer__spacer" />}
      <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={onClose}>
        Close
      </button>
      {tab === 'details' && isLiveState && <div class="cz-tf-footer__spacer" />}
      {tab === 'details' && isLiveState && (
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--primary"
          onClick={onPublish}
          disabled={!canPublish || loadingStatus}
        >
          {loadingStatus ? '…' : 'Publish'}
        </button>
      )}
    </div>
  );
}
