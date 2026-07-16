import type { StationId } from '@/api/types/admin';
import { STATION_LABELS } from './schema/stations';

interface Props {
  station: StationId;
  onToggleSidebar: () => void;
}

export function Topbar({ station, onToggleSidebar }: Props) {
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
        {STATION_LABELS[station] ?? 'Command Centre'}
      </h1>
      <div class="cz-admin-topbar__brand">
        <span class="cz-admin-topbar__brand-name">CompuZign</span>
        <span class="cz-admin-topbar__brand-sub">Powered by WeeraXStudio</span>
      </div>
    </header>
  );
}
