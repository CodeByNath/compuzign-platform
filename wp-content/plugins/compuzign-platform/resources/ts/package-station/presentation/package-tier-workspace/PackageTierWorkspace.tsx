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
  encodeTierInstanceDrawerRecordId,
  encodeTierRegistrationRecordId,
  encodeTierSlotDrawerRecordId,
} from '../../drawer/tier/tierDrawerTypes';
import { encodeTierInclusionDrawerRecordId } from '../../drawer/inclusion/tierInclusionDrawerTypes';
import { encodeTierCustomerPolicyDrawerRecordId } from '../../drawer/customerPolicy/tierCustomerPolicyDrawerTypes';
import {
  encodeTierRateSheetDrawerRecordId,
  encodeTierRateSheetGroupDrawerRecordId,
} from '../../drawer/tier-rate-sheet/tierRateSheetDrawerTypes';
import { EMPTY_TIER_DECK } from '../../surface/packageTierWorkspace/deck';
import { filterWorkspaceTierSlots, type TierListFilter } from '../../surface/packageTierWorkspace/projection';
import type { ConnectionTarget } from '../../surface/packageTierWorkspace/connectionNavigation';
import { tierSlotStates } from '../../surface/tierInstance/tierInstanceModel';
import { COMPOSABLE_TIER_ID } from '../../vocabulary';
import { PackageFamilyScope } from './PackageFamilyScope';
import { PackageFamilySummary } from './PackageFamilySummary';
import { TierNavigation } from './TierNavigation';
import { TierDetailPanel } from './TierDetailPanel';
import { TierComposableMiddleShell } from './TierComposableMiddleShell';
import { TierLowerDeck, type DeckTab } from './TierLowerDeck';
import type { PoolSubject } from './TierSystemSettings';

const ENGINE_DESCRIPTION = 'Package-owned workspace for managing independent Tier capability instances.';
const NO_FAMILY_MESSAGE = 'Create a Package Family to organise Services and optionally add Tier capability.';
type ViewMode = 'focus' | 'grid';

