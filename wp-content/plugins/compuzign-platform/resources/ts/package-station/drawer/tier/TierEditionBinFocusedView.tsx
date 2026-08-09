// Edition Bin — presented through the SAME focused-task structure the
// Edition module editor already uses (FocusedTaskShell, drawer-kit),
// corrected from an earlier pass that kept a separate "Drawer Bin" row
// alongside the secondary child-nav strip. There is now only ONE visible
// Bin identity while the Bin is active:
//
//   ‹  Drawer Bin                         [Bin icon] Bin Active
//   ----------------------------------------------------------
//
//   <compact Edition Bin list>
//
//   ----------------------------------------------------------
//                                                    Close
//
// TierEditionDeclarationSwitcher mounts this EXCLUSIVELY in place of the
// ChildChipStrip + module cards while binActive — never alongside them, the
// same exclusive-render guard the Edition module editor already uses for
// itself (`!editingModule`). "Bin Active" is presentation/navigation state
// only, not a lifecycle state, so its badge borrows the neutral/muted
// status-pill tone (cz-module-status-pill--draft) rather than the editor's
// green "Live Editor" pill or any red/danger treatment — red stays reserved
// for TierEditionBinList's own explicit destructive row actions.
//
// Both the shell's own Back control and this file's Close button call ONLY
// onClose (== useTierDrawerController's setEditionBinActive(false)) — never
// a lifecycle/endpoint call, never drawer close, never a change to
// selectedDeclarationId. Restore/Trash/Permanent-Delete remain exclusively
// TierEditionBinList's own row actions, untouched by this wrapper.

import { FocusedTaskShell } from '@/drawer-kit/FocusedTaskShell';
import { TrashIcon } from '@/admin-station/shell/icons';
import type { TierEditionsController } from '../../surface/tierSurface/useTierEditions';
import { TierEditionBinList } from './TierEditionBinList';

interface Props {
  ctl:     TierEditionsController;
  onClose: () => void;
}

export function TierEditionBinFocusedView({ ctl, onClose }: Props) {
  return (
    <FocusedTaskShell
      title="Drawer Bin"
      badge={
        <>
          <TrashIcon />
          <span class="cz-module-status-pill cz-module-status-pill--draft">Bin Active</span>
        </>
      }
      onBack={onClose}
      footer={
        <>
          <div class="cz-tf-footer__spacer" />
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <TierEditionBinList ctl={ctl} />
    </FocusedTaskShell>
  );
}
