// Tier record-level footer. Pure presentation over the controller's footer
// model: 'none' during module edit (InlineEditorShell carries its own footer),
// 'close-only' at load / package overview, and the Enable-Disable split +
// Publish once a tier is open. Rendered into the host's footer region through
// the bridge.

import { EntityActionFooter } from '@/drawer-kit/EntityActionFooter';

interface TierDrawerFooterProps {
  mode: 'close-only' | 'none' | 'tier-actions';
  occupied: boolean;
  enabled: boolean;
  hasContent: boolean;
  saving: boolean;
  splitOpen: boolean;
  setSplitOpen: (next: boolean | ((prev: boolean) => boolean)) => void;
  onToggleEnabled: () => void;
  onArchive: () => void;
  onPublish: () => void;
  onClose: () => void;
}

export function TierDrawerFooter({
  mode, occupied, enabled, hasContent, saving, splitOpen, setSplitOpen,
  onToggleEnabled, onArchive, onPublish, onClose,
}: TierDrawerFooterProps) {
  if (mode === 'none') return null;

  if (mode === 'close-only') {
    return (
      <EntityActionFooter close={{ id: 'close', label: 'Close', onSelect: onClose }} />
    );
  }

  // mode === 'tier-actions'
  return (
    <EntityActionFooter
      split={occupied ? {
        id: 'status',
        label: enabled ? 'Disable' : 'Enable',
        onSelect: onToggleEnabled,
        busy: saving,
        tone: enabled ? 'danger' : 'secondary',
        open: splitOpen,
        onToggle: () => setSplitOpen((value) => !value),
        overflow: [{ id: 'archive', label: 'Archive', onSelect: onArchive, disabled: saving }],
      } : null}
      close={{ id: 'close', label: 'Close', onSelect: onClose, disabled: saving }}
      primary={{ id: 'publish', label: 'Publish', onSelect: onPublish, disabled: saving || !hasContent, busy: saving, busyLabel: 'Saving…' }}
    />
  );
}
