// Canonical StationLifecycle footer model used by Category and Package Family.
// The lower-level EntityActionFooter owns the visual grammar; this component
// maps the shared active/disabled/archived/trashed lifecycle onto real handlers.

import { EntityActionFooter } from './EntityActionFooter';

export interface CanonicalEntityFooterProps {
  platformStatus: string;
  isNewNeverPublished: boolean;
  hasBeenPublished: boolean;
  canPublish: boolean;
  busy: boolean;
  splitOpen: boolean;
  setSplitOpen: (next: boolean | ((previous: boolean) => boolean)) => void;
  onToggleActive: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onPublish: () => void;
  onClose: () => void;
}

export function CanonicalEntityFooter({
  platformStatus,
  isNewNeverPublished,
  hasBeenPublished,
  canPublish,
  busy,
  splitOpen,
  setSplitOpen,
  onToggleActive,
  onArchive,
  onTrash,
  onRestore,
  onDelete,
  onPublish,
  onClose,
}: CanonicalEntityFooterProps) {
  if (platformStatus === 'archived') {
    return (
      <EntityActionFooter
        split={{
          id: 'restore', label: 'Restore', onSelect: onRestore, busy,
          tone: 'secondary', open: splitOpen,
          onToggle: () => setSplitOpen((value) => !value),
          overflow: [{ id: 'trash', label: 'Move to Trash', onSelect: onTrash, danger: true, disabled: busy }],
        }}
        close={{ id: 'close', label: 'Close', onSelect: onClose, disabled: busy }}
      />
    );
  }

  if (platformStatus === 'trashed') {
    return (
      <EntityActionFooter
        split={{
          id: 'restore', label: 'Restore', onSelect: onRestore, busy,
          tone: 'secondary', open: splitOpen,
          onToggle: () => setSplitOpen((value) => !value),
          overflow: [{ id: 'delete', label: 'Permanently delete', onSelect: onDelete, danger: true, disabled: busy }],
        }}
        close={{ id: 'close', label: 'Close', onSelect: onClose, disabled: busy }}
      />
    );
  }

  return (
    <EntityActionFooter
      split={{
        id: 'status',
        label: platformStatus === 'active' ? 'Disable' : isNewNeverPublished ? 'Move to Trash' : 'Enable',
        onSelect: isNewNeverPublished ? onTrash : onToggleActive,
        busy,
        tone: platformStatus === 'active' || isNewNeverPublished ? 'danger' : 'secondary',
        open: splitOpen,
        onToggle: () => setSplitOpen((value) => !value),
        overflow: [
          { id: 'archive', label: 'Archive', onSelect: onArchive, disabled: !hasBeenPublished || busy },
          ...(!isNewNeverPublished ? [{ id: 'trash', label: 'Move to Trash', onSelect: onTrash, danger: true, disabled: busy }] : []),
        ],
      }}
      close={{ id: 'close', label: 'Close', onSelect: onClose, disabled: busy }}
      primary={{ id: 'publish', label: 'Publish', onSelect: onPublish, disabled: !canPublish || busy, busy }}
    />
  );
}
