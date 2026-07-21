// Tier Workspace Engine — the compact Package Family scope control (header).
//
// The engine's working scope in one compact line: "Package Family: KAIROS —
// IaaS". A native <select> is the right primitive here — a single-choice scope
// switch that stays out of the way, replacing the former full-height Family card
// wall / vertical selector that dominated this view. Native semantics give it a
// real label, keyboard support, and platform affordances for free.
//
// Choosing a Family is transient view state owned by the orchestrator: it
// re-scopes the projected Tiers and the authoritative metrics band and writes
// NOTHING. Family is scope, never Tier ownership.

import type { VNode } from 'preact';

/** The minimal shape the scope control needs — the workspace family satisfies it. */
export interface FamilyScopeItem {
  id: string;
  name: string;
  description: string;
}

interface Props {
  families: FamilyScopeItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function PackageFamilyScope({ families, selectedId, onSelect }: Props): VNode {
  return (
    <label class="cz-tier-workspace__scope">
      <span class="cz-tier-workspace__scope-label">Package Family</span>
      <select
        class="cz-tier-workspace__scope-select"
        value={selectedId ?? ''}
        onChange={(event) => onSelect((event.currentTarget as HTMLSelectElement).value)}
      >
        {/* Placeholder for the initial no-scope state; disabled so it can never
            be chosen back to once a real Family is selected. */}
        <option value="" disabled>Select a Package Family…</option>
        {families.map((family) => (
          <option key={family.id} value={family.id}>
            {family.description ? `${family.name} — ${family.description}` : family.name}
          </option>
        ))}
      </select>
    </label>
  );
}
