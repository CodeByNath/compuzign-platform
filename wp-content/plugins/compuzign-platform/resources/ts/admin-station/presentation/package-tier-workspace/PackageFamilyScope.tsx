// Tier Workspace Engine — the compact Package Family scope control.
//
// The engine's working scope at the head of the right-side Family group. A native
// <select> is the right primitive here: a single-choice transient scope switch
// with real label and keyboard semantics.
//
// Choosing a Family is transient view state owned by the orchestrator: it
// re-scopes the projected Tiers and the authoritative Family summary and writes
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
        {/* The placeholder is reachable only for an empty Family collection. */}
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
