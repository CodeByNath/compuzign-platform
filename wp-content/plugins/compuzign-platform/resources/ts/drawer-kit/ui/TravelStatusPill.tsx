// Travel status pill — Archived/Trashed, the bin-surface vocabulary
// (TRAVEL_PILL), distinct from ModuleStatusPill's lifecycle vocabulary
// (Active/Pending/Disabled), which never carries these two values. Bin
// cards name Archived/Trashed as data labels — travel surfaces only.

import { TRAVEL_PILL } from '../schema/presentation';

export function TravelStatusPill({ status }: { status: string }) {
  const pill = TRAVEL_PILL[status as keyof typeof TRAVEL_PILL] ?? TRAVEL_PILL.archived;
  return (
    <span class={`cz-module-status-pill ${pill.cls}`}>
      <span class="cz-module-status-pill__marker">●</span>
      {pill.label}
    </span>
  );
}
