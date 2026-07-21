// Package Station Tier tool — the Tier Workspace Engine kit (orchestrator).
//
// One cohesive Station-level engine, composed from small owned pieces:
//
//   Tier Workspace Engine
//   ├── header
//   │   ├── PackageFamilyScope  (compact Family scope selector — working scope)
//   │   └── view switch         (Focus | Grid — a view mode, not a second tool)
//   ├── PackageFamilySummary    (optional authoritative Family metrics band)
//   └── workspace body
//       ├── Focus (default): TierNavigation (left tabs) + TierDetailPanel (right)
//       └── Grid  (optional): the shared compact card grid
//
// A template kit like any other (it receives a collection + an intent dispatcher
// and fetches nothing), but a STATEFUL one: it owns three pieces of transient
// view state — the selected Package Family, the selected Tier, and the view mode.
// Switching any of them re-reads the already-loaded projection and writes
// NOTHING. Family is working scope, never Tier ownership; the selected Tier id is
// transient UI state; `occupant_id` stays the identity dispatched to the drawer.
//
//   select a Package Family (header)
//     → its authoritative metrics band + its projected Tier occupants
//       → select a Tier (left tabs)  → its detail (right panel)
//         → View / Edit dispatches the occupant_id to the mature Tier drawer
//
// The Grid view is a VIEW MODE inside this same tool — the shared card grid over
// the same occupants, whose View/Edit dispatch the same occupant_id to the same
// drawer. It is not a second surface, drawer, or persistence.
//
// The data source (usePackageTierWorkspace) supplies every Family with its
// occupants already projected, so this kit holds its state and no business
// logic. Each card carries the occupant's own `occupant_id`; this kit forwards
// it untouched, so the drawer resolves the correct Package Station slot.

import { useMemo, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { TemplateKitProps } from '../templateKits';
import type { PackageTierWorkspaceFamily } from '../../stations/packageTierWorkspace/projection';
import type { CategoryGroupCardItem } from '../category-groups/types';
import { CategoryGroupCardGrid } from '../category-groups/CategoryGroupCardGrid';
import { PackageFamilyScope } from './PackageFamilyScope';
import { PackageFamilySummary } from './PackageFamilySummary';
import { TierNavigation } from './TierNavigation';
import { TierDetailPanel } from './TierDetailPanel';

// The engine's own copy. The wall title ("Tier Workspace Engine") is the
// heading; this is the concise Station-level description beneath it.
const ENGINE_DESCRIPTION = 'Station-level workspace for previewing and managing package tiers.';

// The product's exact empty-state copy: one before a Family is chosen, and one
// for a chosen Family that projects no Tier occupants.
const NO_FAMILY_MESSAGE = 'Select a Package Family to view its Tier configuration.';
const NO_TIERS_MESSAGE  = 'No Tier selections are currently available for this Package Family.';

/** The two view modes of the one Tier tool. Focus is the default. */
type ViewMode = 'focus' | 'grid';

export function PackageTierWorkspace({ items, loading, error, onIntent }: TemplateKitProps): VNode {
  // The registry widens items to unknown[]; the binding guarantees the paired
  // source supplies the Family projection, which this kit narrows.
  const families = items as PackageTierWorkspaceFamily[];
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<CategoryGroupCardItem['id'] | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('focus');

  // Re-resolve the Family from the CURRENT items each render, so a targeted
  // refresh (new items after a Tier save) keeps the same Family in scope without
  // storing a stale copy — and a Family that has disappeared falls back to none.
  const selectedFamily = useMemo(
    () => families.find((family) => family.id === selectedFamilyId) ?? null,
    [families, selectedFamilyId],
  );

  const occupants = selectedFamily?.occupants ?? [];

  // The selected Tier, derived — never a second source of truth. If the stored
  // id still projects under the current Family it stays selected; otherwise the
  // first projected Tier is selected automatically (the Family-change rule), and
  // an empty projection selects none. This one derivation covers Family switches
  // and targeted refreshes alike, with no effect to keep in sync.
  const selectedTier = useMemo(
    () => occupants.find((occupant) => occupant.id === selectedTierId) ?? occupants[0] ?? null,
    [occupants, selectedTierId],
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

      {/* Header — compact Family scope on the left, the Focus/Grid switch on the
          right (shown only once a Family is in scope, so it never toggles an
          empty body). */}
      <div class="cz-tier-workspace__header">
        <PackageFamilyScope
          families={families}
          selectedId={selectedFamilyId}
          onSelect={setSelectedFamilyId}
        />
        {selectedFamily !== null && occupants.length > 0 && (
          <div class="cz-tier-workspace__viewswitch" role="group" aria-label="Tier view">
            {(['focus', 'grid'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                class="cz-tier-workspace__viewswitch-option"
                aria-pressed={viewMode === mode}
                onClick={() => setViewMode(mode)}
              >
                {mode === 'focus' ? 'Focus' : 'Grid'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Optional authoritative Family metrics band, beneath the header. */}
      {selectedFamily !== null && <PackageFamilySummary family={selectedFamily} />}

      {/* Workspace body — the empty prompt, the Focus split, or the Grid. */}
      {selectedFamily === null ? (
        <p class="cz-station-empty">{NO_FAMILY_MESSAGE}</p>
      ) : occupants.length === 0 ? (
        <p class="cz-station-empty">{NO_TIERS_MESSAGE}</p>
      ) : viewMode === 'grid' ? (
        <CategoryGroupCardGrid
          items={occupants}
          onAction={(event) => onIntent(event.cardId, event.actionId)}
          emptyMessage={NO_TIERS_MESSAGE}
        />
      ) : (
        <div class="cz-tier-workspace__focus">
          <TierNavigation
            items={occupants}
            selectedId={selectedTier?.id ?? null}
            onSelect={setSelectedTierId}
          />
          {selectedTier !== null && (
            <TierDetailPanel
              item={selectedTier}
              onAction={(actionId) => onIntent(selectedTier.id, actionId)}
            />
          )}
        </div>
      )}
    </div>
  );
}
