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
}: Props): VNode {
  const [newTitle, setNewTitle] = useState('');
  const [directFamilyId, setDirectFamilyId] = useState('');
  const [confirmRemoval, setConfirmRemoval] = useState(false);
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

  const createInstance = async () => {
    const title = newTitle.trim();
    if (!title) return;
    const created = await tool.createInstance(title);
    if (created) setNewTitle('');
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
          <div class="cz-tier-settings__callout">
            <span class="cz-tier-settings__callout-icon" aria-hidden="true"><TiersIcon /></span>
            <div class="cz-tier-settings__callout-copy">
              <strong>{family.name} is complete without Tier capability.</strong>
              <span>Attach an existing independent Tier system only when this Family needs one.</span>
            </div>
            <div class="cz-tier-settings__attach-list">
              {attachableRows.length === 0 ? (
                <span class="cz-tier-settings__muted">No unassigned Tier systems are available.</span>
              ) : attachableRows.map((row) => (
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
                    Add Tier capability
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : currentRecord && currentRow ? (
          <div class="cz-tier-settings__callout">
            <span class="cz-tier-settings__callout-icon" aria-hidden="true"><TiersIcon /></span>
            <div class="cz-tier-settings__callout-copy">
              <strong>{currentRecord.title}</strong>
              <span>{currentRow.consumerName} · {currentRow.occupantCount} configured · {currentRow.binCount} in bin</span>
            </div>
            <div class="cz-tier-settings__actions">
              <button
                type="button"
                class="cz-tier-deck__button cz-tier-deck__button--secondary"
                onClick={() => tool.selectInstance(currentRecord.tier_instance_id)}
              >
                Open Tier tool
              </button>
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
              <div class="cz-tier-settings__confirm" role="alert">
                <p>Remove Tier capability from <strong>{family.name}</strong>? The Family and <strong>{currentRecord.title}</strong> will remain unchanged.</p>
                <button type="button" class="cz-tier-deck__button cz-tier-deck__button--secondary" onClick={() => setConfirmRemoval(false)}>Keep capability</button>
                <button type="button" class="cz-tier-deck__button cz-tier-deck__button--destructive" disabled={tool.saving} onClick={() => { void removeAssignment(); }}>Remove assignment</button>
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
                  Add Tier capability to {suggestedFamily.label}
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
                  Add Tier capability
                </button>
              </div>
            )}
          </div>
        ) : null}

        {currentRecord && (
          <div class="cz-tier-settings__configuration">
            <div>
              <h5>Rate Sheet availability</h5>
              {currentRecord.allowed_rate_sheet_ids.length === 0 ? (
                <>
                  <p>All active Rate Sheets are available to this instance.</p>
                  <button type="button" class="cz-tier-deck__button cz-tier-deck__button--secondary" disabled={tool.saving || rateSheets.filter((sheet) => sheet.status === 'active').length === 0} onClick={startNarrowAvailability}>
                    Select specific sheets
                  </button>
                </>
              ) : (
                <>
                  <p>Only the selected active Rate Sheets are available. At least one must remain selected.</p>
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
                {tierSlotStates(currentRecord).map((slot) => (
                  <li key={slot.slotId}>
                    <span>{TIER_LABELS[slot.slotId] ?? slot.slotId}</span>
                    <strong>{slot.occupied ? 'Configured' : 'Empty'}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

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

      <details class="cz-tier-settings__advanced">
        <summary>Advanced Tier system management</summary>
        <div class="cz-tier-settings__advanced-body">
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
                <button type="button" class="cz-tier-deck__button cz-tier-deck__button--secondary" onClick={() => tool.selectInstance(row.instanceId)}>Open</button>
              </li>
            ))}
          </ul>
        </div>
      </details>

      {tool.error && <p class="cz-station-empty" role="alert">{tool.error}</p>}
    </div>
  );
}
