// Account record-level footer — the default single-split-plus-primary-Publish
// shape (StationDrawerLifecycleContract-v1 §12), via the lower-level
// EntityActionFooter rather than CanonicalEntityFooter: Account has no
// Archive/Trash/Restore/Delete (flagged, not implemented — see
// docs/code-map/account-station.md), so the split's overflow is legitimately
// empty rather than offering actions with no backing route. This is the SAME
// default shape every other entity's live-state footer uses, not a second one.

import { EntityActionFooter } from '@/drawer-kit/EntityActionFooter';

interface Props {
  isDisabledMasked: boolean;
  canPublish: boolean;
  busy: boolean;
  splitOpen: boolean;
  setSplitOpen: (next: boolean | ((previous: boolean) => boolean)) => void;
  onToggleActive: () => void;
  onPublish: () => void;
  onClose: () => void;
}

export function AccountDrawerFooter({
  isDisabledMasked, canPublish, busy, splitOpen, setSplitOpen, onToggleActive, onPublish, onClose,
}: Props) {
  return (
    <EntityActionFooter
      split={{
        id: 'status',
        label: isDisabledMasked ? 'Enable' : 'Disable',
        onSelect: onToggleActive,
        busy,
        tone: isDisabledMasked ? 'secondary' : 'danger',
        open: splitOpen,
        onToggle: () => setSplitOpen((value) => !value),
        overflow: [],
      }}
      close={{ id: 'close', label: 'Close', onSelect: onClose }}
      primary={{ id: 'publish', label: 'Publish', onSelect: onPublish, disabled: !canPublish || busy, busy }}
    />
  );
}
