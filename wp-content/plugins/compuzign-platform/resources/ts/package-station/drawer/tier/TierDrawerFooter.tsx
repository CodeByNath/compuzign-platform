// Tier record-level footer. Pure presentation over the controller's footer
// model: 'none' during module edit (InlineEditorShell carries its own
// footer), 'close-only' at load / package overview, and two independent
// scope-aware lifecycle splits once a tier is open.
//
// Single-footer, scope-aware lifecycle command model (correction plan
// Phase 4; UI refinement Phase 1 split the one split control below into
// two): the footer stays ONE pinned surface, but carries two independent
// split controls — a LEFT "lifecycle" split (Disable/Enable/Archive/
// Restore/Trash/Move to Bin, via buildTierLifecycleMenu) and a RIGHT
// "publish" split (Publish Edition / Publish Tier, via buildTierPublishMenu)
// — scoped to the selected Edition first (if one is selected under Options)
// then the Tier, in both cases. Grouping forward (publish) and backward
// (lifecycle/travel) actions into their own controls reads more clearly
// than one combined dropdown; it does not change which actions exist, who
// owns them, or their relative Edition-before-Tier priority within each
// group. Both splits are mounted with `menuOnly: true` — the visible label
// click only opens/closes their own menu (same as their own chevron); a
// lifecycle or publish mutation only ever happens from an explicit row
// inside the relevant menu. This is the one opt-in consumer of
// EntityActionFooter's menuOnly flag (now exercised on both its `split` and
// `splitForward` slots); every other footer in the codebase is unaffected.
//
// Rendered into the host's footer region through the bridge.

import { SupportedActionFooter, type SupportedFooterAction } from '@/drawer-kit/SupportedActionFooter';
import { buildTierLifecycleMenu, buildTierPublishMenu, type SelectedEditionLifecycleInputs } from './tierLifecycleMenu';

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
  // The RIGHT (publish) split's own independent open/closed state — a
  // second dropdown needs its own toggle, never shared with the lifecycle
  // split's `splitOpen` above.
  publishSplitOpen: boolean;
  setPublishSplitOpen: (next: boolean | ((prev: boolean) => boolean)) => void;
  onToggleEnabled: () => void;
  onArchive: () => void;
  onPublish: () => void;
  onClose: () => void;
  // null when no Edition is selected under Options — the footer then
  // behaves exactly like the pre-existing Tier-only footer (same top label
  // formula, same rows), per the approved audit's explicit requirement.
  selectedEdition: SelectedEditionLifecycleInputs | null;
}

export function TierDrawerFooter({
  mode, enabled, hasContent, hasBeenPublished, saving, splitOpen, setSplitOpen,
  publishSplitOpen, setPublishSplitOpen,
  onToggleEnabled, onArchive, onPublish, onClose, selectedEdition,
}: TierDrawerFooterProps) {
  if (mode === 'none') return null;

  if (mode === 'close-only') {
    return <SupportedActionFooter actions={[
      { id: 'close', label: 'Close', placement: 'close', onSelect: onClose },
    ]} />;
  }

  // mode === 'tier-actions'
  const tierInputs = { hasBeenPublished, enabled, hasContent, onPublish, onToggleEnabled, onArchive };
  const lifecycleMenu = buildTierLifecycleMenu(tierInputs, selectedEdition);
  const publishMenu = buildTierPublishMenu(tierInputs, selectedEdition);
  const actions: SupportedFooterAction[] = [
    {
      id: 'lifecycle', label: lifecycleMenu.splitLabel, placement: 'split' as const,
      // Never invoked — menuOnly means the visible label only opens the
      // menu (same as the chevron); every real transition is one of the
      // explicit overflow rows below, including whichever one would
      // otherwise have been the "obvious" default action.
      onSelect: () => {},
      menuOnly: true,
      busy: saving, busyLabel: 'Saving…', tone: lifecycleMenu.splitTone,
      open: splitOpen, onToggle: () => setSplitOpen((value) => !value),
      overflow: lifecycleMenu.entries.map((entry) => ({ ...entry, disabled: saving })),
    },
    {
      id: 'publish', label: publishMenu.splitLabel, placement: 'split-forward' as const,
      // Never invoked — same menu-only safety rule as the lifecycle split.
      onSelect: () => {},
      menuOnly: true,
      // Preserves the old flat Publish button's own busy label — a request
      // in flight shows "Saving…" rather than the generic "…" default.
      busy: saving, busyLabel: 'Saving…', tone: publishMenu.splitTone,
      open: publishSplitOpen, onToggle: () => setPublishSplitOpen((value) => !value),
      overflow: publishMenu.entries.map((entry) => ({ ...entry, disabled: saving })),
    },
    { id: 'close', label: 'Close', placement: 'close', onSelect: onClose, disabled: saving },
  ];
  return <SupportedActionFooter actions={actions} />;
}
