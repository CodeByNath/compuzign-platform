// Unified module status pill.
//
// Renders as:   [dot]  [pill]
//
// Dot and pill are separate elements inside the parent drawerModule__status flex container.
// Gap between them is controlled by .drawerModule__status { gap } in CSS — no inline style.
//
// When any notes exist (counted or informational):
//   → pill is a button that opens the notification panel.
// When noteCount > 0 (non-informational notes only):
//   → pill shows the numeric marker inside it.
// When noteCount === 0 but informational notes exist:
//   → pill is still a button, but shows no marker number.
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

const PILL_META: Record<string, { cls: string; label: string; dotCls: string }> = {
  'active':       { cls: 'cz-module-status-pill--active',   label: 'Active',   dotCls: 'cz-admin-status-dot--active'   },
  'disabled':     { cls: 'cz-module-status-pill--inactive', label: 'Disabled', dotCls: 'cz-admin-status-dot--inactive' },
  'pending-dim':  { cls: 'cz-module-status-pill--pending',  label: 'Pending',  dotCls: 'cz-admin-status-dot--pending'  },
  'pending-full': { cls: 'cz-module-status-pill--pending',  label: 'Pending',  dotCls: 'cz-admin-status-dot--pending'  },
};

const FALLBACK = { cls: 'cz-module-status-pill--pending', label: 'Pending', dotCls: 'cz-admin-status-dot--pending' };

export function ModuleStatusPill({ status, notes, onOpen }: Props) {
  const count    = noteCount(notes);        // non-informational only — drives the badge
  const hasNotes = notes.length > 0;       // any notes — drives button vs span
  const meta     = PILL_META[status] ?? FALLBACK;
  const pillCls  = `cz-module-status-pill ${meta.cls}`;
  const dot      = <span class={`cz-admin-status-dot ${meta.dotCls}`} />;

  // Pill with numeric marker + clickable (non-informational notes exist)
  if (count > 0 && onOpen) {
    return (
      <>
        {dot}
        <button type="button" class={pillCls} onClick={onOpen}>
          <span class="cz-module-status-pill__marker">{count}</span>
          {meta.label}
        </button>
      </>
    );
  }

  // Pill clickable but no badge (only informational notes)
  if (hasNotes && onOpen) {
    return (
      <>
        {dot}
        <button type="button" class={pillCls} onClick={onOpen}>
          {meta.label}
        </button>
      </>
    );
  }

  // Static pill — no notes at all
  return (
    <>
      {dot}
      <span class={pillCls}>{meta.label}</span>
    </>
  );
}
