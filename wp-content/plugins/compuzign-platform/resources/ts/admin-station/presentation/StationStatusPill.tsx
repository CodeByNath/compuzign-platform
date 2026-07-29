// Admin Station card adapter for the shared status-pill and notification-panel
// system. It owns only disclosure state and the card-popover wrapper; status
// resolution, pill rendering, and note rendering stay in drawer-kit.

import { useId, useState, useRef, useEffect } from 'preact/hooks';
import type { ModuleNote } from '@/drawer-kit/utils/moduleNotifications';
import { ModuleStatusPill } from '@/drawer-kit/ui/ModuleStatusPill';
import { ModuleNotificationPanel } from '@/drawer-kit/ui/ModuleNotificationPanel';

interface Props {
  status: string;
  notes?: ModuleNote[];
  // The pill's own dimensions/typography: 'station' (default) is the pill every
  // other consumer renders; 'module' reuses the drawer/module pill verbatim
  // (no dot, drawer-sized) for a caller that wants that reading. The
  // notification panel's note list stays 'station' either way — that class
  // pairing is what the floating card panel is styled against.
  pillVariant?: 'station' | 'module';
}

export function StationStatusPill({ status, notes = [], pillVariant = 'station' }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLSpanElement | null>(null);

  // Dismiss on a press outside the pill/panel — mousedown (not click) so a
  // press that starts outside closes immediately, matching the split action's
  // own click-outside behaviour.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  if (notes.length === 0) {
    return <ModuleStatusPill status={status} notes={notes} variant={pillVariant} />;
  }

  return (
    <span ref={rootRef} class="cz-station-status-notifications">
      <ModuleStatusPill
        status={status}
        notes={notes}
        variant={pillVariant}
        onOpen={() => setOpen((value) => !value)}
        expanded={open}
        controls={panelId}
      />
      {open && (
        <span id={panelId} class="cz-station-status-notifications__panel" role="status">
          <strong>Notifications</strong>
          <ModuleNotificationPanel notes={notes} variant="station" />
        </span>
      )}
    </span>
  );
}
