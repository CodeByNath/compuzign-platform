// Unified module status pill.
//
// When any notes exist (error or info):
//   → pill is a button that opens the notification panel.
// When noteCount > 0 (error notes only):
//   → pill shows the numeric marker inside it.
// When only info notes exist:
//   → pill is a button, no marker number.
// When no notes at all:
//   → pill is a static span.
//
// The pending-dim opacity (0.45) is applied by the parent .drawerModule__status--dim wrapper.

import type { ModuleNote } from '@/components/admin/utils/moduleNotifications';
import { noteCount } from '@/components/admin/utils/moduleNotifications';

interface Props {
  status:   string;           // 'active' | 'pending-dim' | 'pending-full' | 'disabled'
  notes:    ModuleNote[];     // full note list — count derived internally
  onOpen?:  () => void;       // called when pill is clicked to open the panel
}

const PILL_META: Record<string, { cls: string; label: string }> = {
  'active':       { cls: 'cz-module-status-pill--active',   label: 'Active'   },
  'disabled':     { cls: 'cz-module-status-pill--inactive', label: 'Disabled' },
  'pending-dim':  { cls: 'cz-module-status-pill--pending',  label: 'Pending'  },
  'pending-full': { cls: 'cz-module-status-pill--pending',  label: 'Pending'  },
};

const FALLBACK = { cls: 'cz-module-status-pill--pending', label: 'Pending' };

export function ModuleStatusPill({ status, notes, onOpen }: Props) {
  const count    = noteCount(notes);    // error notes only — drives the numeric badge
  const hasNotes = notes.length > 0;   // any notes — drives button vs span
  const meta     = PILL_META[status] ?? FALLBACK;
  const cls      = `cz-module-status-pill ${meta.cls}`;

  // Error notes: clickable pill with numeric badge
  if (count > 0 && onOpen) {
    return (
      <button type="button" class={cls} onClick={onOpen}>
        <span class="cz-module-status-pill__marker">{count}</span>
        {meta.label}
      </button>
    );
  }

  // Info notes only: clickable pill, no badge
  if (hasNotes && onOpen) {
    return (
      <button type="button" class={cls} onClick={onOpen}>
        {meta.label}
      </button>
    );
  }

  // No notes: static pill
  return <span class={cls}>{meta.label}</span>;
}
