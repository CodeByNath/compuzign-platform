// Service record-level footer model — the whole-record actions (Enable/Disable,
// Archive, Move to Trash, Close, Publish). Pure presentation: it declares
// intent and calls handlers; every behaviour is owned by the controller and,
// beneath it, useServiceStation. Rendered into the host's footer region through
// the bridge (never inside the scrolling body), so module-level footers inside
// the drawer content are untouched.

import { EntityActionFooter } from '@/drawer-kit/EntityActionFooter';
import type { DrawerTabId } from '@/drawer-kit/DrawerTabs';

interface ServiceDrawerFooterProps {
  // Widened with the canonical tab contract; Service declares no Settings tab,
  // so at runtime this is only ever 'details' | 'connections'.
  tab: DrawerTabId;
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

  if (!(tab === 'details' && isLiveState)) {
    return (
      <EntityActionFooter
        close={{ id: 'close', label: 'Close', onSelect: onClose }}
      />
    );
  }

  return (
    <EntityActionFooter
      split={{
        id: 'status',
        label: platformStatus === 'active' ? 'Disable' : isNewNeverPublished ? 'Move to Trash' : 'Enable',
        onSelect: isNewNeverPublished ? onTrash : onToggleActive,
        busy: loadingStatus,
        tone: platformStatus === 'active' || isNewNeverPublished ? 'danger' : 'secondary',
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
