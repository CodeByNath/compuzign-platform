// Focused Drawer Task shell — the generic structure every focused,
// chrome-suppressing drawer task shares: Back + Task Title + Task State on
// top, one scrollable body, one footer. Extracted from InlineEditorShell
// (Drawer Principle v1's Edit-state shell), which was the first and, until
// now, only consumer of this structure. InlineEditorShell becomes a thin
// specialisation of this primitive (Cancel/Save footer, discard-confirm,
// "Live Editor" badge) — its own props, behaviour, and rendered DOM are
// unchanged by the extraction (same `cz-ies*` classes, same absolute-overlay
// positioning over the drawer body, same z-index).
//
// This is the standard shape for any future focused drawer task that needs
// to suppress the surrounding drawer chrome without reparenting/remounting
// the content underneath it (a prompt, a form, a wizard step, the Edition
// Bin — see TierEditionBinFocusedView.tsx, its first non-editor adopter).
// The shell itself carries no dirty-state, confirm, or save/cancel opinion
// of its own — that behaviour belongs to whichever caller needs it
// (InlineEditorShell's own discard-confirm is caller-side, not shell-side).
//
// `badge` and `footer` are ComponentChildren, not fixed shapes — a task with
// no meaningful state indicator can omit `badge` entirely, and a task with a
// different footer grammar (e.g. one right-aligned Close, no Save) supplies
// its own footer content rather than a second shell variant.

import type { ComponentChildren } from 'preact';

interface Props {
  title:        string;
  badge?:       ComponentChildren;
  onBack:       () => void;
  backDisabled?: boolean;
  footer:       ComponentChildren;
  children:     ComponentChildren;
}

export function FocusedTaskShell({ title, badge, onBack, backDisabled, footer, children }: Props) {
  return (
    <div class="cz-ies">
      <div class="cz-ies__header">
        <div class="cz-ies__nav">
          <button type="button" class="cz-action-shell__back" onClick={onBack} disabled={backDisabled} aria-label={`Back from ${title}`}>
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
        {badge && <span class="cz-ies__live-badge">{badge}</span>}
      </div>

      <div class="cz-ies__body">{children}</div>

      <div class="cz-ies__footer">{footer}</div>
    </div>
  );
}
