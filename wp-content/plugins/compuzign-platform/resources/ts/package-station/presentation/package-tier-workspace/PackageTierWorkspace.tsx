// Package-owned Tier Workspace. Family scope resolves through the explicit
// assignment ledger; the instance panel remains available for direct operation
// of valid unassigned instances without presenting them as Family-owned.

import { useMemo, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { TemplateKitProps } from '@/station-manager/registry/templateKits';
import type { CategoryGroupCardItem } from '@/admin-station/presentation/category-groups/types';
import { CategoryGroupCardGrid } from '@/admin-station/presentation/category-groups/CategoryGroupCardGrid';
import type { PackageTierWorkspaceTool } from '../../surface/packageTierWorkspace/usePackageTierWorkspace';
import { encodeTierDrawerRecordId } from '../../drawer/tier/tierDrawerTypes';
import { EMPTY_TIER_DECK } from '../../surface/packageTierWorkspace/deck';
import { PackageFamilyScope } from './PackageFamilyScope';
import { PackageFamilySummary } from './PackageFamilySummary';
import { TierInstancePanel } from './TierInstancePanel';
import { TierNavigation } from './TierNavigation';
import { TierDetailPanel } from './TierDetailPanel';
import { TierLowerDeck } from './TierLowerDeck';

const ENGINE_DESCRIPTION = 'Package-owned workspace for managing independent Tier capability instances.';
const NO_FAMILY_MESSAGE = 'Create a Package Family to organise Services and optionally add Tier capability.';
const NO_CAPABILITY_MESSAGE = 'This Package Family does not use the Tier capability.';
const NO_TIERS_MESSAGE = 'No Tier selections are currently available for this Package Family.';
const NO_INSTANCE_OCCUPANTS_MESSAGE = 'This Tier instance has no configured occupants.';
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
  const instanceId = tool?.workspaceInstance?.tier_instance_id ?? null;
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

  if (tool.families.length === 0) {
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

  const noFamilyCapability = tool.selectedFamily !== null && tool.assignedInstance === null;
  const contextName = tool.selectedFamily?.name
    ?? (tool.workspaceInstance ? `Unassigned · ${tool.workspaceInstance.title}` : 'Unassigned');
  const emptyTierMessage = tool.selectedFamily ? NO_TIERS_MESSAGE : NO_INSTANCE_OCCUPANTS_MESSAGE;

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
          {noFamilyCapability ? (
            <div class="cz-station-empty">
              <p>{NO_CAPABILITY_MESSAGE}</p>
              <button
                type="button"
                class="button button-primary"
                disabled={tool.tierInstances.saving}
                onClick={() => { void tool.addTierCapability(); }}
              >
                Add Tier capability
              </button>
            </div>
          ) : instanceId === null ? (
            <p class="cz-station-empty">Select a Package Family or Tier instance.</p>
          ) : occupants.length === 0 ? (
            <p class="cz-station-empty">{emptyTierMessage}</p>
          ) : viewMode === 'grid' ? (
            <CategoryGroupCardGrid
              items={occupants}
              onAction={(event) => dispatchTierIntent(event.cardId, event.actionId)}
              emptyMessage={emptyTierMessage}
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

        <aside class="cz-tier-workspace__family" aria-label="Package Family working scope">
          <PackageFamilyScope
            families={tool.families}
            selectedId={tool.selectedFamily?.id ?? null}
            onSelect={tool.selectFamily}
          />
          {tool.selectedFamily ? (
            <PackageFamilySummary family={tool.selectedFamily} />
          ) : (
            <p class="cz-station-empty">
              Direct instance management. This instance is not being presented as a Family capability.
            </p>
          )}
        </aside>
      </div>

      <TierInstancePanel tool={tool.tierInstances} rateSheets={tool.rateSheets} />

      {instanceId !== null && selectedTier !== null && (
        <TierLowerDeck
          familyName={contextName}
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
