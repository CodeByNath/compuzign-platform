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
  // The Disable action's platform-visible mask (see Category/Service's own
  // isDisabledMasked) — drives the split action's label/target independently
  // of raw platformStatus, so an Enabled-but-still-'disabled' record (Pending,
  // real settled content) offers Disable again instead of a no-op "Enable".
  // Optional and defaulted `true` (the original always-"Enable" behaviour) so
  // callers that have not adopted the mask yet (Package Family, Tier System)
  // are unaffected.
  isDisabledMasked?: boolean;
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
  isDisabledMasked = true,
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

  // Never-published (nothing to disable/publish yet) offers Move to Trash; a
  // masked record (explicit Disable applied, not yet Enabled) offers Enable;
  // every other live state — genuinely active, or Enabled-and-Pending with
  // real settled content — offers Disable. Enable is reachable only from a
  // masked record, so it can never repeat itself: once it runs, the record is
  // unmasked and this reads Disable again.
  const statusLabel = isNewNeverPublished ? 'Move to Trash' : isDisabledMasked ? 'Enable' : 'Disable';

  return (
    <EntityActionFooter
      split={{
        id: 'status',
        label: platformStatus === 'active' ? 'Disable' : statusLabel,
        onSelect: isNewNeverPublished ? onTrash : onToggleActive,
        busy,
        tone: platformStatus === 'active' || statusLabel !== 'Enable' ? 'danger' : 'secondary',
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
