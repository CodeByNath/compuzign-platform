import { WORKSTATION_LABELS } from '@/api/types/admin';
import type { WorkstationId } from '@/api/types/admin';

interface Props {
  workstation: WorkstationId;
  onToggleSidebar: () => void;
}

export function Topbar({ workstation, onToggleSidebar }: Props) {
  return (
    <header class="cz-admin-topbar">
      <button
        type="button"
        class="cz-admin-topbar__menu-btn"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        ☰
      </button>
      <h1 class="cz-admin-topbar__title">
        {WORKSTATION_LABELS[workstation] ?? 'Command Centre'}
      </h1>
      <span class="cz-admin-topbar__meta">CompuZign Platform</span>
    </header>
  );
}
