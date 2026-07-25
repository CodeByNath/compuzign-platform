// Tier Workspace Settings — guided Tier-system setup and maintenance.
//
// FILE INDEX
//   CONTRACTS_AND_TOOL_LINKS — presentation inputs and registered tool actions.
//   TIER_SYSTEM_STATE        — current peer/assignment/slot derivation and mutations.
//   RELATIONSHIP_SETUP       — explicit create/assign/remove and setup progress.
//   ACCESS_AND_FIXED_SLOTS   — system Rate Sheet access and drawer-bound slot actions.
//   PACKAGE_TOOL_LINKS       — registered Package Manager destinations and inventory.
//   INDEPENDENT_SYSTEMS      — advanced direct management of peer Tier systems.

import { useMemo, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type {
  PackageRateSheet,
  TierInstanceSummary,
} from '../../types';
import type { WorkspaceFamilyScope } from '../../surface/packageTierWorkspace/projection';
import type { TierInstancesToolState } from '../../surface/tierInstance/useTierInstances';
import type { TierRateSheetInventoryRow } from '../../surface/tierInstance/tierInstanceModel';
import {
  suggestConsumerForInstance,
  tierSlotStates,
} from '../../surface/tierInstance/tierInstanceModel';
import { TIER_LABELS } from '../../vocabulary';
import {
  AppsIcon,
  RateSheetIcon,
  ServicesIcon,
  TiersIcon,
} from '@/admin-station/shell/icons';
import { TierRateSheetInventory } from './TierRateSheetInventory';

// ── SECTION: CONTRACTS_AND_TOOL_LINKS ─────────────────────────────────────────

interface Props {
  tool: TierInstancesToolState;
  family: WorkspaceFamilyScope | null;
  assignedInstance: TierInstanceSummary | null;
  workspaceInstance: TierInstanceSummary | null;
  rateSheets: PackageRateSheet[];
  inventory: TierRateSheetInventoryRow[];
  loading: boolean;
  error: string | null;
  onToolIntent: (actionId: string) => void;
  onManageInstance: (instanceId: string) => void;
  onTierAction: (
    instanceId: string,
    slotId: string,
    occupantId: string | null,
    actionId: 'view' | 'edit',
  ) => void;
}

interface SettingsTool {
  id: string;
  icon: typeof RateSheetIcon;
  title: string;
  body: string;
  label: string;
  actionId: string;
}

const SETTINGS_TOOLS: SettingsTool[] = [
  {
    id: 'family-groups',
    icon: ServicesIcon,
    title: 'Family Groups',
    body: 'Create and maintain Package Family working scopes.',
    label: 'Create Package Family',
    actionId: 'create-package-family',
  },
  {
    id: 'rate-sheets',
    icon: RateSheetIcon,
    title: 'Rate Sheets',
    body: 'Author the commercial pricing rows Package connections draw from.',
    label: 'Open Rate Sheet tool',
    actionId: 'rate-sheet',
  },
  {
    id: 'groups',
    icon: AppsIcon,
    title: 'Groups',
    body: 'Maintain Rate Sheet groups alongside the priced rows they organise.',
    label: 'Open Rate Sheet tool',
    actionId: 'rate-sheet',
  },
];

// ── SECTION: TIER_SYSTEM_STATE ────────────────────────────────────────────────

export function TierSystemSettings({
  tool,
  family,
  assignedInstance,
  workspaceInstance,
  rateSheets,
  inventory,
  loading,
  error,
  onToolIntent,
  onManageInstance,
  onTierAction,
}: Props): VNode {
  const [newTitle, setNewTitle] = useState('');
  const [directFamilyId, setDirectFamilyId] = useState('');
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const [createdInstanceTitle, setCreatedInstanceTitle] = useState<string | null>(null);
  const currentRecord = workspaceInstance
    ? tool.instances.find((instance) => instance.tier_instance_id === workspaceInstance.tier_instance_id) ?? null
    : null;
  const currentRow = workspaceInstance
    ? tool.rows.find((row) => row.instanceId === workspaceInstance.tier_instance_id) ?? null
    : null;
  const attachableRows = useMemo(() => tool.rows
    .filter((row) => row.consumerId === null)
    .sort((left, right) => {
      if (left.instanceId === 'ti_primary') return -1;
      if (right.instanceId === 'ti_primary') return 1;
      return right.occupantCount - left.occupantCount || left.title.localeCompare(right.title);
    }), [tool.rows]);
  const suggestedFamily = useMemo(() => currentRecord
    ? suggestConsumerForInstance(currentRecord, tool.families, tool.assignments)
    : null, [currentRecord, tool.assignments, tool.families]);
  const currentSlots = currentRecord ? tierSlotStates(currentRecord) : [];
  const configuredCount = currentSlots.filter((slot) => slot.occupied).length;
  const firstEmptySlot = currentSlots.find((slot) => !slot.occupied) ?? null;
  const firstConfiguredSlot = currentSlots.find((slot) => slot.occupied) ?? null;
  const activeRateSheets = rateSheets.filter((sheet) => sheet.status === 'active');

  const createInstance = async () => {
    const title = newTitle.trim();
    if (!title) return;
    const created = await tool.createInstance(title);
    if (created) {
      setNewTitle('');
      setCreatedInstanceTitle(created.title);
    }
  };

  const removeAssignment = async () => {
    if (!assignedInstance) return;
    const removed = await tool.unassignInstance(assignedInstance.tier_instance_id);
    if (removed) setConfirmRemoval(false);
  };

  const startNarrowAvailability = () => {
    if (!currentRecord) return;
    void tool.updateInstance(currentRecord.tier_instance_id, {
      allowed_rate_sheet_ids: rateSheets
        .filter((sheet) => sheet.status === 'active')
        .map((sheet) => sheet.rate_sheet_id),
    });
  };

  const toggleAllowedSheet = (sheetId: string) => {
    if (!currentRecord) return;
    const next = new Set(currentRecord.allowed_rate_sheet_ids);
    if (next.has(sheetId)) {
      const activeSelected = rateSheets.filter((sheet) =>
        sheet.status === 'active' && next.has(sheet.rate_sheet_id),
      );
      if (activeSelected.length <= 1) return;
      next.delete(sheetId);
    } else {
      next.add(sheetId);
    }
    void tool.updateInstance(currentRecord.tier_instance_id, {
      allowed_rate_sheet_ids: [...next],
    });
  };

  return (
    <div class="cz-tier-settings">
      {/* ── SECTION: RELATIONSHIP_SETUP ───────────────────────────────────── */}
      <section class="cz-tier-settings__section" aria-labelledby="tier-system-heading">
        <div class="cz-tier-deck__lane-head">
          <div>
            <h4 id="tier-system-heading" class="cz-tier-deck__lane-title">Tier system</h4>
            <p class="cz-tier-deck__lane-note">
              Tier instances remain independent. Adding or removing capability changes only the assignment.
            </p>
          </div>
        </div>

        {family && !assignedInstance ? (
          <div class="cz-tier-settings__callout cz-tier-settings__callout--setup">
            <span class="cz-tier-settings__callout-icon" aria-hidden="true"><TiersIcon /></span>
            <div class="cz-tier-settings__callout-copy">
              <strong>No Tier system assigned</strong>
              <span><strong>{family.name}</strong> is complete without tiers. Assign a Tier system only when this Family needs customer Tier choices.</span>
            </div>
            <div class="cz-tier-settings__setup-path">
              <ol class="cz-tier-settings__steps">
                <li><strong>Choose or create a Tier system.</strong><span>The system remains an independent Package record.</span></li>
                <li><strong>Confirm the assignment.</strong><span>Assigning connects the two records without changing either one.</span></li>
                <li><strong>Configure its Tier slots.</strong><span>Each configured Tier chooses a Rate Sheet and inclusions.</span></li>
              </ol>

              {attachableRows.length === 0 ? (
                <p class="cz-tier-settings__muted">There are no unassigned Tier systems available.</p>
              ) : (
                <div class="cz-tier-settings__attach-list" aria-label="Unassigned Tier systems">
                  {attachableRows.map((row) => (
                    <div key={row.instanceId} class="cz-tier-settings__attach-row">
                      <span>
                        <strong>{row.title}</strong>
                        <small>{row.occupantCount} configured · {row.binCount} in bin</small>
                      </span>
                      <button
                        type="button"
                        class="cz-tier-deck__button cz-tier-deck__button--secondary"
                        disabled={tool.saving}
                        onClick={() => { void tool.assignInstance(row.instanceId, family.id); }}
                      >
                        Assign to {family.name}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div class="cz-tier-settings__inline-form cz-tier-settings__inline-form--create">
                <label for="family-tier-instance-title">Create an independent Tier system</label>
                <input
                  id="family-tier-instance-title"
                  class="cz-tier-deck__control"
                  value={newTitle}
                  placeholder={`${family.name} Tiers`}
                  onInput={(event) => setNewTitle(event.currentTarget.value)}
                />
                <button
                  type="button"
                  class="cz-tier-deck__button cz-tier-deck__button--primary"
                  disabled={tool.saving || !newTitle.trim()}
                  onClick={() => { void createInstance(); }}
                >
                  Create Tier system
                </button>
                <small>Creation does not assign the new system. Confirm its assignment separately when it appears above.</small>
              </div>
              {createdInstanceTitle && (
                <p class="cz-tier-settings__success" role="status">
                  <strong>{createdInstanceTitle}</strong> was created as an independent system. Assign it to {family.name} above when ready.
                </p>
              )}
            </div>
          </div>
        ) : currentRecord && currentRow ? (
          <div class="cz-tier-settings__callout cz-tier-settings__callout--setup">
            <span class="cz-tier-settings__callout-icon" aria-hidden="true"><TiersIcon /></span>
            <div class="cz-tier-settings__callout-copy">
              <strong>{currentRecord.title}</strong>
              <span>
                {family
                  ? `${family.name} is assigned to this Tier system. The two records remain independent.`
                  : 'This Tier system is unassigned and can be configured independently.'}
              </span>
              <span class="cz-tier-settings__progress">
                {configuredCount === 0
                  ? 'Setup required · 0 of 5 Tiers configured'
                  : configuredCount === 5
                    ? 'All 5 Tiers configured'
                    : `${configuredCount} of 5 Tiers configured`}
                {currentRow.binCount > 0 ? ` · ${currentRow.binCount} in bin` : ''}
              </span>
            </div>
            <div class="cz-tier-settings__actions">
              {activeRateSheets.length === 0 ? (
                <button
                  type="button"
                  class="cz-tier-deck__button cz-tier-deck__button--primary"
                  onClick={() => onToolIntent('rate-sheet')}
                >
                  Open Rate Sheet tool
                </button>
              ) : firstEmptySlot ? (
                <button
                  type="button"
                  class="cz-tier-deck__button cz-tier-deck__button--primary"
                  onClick={() => onTierAction(currentRecord.tier_instance_id, firstEmptySlot.slotId, null, 'edit')}
                >
                  Configure {TIER_LABELS[firstEmptySlot.slotId] ?? firstEmptySlot.slotId} Tier
                </button>
              ) : firstConfiguredSlot ? (
                <button
                  type="button"
                  class="cz-tier-deck__button cz-tier-deck__button--secondary"
                  onClick={() => onManageInstance(currentRecord.tier_instance_id)}
                >
                  Review Tier workspace
                </button>
              ) : null}
              {assignedInstance && family && !confirmRemoval && (
                <button
                  type="button"
                  class="cz-tier-deck__button cz-tier-deck__button--secondary"
                  disabled={tool.saving}
                  onClick={() => setConfirmRemoval(true)}
                >
                  Remove Tier capability
                </button>
              )}
            </div>
            {assignedInstance && family && confirmRemoval && (
              <div class="cz-tier-settings__confirm" role="alertdialog" aria-modal="false" aria-label="Remove Tier assignment">
                <p>Remove <strong>{currentRecord.title}</strong> from <strong>{family.name}</strong>? This removes only their assignment. The Package Family, Tier system, and configured Tiers will not be deleted.</p>
                <button type="button" class="cz-tier-deck__button cz-tier-deck__button--secondary" onClick={() => setConfirmRemoval(false)}>Cancel</button>
                <button type="button" class="cz-tier-deck__button cz-tier-deck__button--destructive" disabled={tool.saving} onClick={() => { void removeAssignment(); }}>Remove from {family.name}</button>
              </div>
            )}
            {!family && currentRow.consumerId === null && suggestedFamily && (
              <div class="cz-tier-settings__suggestion">
                <span>Existing Tier selections suggest <strong>{suggestedFamily.label}</strong>. Confirming adds only the assignment.</span>
                <button
                  type="button"
                  class="cz-tier-deck__button cz-tier-deck__button--secondary"
                  disabled={tool.saving}
                  onClick={() => { void tool.assignInstance(currentRecord.tier_instance_id, suggestedFamily.group_id); }}
                >
                  Assign to {suggestedFamily.label}
                </button>
              </div>
            )}
            {!family && currentRow.consumerId === null && !suggestedFamily && tool.eligibleFamilies.length > 0 && (
              <div class="cz-tier-settings__inline-form">
                <label for="tier-direct-family">Add this capability to a Package Family</label>
                <select
                  id="tier-direct-family"
                  class="cz-tier-deck__control"
                  value={directFamilyId}
                  onChange={(event) => setDirectFamilyId(event.currentTarget.value)}
                >
                  <option value="">Choose Package Family</option>
                  {tool.eligibleFamilies.map((candidate) => (
                    <option key={candidate.group_id} value={candidate.group_id}>{candidate.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  class="cz-tier-deck__button cz-tier-deck__button--secondary"
                  disabled={tool.saving || !directFamilyId}
                  onClick={() => { if (directFamilyId) void tool.assignInstance(currentRecord.tier_instance_id, directFamilyId); }}
                >
                  Assign to Package Family
                </button>
              </div>
            )}
          </div>
        ) : null}

        {/* ── SECTION: ACCESS_AND_FIXED_SLOTS ─────────────────────────────── */}
        {currentRecord && (
          <div class="cz-tier-settings__configuration">
            <div>
              <h5>Rate Sheet access</h5>
              {activeRateSheets.length === 0 ? (
                <>
                  <p>A Rate Sheet is required before configuring Tier pricing and included features.</p>
                  <button type="button" class="cz-tier-deck__button cz-tier-deck__button--primary" onClick={() => onToolIntent('rate-sheet')}>
                    Open Rate Sheet tool
                  </button>
                </>
              ) : currentRecord.allowed_rate_sheet_ids.length === 0 ? (
                <>
                  <p>This Tier system can use every active Rate Sheet. Each Tier chooses its own Rate Sheet when configured.</p>
                  <button type="button" class="cz-tier-deck__button cz-tier-deck__button--secondary" disabled={tool.saving || rateSheets.filter((sheet) => sheet.status === 'active').length === 0} onClick={startNarrowAvailability}>
                    Limit Rate Sheet access
                  </button>
                </>
              ) : (
                <>
                  <p>This Tier system can use only the selected active Rate Sheets. At least one must remain available.</p>
                  <div class="cz-tier-settings__checks">
                    {rateSheets.filter((sheet) => sheet.status === 'active').map((sheet) => (
                      <label key={sheet.rate_sheet_id}>
                        <input
                          type="checkbox"
                          checked={currentRecord.allowed_rate_sheet_ids.includes(sheet.rate_sheet_id)}
                          disabled={tool.saving}
                          onChange={() => toggleAllowedSheet(sheet.rate_sheet_id)}
                        />
                        <span>{sheet.title}</span>
                      </label>
                    ))}
                  </div>
                  <button type="button" class="cz-tier-deck__button cz-tier-deck__button--secondary" disabled={tool.saving} onClick={() => { void tool.updateInstance(currentRecord.tier_instance_id, { allowed_rate_sheet_ids: [] }); }}>
                    Allow all active sheets
                  </button>
                </>
              )}
            </div>
            <div>
              <h5>Fixed Tier slots</h5>
              <ul class="cz-tier-settings__slots">
                {currentSlots.map((slot) => {
                  const occupantId = currentRecord.tiers[slot.slotId]?.current_occupant?.id ?? null;
                  return (
                  <li key={slot.slotId}>
                    <span>{TIER_LABELS[slot.slotId] ?? slot.slotId}</span>
                    <span class="cz-tier-settings__slot-action">
                      <strong>{slot.occupied ? 'Configured' : 'Empty'}</strong>
                      <button
                        type="button"
                        class="cz-tier-deck__button cz-tier-deck__button--secondary"
                        onClick={() => onTierAction(
                          currentRecord.tier_instance_id,
                          slot.slotId,
                          occupantId,
                          slot.occupied ? 'view' : 'edit',
                        )}
                      >
                        {slot.occupied ? 'View' : 'Configure'}
                      </button>
                    </span>
                  </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* ── SECTION: PACKAGE_TOOL_LINKS ───────────────────────────────────── */}
      <section class="cz-tier-settings__section" aria-labelledby="package-tools-heading">
        <div class="cz-tier-deck__lane-head">
          <div>
            <h4 id="package-tools-heading" class="cz-tier-deck__lane-title">Package Manager tools</h4>
            <p class="cz-tier-deck__lane-note">Create and maintain Package-owned records in their existing tools.</p>
          </div>
        </div>
        <div class="cz-tier-deck__tools">
          {SETTINGS_TOOLS.map((entry) => {
            const Icon = entry.icon;
            return (
              <article key={entry.id} class="cz-tier-deck__tool">
                <span class="cz-tier-deck__tool-icon" aria-hidden="true"><Icon /></span>
                <h5 class="cz-tier-deck__tool-title">{entry.title}</h5>
                <p class="cz-tier-deck__tool-body">{entry.body}</p>
                <button type="button" class="cz-tier-deck__tool-action cz-tier-deck__tool-action--live" onClick={() => onToolIntent(entry.actionId)}>
                  {entry.label}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <TierRateSheetInventory inventory={inventory} loading={loading} error={error} />

      {/* ── SECTION: INDEPENDENT_SYSTEMS ──────────────────────────────────── */}
      <details class="cz-tier-settings__advanced">
        <summary>Independent Tier systems</summary>
        <div class="cz-tier-settings__advanced-body">
          <p class="cz-tier-settings__muted">Create, configure, and manage Tier systems separately from Package Family assignments.</p>
          <div class="cz-tier-settings__inline-form">
            <label for="tier-instance-title">Create an independent Tier system</label>
            <input
              id="tier-instance-title"
              class="cz-tier-deck__control"
              value={newTitle}
              placeholder="Tier system title"
              onInput={(event) => setNewTitle(event.currentTarget.value)}
            />
            <button type="button" class="cz-tier-deck__button cz-tier-deck__button--primary" disabled={tool.saving || !newTitle.trim()} onClick={() => { void createInstance(); }}>
              Create Tier system
            </button>
            <small>Creation does not assign the new system to a Family.</small>
          </div>
          <ul class="cz-tier-settings__instance-list">
            {tool.rows.map((row) => (
              <li key={row.instanceId}>
                <span>
                  <strong>{row.title}</strong>
                  <small>{row.consumerName} · {row.occupantCount} configured · {row.binCount} in bin</small>
                </span>
                <button type="button" class="cz-tier-deck__button cz-tier-deck__button--secondary" onClick={() => onManageInstance(row.instanceId)}>Manage</button>
              </li>
            ))}
          </ul>
        </div>
      </details>

      {tool.error && <p class="cz-station-empty" role="alert">{tool.error}</p>}
    </div>
  );
}
