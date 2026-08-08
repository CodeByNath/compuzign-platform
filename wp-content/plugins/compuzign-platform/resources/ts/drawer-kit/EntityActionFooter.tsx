// Shared record-level footer grammar.
//
// Entity compositions provide authoritative actions as data; this renderer owns
// the one visual/interaction grammar for record-level lifecycle actions. Module
// Save/Cancel stays with InlineEditorShell.
//
// Two mounting shapes share this same grammar: the pinned drawer footer
// (through the host bridge — `close` supplied, default `.cz-tf-footer`
// pinned/sticky styling) and an inline card-level surface with no record to
// close (`close` omitted, `inline` set — same button/split grammar, no
// sticky positioning). A consumer opts into `inline` explicitly; every
// existing pinned-footer caller is unaffected.

export interface EntityFooterAction {
  id: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  busyLabel?: string;
  busy?: boolean;
  danger?: boolean;
}

export interface EntityFooterSplitAction extends EntityFooterAction {
  tone: 'danger' | 'secondary';
  overflow: EntityFooterAction[];
  open: boolean;
  onToggle: () => void;
}

interface EntityActionFooterProps {
  split?: EntityFooterSplitAction | null;
  // Optional: an inline mounting (no record to close from this surface) omits
  // it entirely rather than rendering a Close button with nowhere to go.
  close?: EntityFooterAction | null;
  primary?: EntityFooterAction | null;
  // Card-level surface, not the pinned drawer footer — same grammar, no
  // sticky/pinned positioning (see file header).
  inline?: boolean;
}

function actionLabel(action: EntityFooterAction): string {
  return action.busy ? (action.busyLabel ?? '…') : action.label;
}

export function EntityActionFooter({ split, close, primary, inline }: EntityActionFooterProps) {
  return (
    <div class={`cz-tf-footer${inline ? ' cz-tf-footer--inline' : ''}`}>
      {split && (
        <div class={`cz-footer-split cz-footer-split--${split.tone}`}>
          <button
            type="button"
            class="cz-footer-split__btn"
            disabled={split.disabled || split.busy}
            onClick={split.onSelect}
          >
            {actionLabel(split)}
          </button>
          <button
            type="button"
            class="cz-footer-split__chevron"
            disabled={split.disabled || split.busy || split.overflow.length === 0}
            onClick={(event) => { event.stopPropagation(); split.onToggle(); }}
            aria-label="More actions"
            aria-expanded={split.open}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
            </svg>
          </button>
          {split.open && split.overflow.length > 0 && (
            <div class="cz-footer-split__menu">
              {split.overflow.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  class={`cz-footer-split__item${action.danger ? ' cz-footer-split__item--danger' : ''}`}
                  disabled={action.disabled || action.busy}
                  onClick={action.onSelect}
                >
                  {actionLabel(action)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div class="cz-tf-footer__spacer" />
      {close && (
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--secondary"
          disabled={close.disabled || close.busy}
          onClick={close.onSelect}
        >
          {actionLabel(close)}
        </button>
      )}
      {primary && (
        <button
          type="button"
          class={`cz-admin-btn ${primary.danger ? 'cz-admin-btn--danger' : 'cz-admin-btn--primary'}`}
          disabled={primary.disabled || primary.busy}
          onClick={primary.onSelect}
        >
          {actionLabel(primary)}
        </button>
      )}
    </div>
  );
}
