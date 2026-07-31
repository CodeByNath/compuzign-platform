// Service record-level footer model — the whole-record actions (Enable/Disable,
// Archive, Move to Trash, Close, Publish). Pure presentation: it declares
// intent and calls handlers; every behaviour is owned by the controller and,
// beneath it, useServiceStation. Rendered into the host's footer region through
// the bridge (never inside the scrolling body), so module-level footers inside
// the drawer content are untouched.

import { EntityActionFooter } from '@/drawer-kit/EntityActionFooter';

interface ServiceDrawerFooterProps {
  tab: 'details' | 'connections';
  platformStatus: string;
  // The Disable action's platform-visible mask — see useServiceStation's
  // isDisabledMasked. Drives the split action's label/target independently of
  // raw platformStatus: a Service Enable just unmasked is platformStatus
  // 'disabled' but NOT masked, and must offer Disable again, not a no-op
  // "Enable" — see the split action below.
  isDisabledMasked: boolean;
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
  tab, platformStatus, isDisabledMasked, isNewNeverPublished, hasBeenPublished, canPublish, loadingStatus,
  splitOpen, setSplitOpen, onToggleActive, onArchive, onTrash, onPublish, onClose,
}: ServiceDrawerFooterProps) {
  const isLiveState = platformStatus === 'active' || platformStatus === 'disabled';

  if (!(tab === 'details' && isLiveState)) {
    return (
      <EntityActionFooter
        close={{ id: 'close', label: 'Close', onSelect: onClose }}
      />
    );
  }

  // The split action's label: never-published (nothing to disable/publish yet)
  // offers Move to Trash; a masked Service (explicit Disable applied, not yet
  // Enabled) offers Enable; every other live state — genuinely active, or
  // Enabled-and-Pending with real settled content — offers Disable. Enable is
  // reachable only from a masked Service, so Enable can never repeat itself:
  // once it runs, the record is unmasked and this reads Disable again.
  const statusLabel = isNewNeverPublished ? 'Move to Trash' : isDisabledMasked ? 'Enable' : 'Disable';

  return (
    <EntityActionFooter
      split={{
        id: 'status',
        label: statusLabel,
        onSelect: isNewNeverPublished ? onTrash : onToggleActive,
        busy: loadingStatus,
        tone: statusLabel === 'Enable' ? 'secondary' : 'danger',
        open: splitOpen,
        onToggle: () => setSplitOpen((value) => !value),
        overflow: [
          { id: 'archive', label: 'Archive', onSelect: onArchive, disabled: !hasBeenPublished || loadingStatus },
          ...(!isNewNeverPublished ? [{ id: 'trash', label: 'Move to Trash', onSelect: onTrash, disabled: loadingStatus, danger: true }] : []),
        ],
      }}
      close={{ id: 'close', label: 'Close', onSelect: onClose }}
      primary={{ id: 'publish', label: 'Publish', onSelect: onPublish, disabled: !canPublish || loadingStatus, busy: loadingStatus }}
    />
  );
}
