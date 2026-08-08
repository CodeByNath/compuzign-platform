// Canonical StationLifecycle footer model used by Category and Package Family.
// The lower-level EntityActionFooter owns the visual grammar; this component
// maps the shared active/disabled/archived/trashed lifecycle onto real handlers.

import { EntityActionFooter } from './EntityActionFooter';

export interface CanonicalEntityFooterProps {
  platformStatus: string;
  // A raw `disabled` value is also the unmasked Pending storage state. Only an
  // explicit Disable action supplies this fact and changes the split action to
  // Enable; omitted consumers retain the legacy platformStatus-only policy.
  isDisabledMasked?: boolean;
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
  // Optional: an inline mounting (see EntityActionFooter's own `inline` prop)
  // has no record to close from this surface, so Close is simply omitted
  // rather than wired to a no-op.
  onClose?: () => void;
  inline?: boolean;
}

export function CanonicalEntityFooter({
  platformStatus,
  isDisabledMasked,
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
  inline,
}: CanonicalEntityFooterProps) {
  // Callers that predate the explicit-mask contract still use the original
  // platform-status interpretation. Category opts in with `false` for its
  // unmasked Pending state, which is the important distinction here.
  const disabledMasked = isDisabledMasked ?? platformStatus === 'disabled';

  const close = onClose ? { id: 'close', label: 'Close', onSelect: onClose, disabled: busy } : null;

  if (platformStatus === 'archived') {
    return (
      <EntityActionFooter
        inline={inline}
        split={{
          id: 'restore', label: 'Restore', onSelect: onRestore, busy,
          tone: 'secondary', open: splitOpen,
          onToggle: () => setSplitOpen((value) => !value),
          overflow: [{ id: 'trash', label: 'Move to Trash', onSelect: onTrash, danger: true, disabled: busy }],
        }}
        close={close}
      />
    );
  }

  if (platformStatus === 'trashed') {
    return (
      <EntityActionFooter
        inline={inline}
        split={{
          id: 'restore', label: 'Restore', onSelect: onRestore, busy,
          tone: 'secondary', open: splitOpen,
          onToggle: () => setSplitOpen((value) => !value),
          overflow: [{ id: 'delete', label: 'Permanently delete', onSelect: onDelete, danger: true, disabled: busy }],
        }}
        close={close}
      />
    );
  }

  return (
    <EntityActionFooter
      inline={inline}
      split={{
        id: 'status',
        label: isNewNeverPublished ? 'Move to Trash' : disabledMasked ? 'Enable' : 'Disable',
        onSelect: isNewNeverPublished ? onTrash : onToggleActive,
        busy,
        tone: disabledMasked ? 'secondary' : 'danger',
        open: splitOpen,
        onToggle: () => setSplitOpen((value) => !value),
        overflow: [
          { id: 'archive', label: 'Archive', onSelect: onArchive, disabled: !hasBeenPublished || busy },
          ...(!isNewNeverPublished ? [{ id: 'trash', label: 'Move to Trash', onSelect: onTrash, danger: true, disabled: busy }] : []),
        ],
      }}
      close={close}
      primary={{ id: 'publish', label: 'Publish', onSelect: onPublish, disabled: !canPublish || busy, busy }}
    />
  );
}
