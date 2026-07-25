// Package-owned Tier Workspace. Family scope resolves through the explicit
// assignment ledger; the instance panel remains available for direct operation
// of valid unassigned instances without presenting them as Family-owned.

import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { TemplateKitProps } from '@/station-manager/registry/templateKits';
import { CategoryGroupCardGrid } from '@/admin-station/presentation/category-groups/CategoryGroupCardGrid';
import type { PackageTierWorkspaceTool } from '../../surface/packageTierWorkspace/usePackageTierWorkspace';
import {
  encodeTierDrawerRecordId,
  encodeTierSlotDrawerRecordId,
} from '../../drawer/tier/tierDrawerTypes';
import { EMPTY_TIER_DECK } from '../../surface/packageTierWorkspace/deck';
import { tierSlotStates } from '../../surface/tierInstance/tierInstanceModel';
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
  const [navigationAnnouncement, setNavigationAnnouncement] = useState('');
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const lowerDeckRef = useRef<HTMLDivElement | null>(null);
  const observedOpenRevision = useRef(0);

  const occupants = tool?.occupants ?? [];
  const slots = tool?.slots ?? [];
  const instanceId = tool?.workspaceInstance?.tier_instance_id ?? null;
  const selectedSlot = useMemo(
    () => instanceId === null
      ? null
      : slots.find((slot) => slot.slotId === selectedSlotId) ?? slots[0] ?? null,
    [instanceId, selectedSlotId, slots],
  );

  const focusWorkspace = (announcement: string) => {
    setNavigationAnnouncement(announcement);
    window.requestAnimationFrame(() => {
      const target = workspaceRef.current;
      if (!target) return;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      target.focus({ preventScroll: true });
    });
  };

  const openTierSettings = () => {
    setDeckTab('settings');
    window.requestAnimationFrame(() => {
      lowerDeckRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      });
      lowerDeckRef.current?.focus({ preventScroll: true });
    });
  };

  const manageInstance = (targetInstanceId: string) => {
    if (!tool) return;
    const instance = tool.tierInstances.instances.find((candidate) =>
      candidate.tier_instance_id === targetInstanceId,
    );
    const row = tool.tierInstances.rows.find((candidate) => candidate.instanceId === targetInstanceId);
    const preferredSlot = instance
      ? tierSlotStates(instance).find((slot) => slot.occupied)?.slotId ?? 'basic'
      : 'basic';
    tool.tierInstances.selectInstance(targetInstanceId);
    setViewMode('focus');
    setSelectedSlotId(preferredSlot);
    setDeckTab('details');
    focusWorkspace(
      `Managing ${instance?.title ?? 'Tier system'}, ${row?.consumerName ?? 'Unassigned'}. ${row?.occupantCount ?? 0} of 5 Tiers configured.`,
    );
  };

  const dispatchExplicitTierIntent = (
    targetInstanceId: string,
    slotId: string,
    occupantId: string | null,
    actionId: 'view' | 'edit',
  ) => {
    if (!tool) return;
    tool.tierInstances.selectInstance(targetInstanceId);
    setViewMode('focus');
    setSelectedSlotId(slotId);
    const recordId = occupantId
      ? encodeTierDrawerRecordId(targetInstanceId, occupantId)
      : encodeTierSlotDrawerRecordId(targetInstanceId, slotId);
    onIntent(recordId, actionId);
  };

  // Family-drawer and post-create hand-offs must remain visible even when the
  // requested instance was already selected. Identity selection alone is not a
  // navigation affordance.
  useEffect(() => {
    if (!tool) return;
    const revision = tool.tierInstances.openRequestRevision;
    if (revision === 0 || revision === observedOpenRevision.current) return;
    observedOpenRevision.current = revision;
    const requestedId = tool.tierInstances.selectedInstanceId;
    if (requestedId) manageInstance(requestedId);
    // manageInstance intentionally reads the current model at the hand-off edge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool?.tierInstances.openRequestRevision, tool?.tierInstances.selectedInstanceId]);

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
    <div ref={workspaceRef} class="cz-tier-workspace" tabIndex={-1}>
      <p class="cz-station-visually-hidden" aria-live="polite">{navigationAnnouncement}</p>
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
          {instanceId === null && tool.selectedFamily ? (
            <section class="cz-tier-workspace__detail cz-tier-workspace__no-system" aria-labelledby="no-tier-system-heading">
              <div class="cz-tier-workspace__empty-focus">
                <div class="cz-tier-workspace__empty-copy">
                  <h4 id="no-tier-system-heading">No Tier system assigned</h4>
                  <p><strong>{tool.selectedFamily.name}</strong> is complete without tiers. Assign a Tier system only when this Family needs customer Tier choices.</p>
                </div>
                <button
                  type="button"
                  class="cz-tier-deck__button cz-tier-deck__button--primary"
                  onClick={openTierSettings}
                >
                  Set up Tier pricing
                </button>
              </div>
            </section>
          ) : showGrid ? (
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
                  onOpenSettings={openTierSettings}
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

      {(tool.selectedFamily !== null || tool.workspaceInstance !== null) && (
        <div ref={lowerDeckRef} tabIndex={-1}>
        <TierLowerDeck
          familyName={contextName}
          tierName={selectedSlot?.item?.name ?? (selectedSlot ? `${selectedSlot.label} Tier` : 'Tier setup')}
          deck={selectedSlot?.item ? tool.decks[selectedSlot.item.id] ?? EMPTY_TIER_DECK : EMPTY_TIER_DECK}
          activeTab={deckTab}
          hasFocusedTier={selectedSlot?.item !== null && selectedSlot !== null}
          tierTool={tool.tierInstances}
          family={tool.selectedFamily}
          assignedInstance={tool.assignedInstance}
          workspaceInstance={tool.workspaceInstance}
          rateSheets={tool.rateSheets}
          rateSheetInventory={tool.rateSheetInventory}
          settingsLoading={tool.settingsLoading}
          settingsError={tool.settingsError}
          onIntent={(actionId) => {
            if (selectedSlot) dispatchTierIntent(selectedSlot.slotId, selectedSlot.occupantId, actionId);
          }}
          onToolIntent={(actionId) => onIntent(
            actionId === 'create-package-family' ? 'new' : tool.selectedFamily?.id ?? instanceId ?? 'new',
            actionId,
          )}
          onManageInstance={manageInstance}
          onTierAction={dispatchExplicitTierIntent}
          onTabChange={setDeckTab}
        />
        </div>
      )}
    </div>
  );
}
