// Package Station Tier tool — the Tier Workspace Engine kit (orchestrator).
//
// One cohesive Station-level engine, composed from three small owned pieces:
//
//   Tier Workspace Engine
//   ├── header intro       (the wall title carries the name; this is its blurb)
//   ├── Row 1: Tier grid   (the selected Family's projected occupants, full width)
//   └── Row 2: split
//       ├── PackageFamilySummary     (read-only working scope — left, wider)
//       └── PackageFamilyNavigation  (the real Family selector — right, narrower)
//
// A template kit like any other (it receives a collection + an intent dispatcher
// and fetches nothing), but a STATEFUL one: it owns the selected Package Family,
// exactly as the Service Catalogue kit owns its filters. That selection is
// transient view state — switching it re-reads the already-loaded projection and
// writes NOTHING. It is working scope, never tool ownership and never Tier
// persistence.
//
//   select a Package Family (Row 2, right)
//     → its authoritative summary (Row 2, left)
//       → the Tier occupants connected to it (Row 1 cards)
//         → View / Edit dispatches the occupant_id to the mature Tier drawer
//
// The data source (usePackageTierWorkspace) supplies every Family with its
// occupants already projected, so this kit holds one piece of state and no
// business logic. Each card carries the occupant's own `occupant_id`; this kit
// forwards it untouched, so the drawer resolves the correct Package Station slot.

import { useMemo, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { TemplateKitProps } from '../templateKits';
import type { PackageTierWorkspaceFamily } from '../../stations/packageTierWorkspace/projection';
import { CategoryGroupCardGrid } from '../category-groups/CategoryGroupCardGrid';
import { PackageFamilySummary } from './PackageFamilySummary';
import { PackageFamilyNavigation } from './PackageFamilyNavigation';

// The engine's own copy. The wall title ("Tier Workspace Engine") is the
// heading; this is the concise Station-level description beneath it.
const ENGINE_DESCRIPTION = 'Station-level workspace for previewing and managing package tiers.';

// The product's exact empty-state copy: one before a Family is chosen (for the
// Tier row and the summary side), and one for a chosen Family that projects no
// Tier occupants.
const NO_FAMILY_TIERS_MESSAGE   = 'Select a Package Family to view its Tier configuration.';
const NO_TIERS_MESSAGE          = 'No Tier selections are currently available for this Package Family.';
const NO_FAMILY_SUMMARY_MESSAGE = 'Select a Package Family to see its working scope.';

export function PackageTierWorkspace({ items, loading, error, onIntent }: TemplateKitProps): VNode {
  // The registry widens items to unknown[]; the binding guarantees the paired
  // source supplies the Family projection, which this kit narrows.
  const families = items as PackageTierWorkspaceFamily[];
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);

  // Re-resolve the selection from the CURRENT items each render, so a targeted
  // refresh (new items after a Tier save) keeps the same Family in scope without
  // storing a stale copy — and a Family that has disappeared falls back to none.
  const selected = useMemo(
    () => families.find((family) => family.id === selectedFamilyId) ?? null,
    [families, selectedFamilyId],
  );

  if (loading) {
    return <p class="cz-station-empty" aria-busy="true">Loading the Tier Workspace Engine…</p>;
  }
  if (error) {
    return <p class="cz-station-empty" role="alert">{error}</p>;
  }

  return (
    <div class="cz-tier-workspace">
      <p class="cz-tier-workspace__intro">{ENGINE_DESCRIPTION}</p>

      {/* Row 1 — the selected Family's projected Tier occupants, full width,
          through the shared card grid and the mature Tier-occupant card. */}
      {selected === null ? (
        <p class="cz-station-empty">{NO_FAMILY_TIERS_MESSAGE}</p>
      ) : (
        <CategoryGroupCardGrid
          items={selected.occupants}
          onAction={(event) => onIntent(event.cardId, event.actionId)}
          emptyMessage={NO_TIERS_MESSAGE}
        />
      )}

      {/* Row 2 — read-only Family summary beside the Family selector. */}
      <div class="cz-tier-workspace__split">
        {selected === null ? (
          <p class="cz-station-empty cz-tier-workspace__summary-empty">{NO_FAMILY_SUMMARY_MESSAGE}</p>
        ) : (
          <PackageFamilySummary family={selected} />
        )}
        <PackageFamilyNavigation
          families={families}
          selectedId={selectedFamilyId}
          onSelect={setSelectedFamilyId}
        />
      </div>
    </div>
  );
}
