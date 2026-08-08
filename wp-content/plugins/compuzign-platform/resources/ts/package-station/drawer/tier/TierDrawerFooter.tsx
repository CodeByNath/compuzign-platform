// Tier record-level footer. Pure presentation over the controller's footer
// model: 'none' during module edit (InlineEditorShell carries its own
// footer), 'close-only' at load / package overview, and the single
// scope-aware lifecycle split once a tier is open.
//
// Single-footer, scope-aware lifecycle command model (correction plan
// Phase 4): ONE split control carries every lifecycle transition —
// Publish/Disable/Enable/Archive/Restore/Trash — scoped to the selected
// Edition first (if one is selected under Options) then the Tier, per
// buildTierLifecycleMenu (tierLifecycleMenu.ts). There is no longer a
// separate always-visible Publish button: Publish is one of the split's own
// possible top-level verbs, reached the same menu-only way as every other
// transition. The split is mounted with `menuOnly: true` — the visible
// label click only opens/closes the menu (same as the chevron); a lifecycle
// mutation only ever happens from an explicit row inside it. This is the
// ONE opt-in consumer of EntityActionFooter's menuOnly flag; every other
// footer in the codebase is unaffected.
//
// Rendered into the host's footer region through the bridge.

import { SupportedActionFooter, type SupportedFooterAction } from '@/drawer-kit/SupportedActionFooter';
import { buildTierLifecycleMenu, type SelectedEditionLifecycleInputs } from './tierLifecycleMenu';

interface TierDrawerFooterProps {
  mode: 'close-only' | 'none' | 'tier-actions';
  enabled: boolean;
  hasContent: boolean;
  // Whether this persisted occupant has ever been settled/activated by a
  // real Publish. Never-published (occupied: true, hasBeenPublished: false)
  // offers Move to Trash — there is nothing settled worth preserving in the
  // bin. Previously published keeps the existing Archive action.
  hasBeenPublished: boolean;
  saving: boolean;
  splitOpen: boolean;
  setSplitOpen: (next: boolean | ((prev: boolean) => boolean)) => void;
  onToggleEnabled: () => void;
  onArchive: () => void;
  onPublish: () => void;
  onClose: () => void;
  // null when no Edition is selected under Options — the footer then
  // behaves exactly like the pre-existing Tier-only footer (same top label
  // formula, same two rows), per the approved audit's explicit requirement.
  selectedEdition: SelectedEditionLifecycleInputs | null;
}

export function TierDrawerFooter({
  mode, enabled, hasContent, hasBeenPublished, saving, splitOpen, setSplitOpen,
  onToggleEnabled, onArchive, onPublish, onClose, selectedEdition,
}: TierDrawerFooterProps) {
  if (mode === 'none') return null;

  if (mode === 'close-only') {
    return <SupportedActionFooter actions={[
      { id: 'close', label: 'Close', placement: 'close', onSelect: onClose },
    ]} />;
  }

  // mode === 'tier-actions'
  const menu = buildTierLifecycleMenu(
    { hasBeenPublished, enabled, hasContent, onPublish, onToggleEnabled, onArchive },
    selectedEdition,
  );
  const actions: SupportedFooterAction[] = [
    {
      id: 'lifecycle', label: menu.splitLabel, placement: 'split' as const,
      // Never invoked — menuOnly means the visible label only opens the
      // menu (same as the chevron); every real transition is one of the
      // explicit overflow rows below, including whichever one would
      // otherwise have been the "obvious" default action.
      onSelect: () => {},
      menuOnly: true,
      busy: saving, tone: menu.splitTone,
      open: splitOpen, onToggle: () => setSplitOpen((value) => !value),
      overflow: menu.entries.map((entry) => ({ ...entry, disabled: saving })),
    },
    { id: 'close', label: 'Close', placement: 'close', onSelect: onClose, disabled: saving },
  ];
  return <SupportedActionFooter actions={actions} />;
}
