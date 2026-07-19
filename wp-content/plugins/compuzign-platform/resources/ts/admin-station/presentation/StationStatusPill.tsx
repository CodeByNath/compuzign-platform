// Admin Station card adapter for the shared status-pill and notification-panel
// system. It owns only disclosure state and the card-popover wrapper; status
// resolution, pill rendering, and note rendering stay in drawer-kit.

import { useId, useState } from 'preact/hooks';
import type { ModuleNote } from '@/drawer-kit/utils/moduleNotifications';
import { ModuleStatusPill } from '@/drawer-kit/ui/ModuleStatusPill';
import { ModuleNotificationPanel } from '@/drawer-kit/ui/ModuleNotificationPanel';

interface Props {
  status: string;
  notes?: ModuleNote[];
}

export function StationStatusPill({ status, notes = [] }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  if (notes.length === 0) {
    return <ModuleStatusPill status={status} notes={notes} variant="station" />;
  }

  return (
    <span class="cz-station-status-notifications">
      <ModuleStatusPill
        status={status}
        notes={notes}
        variant="station"
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
