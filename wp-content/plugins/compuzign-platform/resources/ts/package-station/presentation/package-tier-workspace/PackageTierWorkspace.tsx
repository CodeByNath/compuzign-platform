// Package-owned Tier Workspace Engine. Phase 5 selects an independent Tier
// instance first, then reuses the existing Focus/Grid engine, lower deck, and
// registered Tier drawer for that instance's occupants.

import { useMemo, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { TemplateKitProps } from '@/station-manager/registry/templateKits';
import type { CategoryGroupCardItem } from '@/admin-station/presentation/category-groups/types';
import { CategoryGroupCardGrid } from '@/admin-station/presentation/category-groups/CategoryGroupCardGrid';
import type { PackageTierWorkspaceTool } from '../../surface/packageTierWorkspace/usePackageTierWorkspace';
import { encodeTierDrawerRecordId } from '../../drawer/tier/tierDrawerTypes';
import { EMPTY_TIER_DECK } from '../../surface/packageTierWorkspace/deck';
import { TierInstancePanel } from './TierInstancePanel';
import { TierNavigation } from './TierNavigation';
import { TierDetailPanel } from './TierDetailPanel';
import { TierLowerDeck } from './TierLowerDeck';

const ENGINE_DESCRIPTION = 'Package-owned workspace for managing independent Tier capability instances.';
const NO_INSTANCES_MESSAGE = 'No Tier instances exist yet. Create one to configure the Tier capability.';
const NO_FAMILY_MESSAGE = 'Create a Package Family to organise Services and optionally add Tier capability.';
const NO_TIERS_MESSAGE = 'This Tier instance has no configured occupants. Its five fixed slots remain available in the instance panel.';
type ViewMode = 'focus' | 'grid';

export function PackageTierWorkspace({ items, loading, error, onIntent }: TemplateKitProps): VNode {
  const tool = (items as PackageTierWorkspaceTool[])[0] ?? null;
  const [selectedTierId, setSelectedTierId] = useState<CategoryGroupCardItem['id'] | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('focus');

  const occupants = tool?.occupants ?? [];
  const selectedTier = useMemo(
    () => occupants.find((occupant) => occupant.id === selectedTierId) ?? occupants[0] ?? null,
    [occupants, selectedTierId],
  );
  const instanceId = tool?.tierInstances.selectedInstanceId ?? null;
  const dispatchTierIntent = (occupantId: CategoryGroupCardItem['id'], actionId: string) => {
    if (instanceId === null || typeof occupantId !== 'string') return;
    onIntent(encodeTierDrawerRecordId(instanceId, occupantId), actionId);
  };

  if (loading || !tool) {
    return <p class="cz-station-empty" aria-busy="true">Loading the Tier Workspace Engine…</p>;
  }
  if (error) {
    return <p class="cz-station-empty" role="alert">{error}</p>;
  }

  const currentFamilies = tool.tierInstances.families.filter((family) =>
    family.platform_status !== 'archived' && family.platform_status !== 'trashed',
  );

  if (currentFamilies.length === 0) {
    return (
      <div class="cz-tier-workspace">
        <div class="cz-tier-workspace__header">
          <p class="cz-tier-workspace__intro">{ENGINE_DESCRIPTION}</p>
        </div>
        <div class="cz-tier-workspace__primary">
          <p class="cz-station-empty">{NO_FAMILY_MESSAGE}</p>
          <button type="button" class="button button-primary" onClick={() => onIntent('new', 'create-package-family')}>
            Create Package Family
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="cz-tier-workspace">
      <div class="cz-tier-workspace__header">
        <p class="cz-tier-workspace__intro">{ENGINE_DESCRIPTION}</p>
        {instanceId !== null && occupants.length > 0 && (
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

      <div class="cz-tier-workspace__layout">
        <div class="cz-tier-workspace__primary">
          {instanceId === null ? (
            <p class="cz-station-empty">{NO_INSTANCES_MESSAGE}</p>
          ) : occupants.length === 0 ? (
            <p class="cz-station-empty">{NO_TIERS_MESSAGE}</p>
          ) : viewMode === 'grid' ? (
            <CategoryGroupCardGrid
              items={occupants}
              onAction={(event) => dispatchTierIntent(event.cardId, event.actionId)}
              emptyMessage={NO_TIERS_MESSAGE}
            />
          ) : (
            <div class="cz-tier-workspace__focus">
              <TierNavigation
                items={occupants}
                selectedId={selectedTier?.id ?? null}
                onSelect={setSelectedTierId}
              />
              {selectedTier && (
                <TierDetailPanel
                  item={selectedTier}
                  onAction={(actionId) => dispatchTierIntent(selectedTier.id, actionId)}
                />
              )}
            </div>
          )}
        </div>

        <TierInstancePanel tool={tool.tierInstances} rateSheets={tool.rateSheets} />
      </div>

      {instanceId !== null && selectedTier !== null && (
        <TierLowerDeck
          familyName={tool.tierInstances.rows.find((row) => row.instanceId === instanceId)?.consumerName ?? 'Unassigned'}
          tierName={selectedTier.name}
          deck={tool.decks[selectedTier.id] ?? EMPTY_TIER_DECK}
          onIntent={(actionId) => actionId === 'create-package-family'
            ? onIntent('new', actionId)
            : dispatchTierIntent(selectedTier.id, actionId)}
        />
      )}
    </div>
  );
}
