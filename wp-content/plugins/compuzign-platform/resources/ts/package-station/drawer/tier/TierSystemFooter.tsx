// Tier System aggregate footer — Milestone 1 action set only.
//
// Pending: Close, Publish. Persisted: Close, Apply, destructive cascade Delete. No
// Enable / Disable / Archive / Trash / Restore: the aggregate's `status` is
// currently DERIVED from occupant state (TierInstanceSchema::withInstance
// recomputes it on every write — see docs/code-map/tier-registration.md) and
// has no authoritative manual-transition endpoint yet, so those actions would
// have no safe backend seam to call. Extend this footer (or fold it into
// CanonicalEntityFooter) once that backend work lands.

import { SupportedActionFooter, type SupportedFooterAction } from '@/drawer-kit/SupportedActionFooter';
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
    const actions: SupportedFooterAction[] = [
      { id: 'close', label: 'Close', placement: 'close', onSelect: onClose, disabled: saving },
      { id: 'publish', label: 'Publish', placement: 'primary', onSelect: onPublish,
        disabled: saving || !canPublish, busy: saving, busyLabel: 'Publishing…' },
    ];
    return <SupportedActionFooter actions={actions} />;
  }

  // mode === 'persisted'
  const actions: SupportedFooterAction[] = [
    { id: 'delete', label: 'Delete', placement: 'split', onSelect: onDelete,
      busy: deleting, disabled: saving, tone: 'danger' },
    { id: 'close', label: 'Close', placement: 'close', onSelect: onClose, disabled: saving || deleting },
    { id: 'apply', label: 'Apply', placement: 'primary', onSelect: onApply,
      disabled: saving || deleting || !canApply, busy: saving, busyLabel: 'Applying…' },
  ];
  return <SupportedActionFooter actions={actions} />;
}
