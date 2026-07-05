// Unified module status pill.
//
// The pill communicates LIFECYCLE ONLY (Active / Pending / Disabled). It never
// carries counts or context-specific variants — a module looks the same wherever
// it renders. Any additional detail (blocking gaps, guidance) is surfaced through
// the notification panel, not the pill.
//
// When any notes exist (error or info):
//   → pill is a button that opens the notification panel.
// When no notes at all:
//   → pill is a static span.
//
// The pending-dim opacity (0.45) is applied by the parent .drawerModule__status--dim wrapper.

import type { ModuleNote } from '@/components/admin/utils/moduleNotifications';
import { PILL_META, PILL_FALLBACK } from '@/components/admin/schema/presentation';
import { Skeleton } from './Skeleton';

interface Props {
  status:   string;           // 'active' | 'pending-dim' | 'pending-full' | 'disabled' | 'loading'
  notes:    ModuleNote[];     // full note list — count derived internally
  onOpen?:  () => void;       // called when pill is clicked to open the panel
}

export function ModuleStatusPill({ status, notes, onOpen }: Props) {
  // Authoritative detail still in flight — show a shimmer sized to the pill rather
  // than a status derived from the lightweight handoff. Not a lifecycle state.
  if (status === 'loading') {
    // Match the canonical pill footprint so the layout doesn't shift on resolve.
    return <Skeleton width="var(--admin-pill-min-width)" height="20px" />;
  }

  const hasNotes = notes.length > 0;   // any notes — drives button vs span
  const meta     = PILL_META[status] ?? PILL_FALLBACK;
  const cls      = `cz-module-status-pill ${meta.cls}`;

  // Any notes (error or info): clickable pill that opens the notification panel.
  // The pill label stays lifecycle-only — the count lives in the panel, not here.
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
