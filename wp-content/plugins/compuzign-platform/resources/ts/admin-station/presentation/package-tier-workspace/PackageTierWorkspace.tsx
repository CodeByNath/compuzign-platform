// Package Station Tier tool — the Station-level Tier workspace kit.
//
// A template kit like any other (it receives a collection + an intent dispatcher
// and fetches nothing), but a STATEFUL one: it owns the selected Package Family,
// exactly as the Service Catalogue kit owns its filters. That selection is
// transient view state — switching it re-reads the already-loaded projection and
// writes NOTHING. It is working scope, never tool ownership and never Tier
// persistence.
//
//   select a Package Family
//     → its authoritative summary (Services / Rate Sheet rows / Tier selections)
//       → the Tier occupants connected to it (the projected cards)
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
import { StationStatusPill } from '../StationStatusPill';
import { StationMetricBlock } from '../StationMetricBlock';
import { ServicesIcon, RateSheetIcon, TiersIcon } from '../../shell/icons';

// The two empty states are the product's exact copy: one before a Family is
// chosen, one for a chosen Family that projects no Tier occupants.
const NO_FAMILY_MESSAGE = 'Select a Package Family to view its Tier configuration.';
const NO_TIERS_MESSAGE  = 'No Tier selections are currently available for this Package Family.';

/** The selected-Family summary — authoritative counts, shown as-is. */
function FamilyScopeSummary({ family }: { family: PackageTierWorkspaceFamily }): VNode {
  return (
    <section class="cz-tier-workspace__summary" aria-label={`${family.name} working scope`}>
      <header class="cz-tier-workspace__summary-head">
        <div class="cz-tier-workspace__summary-identity">
          <h4 class="cz-tier-workspace__summary-name">{family.name}</h4>
          {family.description && (
            <p class="cz-tier-workspace__summary-kind">{family.description}</p>
          )}
        </div>
        <StationStatusPill status={family.status} />
      </header>
      <div class="cz-tier-workspace__summary-metrics">
        <StationMetricBlock
          metric={{ id: 'services', label: 'Connected Services', value: family.dependents.services, icon: ServicesIcon }}
        />
        <StationMetricBlock
          metric={{ id: 'rate-sheet-rows', label: 'Rate Sheet rows', value: family.dependents.rate_sheet_rows, icon: RateSheetIcon }}
        />
        <StationMetricBlock
          metric={{ id: 'tier-selections', label: 'Tier selections', value: family.dependents.tier_selections, icon: TiersIcon }}
        />
      </div>
    </section>
  );
}

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
    return <p class="cz-station-empty" aria-busy="true">Loading the Tier tool…</p>;
  }
  if (error) {
    return <p class="cz-station-empty" role="alert">{error}</p>;
  }

  return (
    <div class="cz-tier-workspace">
      <div class="cz-tier-workspace__bar">
        <label class="cz-tier-workspace__selector">
          <span class="cz-tier-workspace__selector-label">Package Family</span>
          <select
            class="cz-tier-workspace__select"
            value={selectedFamilyId ?? ''}
            onChange={(event) => {
              const value = (event.currentTarget as HTMLSelectElement).value;
              setSelectedFamilyId(value === '' ? null : value);
            }}
          >
            <option value="">Select a Package Family…</option>
            {families.map((family) => (
              <option key={family.id} value={family.id}>
                {family.description ? `${family.name} — ${family.description}` : family.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selected === null ? (
        <p class="cz-station-empty">{NO_FAMILY_MESSAGE}</p>
      ) : (
        <>
          <FamilyScopeSummary family={selected} />
          <CategoryGroupCardGrid
            items={selected.occupants}
            onAction={(event) => onIntent(event.cardId, event.actionId)}
            emptyMessage={NO_TIERS_MESSAGE}
          />
        </>
      )}
    </div>
  );
}