export function PackageTierWorkspace({ items, loading, error, onIntent }: TemplateKitProps): VNode {
  const tool = (items as PackageTierWorkspaceTool[])[0] ?? null;
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<TierListFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('focus');
  const [deckTab, setDeckTab] = useState<DeckTab>('details');
  const [navigationAnnouncement, setNavigationAnnouncement] = useState('');
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const lowerDeckRef = useRef<HTMLDivElement | null>(null);
  const observedOpenRevision = useRef(0);

  const occupants = tool?.occupants ?? [];
  const slots = tool?.slots ?? [];
  const visibleSlots = useMemo(() => filterWorkspaceTierSlots(slots, tierFilter), [slots, tierFilter]);
  const instanceId = tool?.workspaceInstance?.tier_instance_id ?? null;
  // The composable occupant's own sixth tab, addressed by the same sentinel
  // dispatchTierIntent already uses elsewhere in this file — never a member
  // of `slots`/`visibleSlots`, so it can never affect the Tiers/Add-ons
  // filter or "N of 5" counts above it.
  const isComposableFocused = selectedSlotId === COMPOSABLE_TIER_ID;
  // The same "selected, or the first available" pattern the unfiltered list
  // always used — narrowed to the currently visible slots, so a filter change
  // keeps the current selection when it remains visible and otherwise falls
  // back to the first visible occupant instead of an occupant the filter hid.
  const selectedSlot = useMemo(
    () => instanceId === null || isComposableFocused
      ? null
      : visibleSlots.find((slot) => slot.slotId === selectedSlotId) ?? visibleSlots[0] ?? null,
    [instanceId, isComposableFocused, selectedSlotId, visibleSlots],
  );
  // The one slot actually on screen right now, normal or composable — every
  // lower-deck/Connections/Details dispatcher below reads through this alone
  // rather than re-branching on isComposableFocused itself.
  const focusedSlot = isComposableFocused ? tool?.composableOccupant ?? null : selectedSlot;

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

  // The composable occupant's own Customer Options action opens the
  // standalone Customer Selection Rules drawer — a sibling of the Tier
  // drawer, addressed by tier_instance_id alone (there is at most one
  // composable occupant per instance).
  const dispatchCustomerPolicyIntent = () => {
    if (instanceId === null) return;
    onIntent(encodeTierCustomerPolicyDrawerRecordId(instanceId), 'customer-options');
  };

  // A Details-lane row addresses one inclusion inside the focused slot. The slot
  // — not the occupant — is the address, because the slot is the key the Tier's
  // features module already mutates; the row supplies its own item_id.
  const dispatchInclusionIntent = (slotId: string, itemId: string, actionId: 'view' | 'edit') => {
    if (instanceId === null) return;
    onIntent(
      encodeTierInclusionDrawerRecordId(instanceId, slotId, itemId),
      actionId === 'edit' ? 'edit-inclusion' : 'view-inclusion',
    );
  };

  // The Connections lane addresses what the focused Tier is connected TO. Each
  // dispatcher forwards the connected record's OWN stored id and routes to the
  // drawer that owns it — the mature Package Family drawer, or the Tier-scoped
  // Rate Sheet drawers. None of them re-opens the Tier drawer, and none of them
  // disturbs the focused Family or slot, so the workspace is unchanged when the
  // drawer closes.
  // The Settings lane launches a pool subject's own creation drawer. There is no
  // record yet, so nothing but the subject crosses this edge: the Family drawer
  // ignores the id entirely and the Rate Sheet drawer reads the whole collection.
  // Neither disturbs the focused Family or slot, and each refreshes this surface
  // through the `refetch` the host handed the drawer at dispatch.
  // Registering a Tier system is the same atomic creation wherever it starts. The
  // engine already knows which Family the user is looking at, so it hands that id
  // over to be pre-selected; Settings hands over none, because it pre-selects
  // nothing from whatever happens to be focused above it. Neither is a different
  // level of the workflow — the drawer performs one creation either way.
  const dispatchTierRegistration = (familyId: string | null) => {
    onIntent(encodeTierRegistrationRecordId(familyId), 'register-tier');
  };

  const dispatchPoolIntent = (subject: PoolSubject) => {
    if (subject === 'tier') {
      dispatchTierRegistration(null);
      return;
    }
    onIntent('new', subject === 'family' ? 'create-package-family' : 'create-rate-sheet');
  };

  // The whole-instance address. The action travels with it: a Tier Group row
  // offers View and Edit like every other record row, and the binding's `tier`
  // drawer declares both modes, so forwarding the id alone would silently open
  // Edit readable.
  const dispatchTierInstanceIntent = (targetInstanceId: string, actionId: string = 'view') => {
    onIntent(encodeTierInstanceDrawerRecordId(targetInstanceId), actionId);
  };

  const dispatchConnectionIntent = (target: ConnectionTarget, actionId: 'view' | 'edit') => {
    if (target.kind === 'package-family') {
      onIntent(target.familyId, actionId === 'edit' ? 'edit-family' : 'view-family');
      return;
    }
    // A parent Tier Group addresses the whole system, so it resolves through the
    // instance dispatcher above and needs no focused slot — it must therefore
    // settle before the slot-scoped guard, exactly as the Family target does.
    if (target.kind === 'tier-instance') {
      dispatchTierInstanceIntent(target.instanceId, actionId);
      return;
    }
    if (target.kind === 'standalone-rate-sheet') {
      if (target.platformId && target.rateSheetId) onIntent(target.rateSheetId, actionId === 'edit' ? 'edit-rate-sheet' : 'view-rate-sheet');
      return;
    }
    // The composable occupant's own focused view reuses this exact Connections
    // lane (Admin UX restructuring), so it addresses through `focusedSlot`
    // here too, not the five-slot-only `selectedSlot`.
    if (instanceId === null || focusedSlot === null) return;
    if (target.kind === 'rate-sheet-group') {
      onIntent(
        encodeTierRateSheetGroupDrawerRecordId(
          instanceId,
          focusedSlot.slotId,
          target.rateSheetId,
          target.groupId,
        ),
        actionId === 'edit' ? 'edit-connected-group' : 'view-connected-group',
      );
      return;
    }
    onIntent(
      encodeTierRateSheetDrawerRecordId(instanceId, focusedSlot.slotId, target.rateSheetId),
      actionId === 'edit' ? 'edit-connected-rate-sheet' : 'view-connected-rate-sheet',
    );
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
                  onClick={() => dispatchTierRegistration(tool.selectedFamily?.id ?? null)}
                >
                  Register a Tier system
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
                slots={visibleSlots}
                selectedId={focusedSlot?.slotId ?? null}
                onSelect={setSelectedSlotId}
                filter={tierFilter}
                onFilterChange={setTierFilter}
                composableSlot={tool.composableOccupant}
              />
              {isComposableFocused ? (
                tool.composableOccupant && (
                  <TierDetailPanel
                    slot={tool.composableOccupant}
                    familyName={tool.selectedFamily?.name ?? null}
                    hasInstance
                    isSubordinate
                    onAction={(actionId) => actionId === 'customer-options'
                      ? dispatchCustomerPolicyIntent()
                      : dispatchTierIntent(
                          COMPOSABLE_TIER_ID,
                          tool.composableOccupant?.occupantId ?? null,
                          actionId,
                        )}
                    onOpenSettings={openTierSettings}
                  />
                )
              ) : selectedSlot && (
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
            <PackageFamilySummary family={tool.selectedFamily} composition={tool.familyComposition} />
          ) : (
            <p class="cz-station-empty">
              Direct instance management. This instance is not being presented as a Family capability.
            </p>
          )}
        </aside>
      </div>

      {/* Grid view has no tab strip to host the composable occupant's own
          sixth destination (Focus view's TierNavigation, above, does), so it
          keeps this always-visible box exactly as before — never one of the
          five `slots`, "N of 5"/Family "Tiers 5" stay unchanged. Focus view
          no longer duplicates it here: selecting its tab shows the same
          panel in the primary focus area instead, per the Admin UX
          restructuring — see docs/code-map/tier-composable-occupant-admin-ui.md. */}
      {viewMode === 'grid' && tool.composableOccupant && (
        <div class="cz-tier-workspace__composable">
          <p class="cz-tier-workspace__panel-label">
            Composable occupant — subordinate to this Tier system, not one of the 5 Tiers
          </p>
          <TierDetailPanel
            slot={tool.composableOccupant}
            familyName={tool.selectedFamily?.name ?? null}
            hasInstance
            isSubordinate
            onAction={(actionId) => actionId === 'customer-options'
              ? dispatchCustomerPolicyIntent()
              : dispatchTierIntent(
                  COMPOSABLE_TIER_ID,
                  tool.composableOccupant?.occupantId ?? null,
                  actionId,
                )}
            onOpenSettings={openTierSettings}
          />
        </div>
      )}

      {/* Composable-only middle shell — hidden for every normal Tier, mounted
          only while Focus view has the composable occupant's own tab
          selected and it is published (an unpublished/absent occupant has no
          deck/customer_policy to summarize; TierDetailPanel's own empty
          state above already covers that case). */}
      {viewMode === 'focus' && isComposableFocused && tool.composableOccupant?.item && (
        <TierComposableMiddleShell
          deck={tool.decks[tool.composableOccupant.item.id] ?? EMPTY_TIER_DECK}
          policy={tool.composableOccupant.customerPolicy}
          onManageCustomerOptions={dispatchCustomerPolicyIntent}
        />
      )}

      {(tool.selectedFamily !== null || tool.workspaceInstance !== null) && (
        <div ref={lowerDeckRef} tabIndex={-1}>
        <TierLowerDeck
          familyName={contextName}
          family={tool.selectedFamily}
          familyComposition={tool.familyComposition}
          families={tool.families}
          tierName={focusedSlot?.item?.name ?? (focusedSlot ? `${focusedSlot.label} Tier` : 'Tier setup')}
          deck={focusedSlot?.item ? tool.decks[focusedSlot.item.id] ?? EMPTY_TIER_DECK : EMPTY_TIER_DECK}
          connectionNavigation={focusedSlot?.occupantId
            ? tool.connectionNavigation[focusedSlot.occupantId] ?? tool.emptyConnectionNavigation
            : tool.emptyConnectionNavigation}
          activeTab={deckTab}
          hasFocusedTier={focusedSlot?.item !== null && focusedSlot !== null}
          connectionScopeKey={[
            tool.selectedFamily?.id ?? 'unassigned',
            instanceId ?? 'no-instance',
            focusedSlot?.slotId ?? 'no-slot',
            focusedSlot?.occupantId ?? 'empty',
          ].join(':')}
          tierTool={tool.tierInstances}
          workspaceInstance={tool.workspaceInstance}
          rateSheets={tool.rateSheets}
          settingsLoading={tool.settingsLoading}
          settingsError={tool.settingsError}
          onInclusionIntent={(itemId, actionId) => {
            if (focusedSlot) dispatchInclusionIntent(focusedSlot.slotId, itemId, actionId);
          }}
          onConnectionIntent={dispatchConnectionIntent}
          onPoolIntent={dispatchPoolIntent}
          onTabChange={setDeckTab}
        />
        </div>
      )}
    </div>
  );
}
