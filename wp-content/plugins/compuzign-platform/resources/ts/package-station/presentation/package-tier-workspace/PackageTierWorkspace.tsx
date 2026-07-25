// Package-owned Tier Workspace. Family scope resolves through the explicit
// assignment ledger; the instance panel remains available for direct operation
// of valid unassigned instances without presenting them as Family-owned.

import { useMemo, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { TemplateKitProps } from '@/station-manager/registry/templateKits';
import { CategoryGroupCardGrid } from '@/admin-station/presentation/category-groups/CategoryGroupCardGrid';
import type { PackageTierWorkspaceTool } from '../../surface/packageTierWorkspace/usePackageTierWorkspace';
import {
  encodeTierDrawerRecordId,
  encodeTierSlotDrawerRecordId,
} from '../../drawer/tier/tierDrawerTypes';
import { EMPTY_TIER_DECK } from '../../surface/packageTierWorkspace/deck';
import { PackageFamilyScope } from './PackageFamilyScope';
import { PackageFamilySummary } from './PackageFamilySummary';
import { TierNavigation } from './TierNavigation';
import { TierDetailPanel } from './TierDetailPanel';
import { TierLowerDeck, type DeckTab } from './TierLowerDeck';

const ENGINE_DESCRIPTION = 'Package-owned workspace for managing independent Tier capability instances.';
const NO_FAMILY_MESSAGE = 'Create a Package Family to organise Services and optionally add Tier capability.';
type ViewMode = 'focus' | 'grid';

export function PackageTierWorkspace({ items, loading, error, onIntent }: TemplateKitProps): VNode {
  const tool = (items as PackageTierWorkspaceTool[])[0] ?? null;
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('focus');
  const [deckTab, setDeckTab] = useState<DeckTab>('details');

  const occupants = tool?.occupants ?? [];
  const slots = tool?.slots ?? [];
  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.slotId === selectedSlotId) ?? slots[0] ?? null,
    [selectedSlotId, slots],
  );
  const instanceId = tool?.workspaceInstance?.tier_instance_id ?? null;
  const dispatchTierIntent = (slotId: string, occupantId: string | null, actionId: string) => {
    if (instanceId === null) return;
    const recordId = occupantId
      ? encodeTierDrawerRecordId(instanceId, occupantId)
      : encodeTierSlotDrawerRecordId(instanceId, slotId);
    onIntent(recordId, actionId);
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

  const contextName = tool.selectedFamily?.name
    ?? (tool.workspaceInstance ? `Unassigned · ${tool.workspaceInstance.title}` : 'Unassigned');
  const showGrid = instanceId !== null && occupants.length > 0 && viewMode === 'grid';

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
          {showGrid ? (
            <CategoryGroupCardGrid
              items={occupants}
              onAction={(event) => {
                const slot = slots.find((candidate) => candidate.occupantId === event.cardId);
                if (slot) dispatchTierIntent(slot.slotId, slot.occupantId, event.actionId);
              }}
              emptyMessage="No Tier occupants are configured."
            />
          ) : (
            <div class="cz-tier-workspace__focus">
              <TierNavigation
                slots={slots}
                selectedId={selectedSlot?.slotId ?? null}
                onSelect={setSelectedSlotId}
              />
              {selectedSlot && (
                <TierDetailPanel
                  slot={selectedSlot}
                  familyName={tool.selectedFamily?.name ?? null}
                  hasInstance={instanceId !== null}
                  onAction={(actionId) => dispatchTierIntent(
                    selectedSlot.slotId,
                    selectedSlot.occupantId,
                    actionId,
                  )}
                  onOpenSettings={() => setDeckTab('settings')}
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

      {(tool.selectedFamily !== null || tool.workspaceInstance !== null) && selectedSlot && (
        <TierLowerDeck
          familyName={contextName}
          tierName={selectedSlot.item?.name ?? `${selectedSlot.label} Tier`}
          deck={selectedSlot.item ? tool.decks[selectedSlot.item.id] ?? EMPTY_TIER_DECK : EMPTY_TIER_DECK}
          activeTab={deckTab}
          hasFocusedTier={selectedSlot.item !== null}
          tierTool={tool.tierInstances}
          family={tool.selectedFamily}
          assignedInstance={tool.assignedInstance}
          workspaceInstance={tool.workspaceInstance}
          rateSheets={tool.rateSheets}
          rateSheetInventory={tool.rateSheetInventory}
          settingsLoading={tool.settingsLoading}
          settingsError={tool.settingsError}
          onIntent={(actionId) => dispatchTierIntent(
            selectedSlot.slotId,
            selectedSlot.occupantId,
            actionId,
          )}
          onToolIntent={(actionId) => onIntent(
            actionId === 'create-package-family' ? 'new' : tool.selectedFamily?.id ?? instanceId ?? 'new',
            actionId,
          )}
          onTabChange={setDeckTab}
        />
      )}
    </div>
  );
}
