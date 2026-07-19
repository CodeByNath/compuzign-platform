// Shared drawer-module footer (Schema architecture S1b).
//
// Renders a `.drawerModule__footer` from an ordered list of action
// descriptors, replacing the hand-written footer varieties (Edit ·
// Discard Draft + Edit · View-only · disabled locked buttons). Descriptors
// declare intent only; behaviour arrives as handlers from the owning
// station hook / step — the footer never owns business logic.
//
// All footer buttons currently share one visual style (secondary · sm),
// matching every pre-S1b footer. Intent variants (danger, confirm flows)
// arrive with the travel-surface consolidation, not before.

export interface FooterAction {
  id:        string;               // 'edit' | 'discard-draft' | 'view' | 'refresh' | …
  label:     string;
  onSelect?: () => void;
  disabled?: boolean;
}

export function ActionFooter({ actions }: { actions: FooterAction[] }) {
  if (actions.length === 0) return null;
  return (
    <div class="drawerModule__footer">
      {actions.map((a) => (
        <button
          key={a.id}
          type="button"
          class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
          onClick={a.onSelect}
          disabled={a.disabled}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
