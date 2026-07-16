// Station status pill — the Admin Station's renderer for the existing platform
// status system. It is NOT a competing status component.
//
// The Presentation Status Contract (components/admin/schema/presentation.ts) is
// the one place in the platform where a status maps to a pill label and class,
// and it explicitly forbids any other file defining that mapping. So this
// renderer delegates to it completely: PILL_META supplies both the label and the
// modifier class, and this file resolves neither.
//
// What is new here is styling, not vocabulary. The Admin Station ships its own
// bundle (modules/admin-station.ts) and never loads the old admin stylesheet, so
// the contract's modifier classes would otherwise arrive unstyled. The station
// stylesheet gives those exact classes a token-driven appearance, scoped under
// `.cz-admin-station` — one mapping platform-wide, two visual definitions that
// can never co-load.
//
// Old status UI (ModuleStatusPill) is deliberately not imported: it is old-tree
// UI, it depends on the old Skeleton primitive, and its classes are styled by a
// stylesheet this environment does not load.

import { PILL_META, PILL_FALLBACK } from '@/components/admin/schema/presentation';

interface Props {
  // A 5-state resolver value ('active' | 'disabled' | 'pending-dim' |
  // 'pending-full'). Unknown values present as Pending, per the contract.
  status: string;
}

export function StationStatusPill({ status }: Props) {
  const meta = PILL_META[status] ?? PILL_FALLBACK;

  return (
    <span class={`cz-station-status-pill ${meta.cls}`}>
      <span class="cz-station-status-pill__dot" aria-hidden="true" />
      {meta.label}
    </span>
  );
}
