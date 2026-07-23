// Package Station Tier tool — the Tier Workspace Engine kit (orchestrator).
//
// One cohesive Station-level engine, composed from small owned pieces:
//
//   Tier Workspace Engine
//   ├── header + view switch     (Focus | Grid — a view mode, not a second tool)
//   └── workspace body
//       ├── Focus (default)
//       │   ├── TierNavigation   (left tabs)
//       │   ├── TierDetailPanel  (one focused Tier)
//       │   └── Family group     (scope selector + authoritative summary)
//       └── Grid (optional)
//           ├── shared compact card grid
//           └── Family group     (the same transient scope)
//
// A template kit like any other (it receives a collection + an intent dispatcher
// and fetches nothing), but a STATEFUL one: it owns three pieces of transient
// view state — the selected Package Family, the selected Tier, and the view mode.
// Switching any of them re-reads the already-loaded projection and writes
// NOTHING. Family is working scope, never Tier ownership; the selected Tier id is
// transient UI state; `occupant_id` stays the identity dispatched to the drawer.
//
//   select a Package Family (right-side Family group)
//     → its authoritative summary + its projected Tier occupants
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
import type { TemplateKitProps } from '@/admin-station/presentation/templateKits';
import type { PackageTierWorkspaceFamily } from '../../surface/packageTierWorkspace/projection';
import type { CategoryGroupCardItem } from '@/admin-station/presentation/category-groups/types';
import { CategoryGroupCardGrid } from '@/admin-station/presentation/category-groups/CategoryGroupCardGrid';
import { PackageFamilyScope } from './PackageFamilyScope';
import { PackageFamilySummary } from './PackageFamilySummary';
import { TierNavigation } from './TierNavigation';
import { TierDetailPanel } from './TierDetailPanel';

// The engine's own copy. The wall title ("Tier Workspace Engine") is the
// heading; this is the concise Station-level description beneath it.
const ENGINE_DESCRIPTION = 'Station-level workspace for previewing and managing package tiers.';

// Empty-state copy: one for an empty authoritative Family read, and one for a
// Family whose projection contains no Tier occupants.
const NO_FAMILY_MESSAGE = 'No Package Families are currently available.';
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
    () => families.find((family) => family.id === selectedFamilyId) ?? families[0] ?? null,
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
      {/* Header — the wall already supplies the engine title. The view switch is
          the only engine-level control; Family selection belongs to the Family
          group in the workspace composition below. */}
      <div class="cz-tier-workspace__header">
        <p class="cz-tier-workspace__intro">{ENGINE_DESCRIPTION}</p>
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

      {/* Workspace body — Focus reads left-to-right as Tier tabs, focused Tier,
          then Family group. Grid is only another view of the same occupants and
          keeps that Family group available; neither mode changes ownership. */}
      {selectedFamily === null ? (
        <p class="cz-station-empty">{NO_FAMILY_MESSAGE}</p>
      ) : (
        <div class="cz-tier-workspace__layout">
          <div class="cz-tier-workspace__primary">
            {occupants.length === 0 ? (
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

          <aside class="cz-tier-workspace__family" aria-label="Package Family working scope">
            <PackageFamilyScope
              families={families}
              selectedId={selectedFamily.id}
              onSelect={setSelectedFamilyId}
            />
            <PackageFamilySummary family={selectedFamily} />
          </aside>
        </div>
      )}
    </div>
  );
}
