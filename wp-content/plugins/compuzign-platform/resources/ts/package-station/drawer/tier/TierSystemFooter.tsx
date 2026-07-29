// Tier System aggregate footer — Milestone 1 action set only.
//
// Pending: Close, Publish. Persisted: Close, Apply, guarded Delete. No
// Enable / Disable / Archive / Trash / Restore: the aggregate's `status` is
// currently DERIVED from occupant state (TierInstanceSchema::withInstance
// recomputes it on every write — see docs/code-map/tier-registration.md) and
// has no authoritative manual-transition endpoint yet, so those actions would
// have no safe backend seam to call. Extend this footer (or fold it into
// CanonicalEntityFooter) once that backend work lands.

import { EntityActionFooter } from '@/drawer-kit/EntityActionFooter';
import type { TierSystemFooterMode } from './useTierSystemController';

interface TierSystemFooterProps {
  mode:        TierSystemFooterMode;
  saving:      boolean;
  deleting:    boolean;
  canPublish:  boolean;
  canApply:    boolean;
  onPublish:   () => void;
  onApply:     () => void;
  onDelete:    () => void;
  onClose:     () => void;
}

export function TierSystemFooter({
  mode, saving, deleting, canPublish, canApply, onPublish, onApply, onDelete, onClose,
}: TierSystemFooterProps) {
  if (mode === 'none') return null;

  if (mode === 'pending') {
    return (
      <EntityActionFooter
        close={{ id: 'close', label: 'Close', onSelect: onClose, disabled: saving }}
        primary={{
          id: 'publish', label: 'Publish', onSelect: onPublish,
          disabled: saving || !canPublish, busy: saving, busyLabel: 'Publishing…',
        }}
      />
    );
  }

  // mode === 'persisted'
  return (
    <EntityActionFooter
      split={{
        id: 'delete', label: 'Delete', onSelect: onDelete,
        busy: deleting, disabled: saving,
        tone: 'danger', open: false, onToggle: () => {}, overflow: [],
      }}
      close={{ id: 'close', label: 'Close', onSelect: onClose, disabled: saving || deleting }}
      primary={{
        id: 'apply', label: 'Apply', onSelect: onApply,
        disabled: saving || deleting || !canApply, busy: saving, busyLabel: 'Applying…',
      }}
    />
  );
}
