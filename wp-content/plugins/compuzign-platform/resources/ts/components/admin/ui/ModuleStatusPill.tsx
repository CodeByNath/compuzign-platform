// Unified module status pill with left marker slot.
//
// Marker renders · (middle dot) when note count is zero — non-interactive.
// Marker renders N (count) when notes exist — pill becomes a button that opens the panel.
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
  const count  = noteCount(notes);
  const meta   = PILL_META[status] ?? FALLBACK;
  const marker = count > 0 ? String(count) : '·';
  const cls    = `cz-module-status-pill ${meta.cls}`;

  if (count > 0 && onOpen) {
    return (
      <button type="button" class={cls} onClick={onOpen}>
        <span class="cz-module-status-pill__marker">{marker}</span>
        {meta.label}
      </button>
    );
  }

  return (
    <span class={cls}>
      <span class="cz-module-status-pill__marker">{marker}</span>
      {meta.label}
    </span>
  );
}
