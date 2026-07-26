// Tier Workspace Settings — the focused Tier system's own configuration.
//
// FILE INDEX
//   CONTRACTS              — presentation inputs and the one Tier-scoped action.
//   ACCESS_AND_FIXED_SLOTS — system Rate Sheet access and drawer-bound slots.
//
// Settings configures the ONE Tier system already focused by the workspace above.
// It creates no Tier instance, assigns nothing to a Package Family, suggests no
// consumer, infers no relationship, and launches no unrelated tool: every
// relationship in this workspace is made where the record that owns it lives —
// Family assignment in the Package Family drawer, Rate Sheet binding in the Tier
// drawer. What remains here is the focused system's own access allow-list and its
// five fixed slots, both written through the existing Package Station mutations.

import type { VNode } from 'preact';
import type {
  PackageRateSheet,
  TierInstanceSummary,
} from '../../types';
import type { TierInstancesToolState } from '../../surface/tierInstance/useTierInstances';
import { tierSlotStates } from '../../surface/tierInstance/tierInstanceModel';
import { TIER_LABELS } from '../../vocabulary';

// ── SECTION: CONTRACTS ────────────────────────────────────────────────────────

interface Props {
  tool: TierInstancesToolState;
  workspaceInstance: TierInstanceSummary | null;
  rateSheets: PackageRateSheet[];
  loading: boolean;
  error: string | null;
  onTierAction: (
    instanceId: string,
    slotId: string,
    occupantId: string | null,
    actionId: 'view' | 'edit',
  ) => void;
}

// ── SECTION: ACCESS_AND_FIXED_SLOTS ───────────────────────────────────────────

export function TierSystemSettings({
  tool,
  workspaceInstance,
  rateSheets,
  loading,
  error,
  onTierAction,
}: Props): VNode {
  const currentRecord = workspaceInstance
    ? tool.instances.find((instance) => instance.tier_instance_id === workspaceInstance.tier_instance_id) ?? null
    : null;
  const currentSlots = currentRecord ? tierSlotStates(currentRecord) : [];
  const activeRateSheets = rateSheets.filter((sheet) => sheet.status === 'active');

  const startNarrowAvailability = () => {
    if (!currentRecord) return;
    void tool.updateInstance(currentRecord.tier_instance_id, {
      allowed_rate_sheet_ids: activeRateSheets.map((sheet) => sheet.rate_sheet_id),
    });
  };

  // At least one active sheet must remain reachable, so the last selected sheet
  // cannot be cleared. Widening back to every active sheet is the explicit
  // "Allow all active sheets" action, never a side effect of unchecking.
  const toggleAllowedSheet = (sheetId: string) => {
    if (!currentRecord) return;
    const next = new Set(currentRecord.allowed_rate_sheet_ids);
    if (next.has(sheetId)) {
      const activeSelected = activeRateSheets.filter((sheet) => next.has(sheet.rate_sheet_id));
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
            <h4 id="tier-system-heading" class="cz-tier-deck__lane-title">Focused Tier system</h4>
            <p class="cz-tier-deck__lane-note">
              Access and fixed slots for the Tier system focused above. Assignment to a Package
              Family stays in the Package Family drawer that owns it.
            </p>
          </div>
        </div>

        {currentRecord === null ? (
          <p class="cz-station-empty">
            No Tier system is focused, so there is nothing to configure here.
          </p>
        ) : (
          <div class="cz-tier-settings__configuration">
            <div>
              <h5>Rate Sheet access</h5>
              {loading ? (
                <p aria-busy="true">Loading Rate Sheets…</p>
              ) : error ? (
                <p role="alert">{error}</p>
              ) : activeRateSheets.length === 0 ? (
                <p>No active Rate Sheet exists, so this Tier system can reach none.</p>
              ) : currentRecord.allowed_rate_sheet_ids.length === 0 ? (
                <>
                  <p>This Tier system can use every active Rate Sheet. Each Tier chooses its own Rate Sheet when configured.</p>
                  <button
                    type="button"
                    class="cz-tier-deck__button cz-tier-deck__button--secondary"
                    disabled={tool.saving}
                    onClick={startNarrowAvailability}
                  >
                    Limit Rate Sheet access
                  </button>
                </>
              ) : (
                <>
                  <p>This Tier system can use only the selected active Rate Sheets. At least one must remain available.</p>
                  <div class="cz-tier-settings__checks">
                    {activeRateSheets.map((sheet) => (
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
                  <button
                    type="button"
                    class="cz-tier-deck__button cz-tier-deck__button--secondary"
                    disabled={tool.saving}
                    onClick={() => { void tool.updateInstance(currentRecord.tier_instance_id, { allowed_rate_sheet_ids: [] }); }}
                  >
                    Allow all active sheets
                  </button>
                </>
              )}
            </div>
            <div>
              <h5>Fixed Tier slots</h5>
              <ul class="cz-tier-settings__slots">
                {currentSlots.map((slot) => (
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
                          slot.occupantId,
                          slot.occupied ? 'view' : 'edit',
                        )}
                      >
                        {slot.occupied ? 'View' : 'Configure'}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {tool.error && <p class="cz-station-empty" role="alert">{tool.error}</p>}
    </div>
  );
}
