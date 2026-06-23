// Unified module status pill.
//
// When notes exist (count > 0): pill renders a numeric marker and becomes a button that opens the panel.
// When no notes (count === 0): pill renders the label only — no dot, no marker span.
//
// The pending-dim opacity (0.45) is applied by the parent wrapper, not here.
// renderModuleStatus() in moduleStatus.tsx is unchanged and used in other contexts.

import type { ModuleNote } from '@/components/admin/utils/moduleNotifications';
import { noteCount } from '@/components/admin/utils/moduleNotifications';

interface Props {
  status:   string;           // 'active' | 'pending-dim' | 'pending-full' | 'disabled'
  notes:    ModuleNote[];     // full note list — count is derived internally
  onOpen?:  () => void;       // called when numeric marker is clicked; omit for static pill
}

const PILL_META: Record<string, { cls: string; label: string }> = {
  'active':       { cls: 'cz-module-status-pill--active',   label: 'Active'   },
  'disabled':     { cls: 'cz-module-status-pill--inactive', label: 'Disabled' },
  'pending-dim':  { cls: 'cz-module-status-pill--pending',  label: 'Pending'  },
  'pending-full': { cls: 'cz-module-status-pill--pending',  label: 'Pending'  },
};

const FALLBACK = { cls: 'cz-module-status-pill--pending', label: 'Pending' };

export function ModuleStatusPill({ status, notes, onOpen }: Props) {
  const count = noteCount(notes);
  const meta  = PILL_META[status] ?? FALLBACK;
  const cls   = `cz-module-status-pill ${meta.cls}`;

  if (count > 0 && onOpen) {
    return (
      <button type="button" class={cls} onClick={onOpen}>
        <span class="cz-module-status-pill__marker">{count}</span>
        {meta.label}
      </button>
    );
  }

  if (count > 0) {
    return (
      <span class={cls}>
        <span class="cz-module-status-pill__marker">{count}</span>
        {meta.label}
      </span>
    );
  }

  // No notes: label only — no dot, no marker span.
  return <span class={cls}>{meta.label}</span>;
}
