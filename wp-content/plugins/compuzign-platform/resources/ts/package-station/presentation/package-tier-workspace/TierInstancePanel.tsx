import { useMemo, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { PackageRateSheet } from '../../types';
import type { TierInstancesToolState } from '../../surface/tierInstance/useTierInstances';
import {
  suggestConsumerForInstance,
  tierSlotStates,
} from '../../surface/tierInstance/tierInstanceModel';
import { TIER_LABELS } from '../../vocabulary';

interface Props {
  tool: TierInstancesToolState;
  rateSheets: PackageRateSheet[];
}

export function TierInstancePanel({ tool, rateSheets }: Props): VNode {
  const [newTitle, setNewTitle] = useState('');
  const [familyChoice, setFamilyChoice] = useState<Record<string, string>>({});
  const selected = tool.selectedInstance;
  const selectedRow = tool.rows.find((row) => row.instanceId === selected?.tier_instance_id) ?? null;
  const suggested = useMemo(
    () => selected
      ? suggestConsumerForInstance(selected, tool.families, tool.assignments)
      : null,
    [selected, tool.families, tool.assignments],
  );

  const create = async () => {
    const title = newTitle.trim();
    if (!title) return;
    const instance = await tool.createInstance(title);
    if (instance) setNewTitle('');
  };

  const toggleAllowedSheet = (sheetId: string) => {
    if (!selected) return;
    const current = new Set(selected.allowed_rate_sheet_ids);
    if (current.has(sheetId)) current.delete(sheetId); else current.add(sheetId);
    void tool.updateInstance(selected.tier_instance_id, {
      allowed_rate_sheet_ids: [...current],
    });
  };

  return (
    <section class="cz-tier-workspace__family" aria-label="Tier capability instances">
      <p class="cz-tier-workspace__panel-label">Tier capability instances</p>

      <div class="drawerModule__fields">
        {tool.rows.map((row) => (
          <div class="drawerModule__field" key={row.instanceId}>
            <p class="drawerModule__label">{row.title}</p>
            <p class="drawerModule__value">
              {row.consumerName} · {row.readiness} · {row.occupantCount} occupants · {row.binCount} bin
            </p>
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--sm cz-admin-btn--secondary"
              aria-pressed={row.instanceId === tool.selectedInstanceId}
              onClick={() => tool.selectInstance(row.instanceId)}
            >
              Open
            </button>
            {row.consumerId ? (
              <button
                type="button"
                class="cz-admin-btn cz-admin-btn--sm cz-admin-btn--secondary"
                disabled={tool.saving}
                onClick={() => { void tool.unassignInstance(row.instanceId); }}
              >
                Unassign
              </button>
            ) : tool.eligibleFamilies.length > 0 ? (
              <span>
                <select
                  aria-label={`Assign ${row.title}`}
                  value={familyChoice[row.instanceId] ?? ''}
                  onChange={(event) => setFamilyChoice((current) => ({
                    ...current,
                    [row.instanceId]: event.currentTarget.value,
                  }))}
                >
                  <option value="">Choose Package Family</option>
                  {tool.eligibleFamilies.map((family) => (
                    <option key={family.group_id} value={family.group_id}>{family.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  class="cz-admin-btn cz-admin-btn--sm cz-admin-btn--secondary"
                  disabled={tool.saving || !(familyChoice[row.instanceId] ?? '')}
                  onClick={() => {
                    const familyId = familyChoice[row.instanceId];
                    if (familyId) void tool.assignInstance(row.instanceId, familyId);
                  }}
                >
                  Assign
                </button>
              </span>
            ) : null}
          </div>
        ))}
      </div>

      <div class="drawerModule__field">
        <label class="drawerModule__label" for="tier-instance-title">Create Tier instance</label>
        <input
          id="tier-instance-title"
          value={newTitle}
          placeholder="Tier set title"
          onInput={(event) => setNewTitle(event.currentTarget.value)}
        />
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--sm cz-admin-btn--primary"
          disabled={tool.saving || !newTitle.trim()}
          onClick={() => { void create(); }}
        >
          Create instance
        </button>
      </div>

      {selected && selectedRow && (
        <>
          {suggested && (
            <div class="drawerModule__field">
              <p class="drawerModule__value">Assign this Tier set to {suggested.label}?</p>
              <button
                type="button"
                class="cz-admin-btn cz-admin-btn--sm cz-admin-btn--secondary"
                disabled={tool.saving}
                onClick={() => { void tool.assignInstance(selected.tier_instance_id, suggested.group_id); }}
              >
                Assign to {suggested.label}
              </button>
            </div>
          )}

          <div class="drawerModule__field">
            <p class="drawerModule__label">Allowed Rate Sheets</p>
            <p class="drawerModule__value">No selection means every active Rate Sheet is available.</p>
            {rateSheets.map((sheet) => (
              <label key={sheet.rate_sheet_id}>
                <input
                  type="checkbox"
                  checked={selected.allowed_rate_sheet_ids.includes(sheet.rate_sheet_id)}
                  disabled={tool.saving}
                  onChange={() => toggleAllowedSheet(sheet.rate_sheet_id)}
                />{' '}{sheet.title} ({sheet.status})
              </label>
            ))}
          </div>

          <div class="drawerModule__field">
            <p class="drawerModule__label">Fixed Tier slots</p>
            <ul>
              {tierSlotStates(selected).map((slot) => (
                <li key={slot.slotId}>
                  {TIER_LABELS[slot.slotId] ?? slot.slotId}: {slot.occupied ? slot.occupantId : 'Empty'}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {tool.error && <p class="cz-station-empty" role="alert">{tool.error}</p>}
    </section>
  );
}
