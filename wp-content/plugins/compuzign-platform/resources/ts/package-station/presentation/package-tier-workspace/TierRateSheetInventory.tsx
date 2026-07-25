import type { VNode } from 'preact';
import type { TierRateSheetInventoryRow } from '../../surface/tierInstance/tierInstanceModel';
import { TIER_LABELS } from '../../vocabulary';
import { RateSheetIcon } from '@/admin-station/shell/icons';

interface Props {
  inventory: TierRateSheetInventoryRow[];
  loading: boolean;
  error: string | null;
}

export function TierRateSheetInventory({ inventory, loading, error }: Props): VNode {
  return (
    <section class="cz-tier-settings__section" aria-labelledby="rate-sheet-inventory-heading">
      <div class="cz-tier-deck__lane-head">
        <div>
          <h4 id="rate-sheet-inventory-heading" class="cz-tier-deck__lane-title">Available Rate Sheets</h4>
          <p class="cz-tier-deck__lane-note">Availability may be shared. “Used by” reflects current Tier bindings and Family names only through explicit assignments.</p>
        </div>
      </div>
      {loading ? (
        <p class="cz-station-empty" aria-busy="true">Loading Rate Sheets…</p>
      ) : error ? (
        <p class="cz-station-empty" role="alert">{error}</p>
      ) : inventory.length === 0 ? (
        <p class="cz-station-empty">No Rate Sheets have been created.</p>
      ) : (
        <ul class="cz-tier-settings__rate-sheets">
          {inventory.map((sheet) => <RateSheetInventoryItem key={sheet.rateSheetId} sheet={sheet} />)}
        </ul>
      )}
    </section>
  );
}

function RateSheetInventoryItem({ sheet }: { sheet: TierRateSheetInventoryRow }): VNode {
  const formatScope = (scope: TierRateSheetInventoryRow['availableTo'][number]): string => {
    const slots = scope.slotIds.length > 0
      ? ` · ${scope.slotIds.map((slotId) => TIER_LABELS[slotId] ?? slotId).join(', ')}`
      : '';
    return `${scope.familyName} — ${scope.instanceTitle}${slots}`;
  };

  return (
    <li class="cz-tier-settings__rate-sheet">
      <span class="cz-tier-deck__identity-icon" aria-hidden="true"><RateSheetIcon /></span>
      <div class="cz-tier-settings__rate-sheet-name">
        <strong>{sheet.title}</strong>
        <small>{sheet.status} · {sheet.rowCount} rows · {sheet.groupCount} groups</small>
      </div>
      <div class="cz-tier-settings__rate-sheet-scope">
        <span>Available to</span>
        <strong>{sheet.availableTo.length > 0 ? sheet.availableTo.map(formatScope).join(' · ') : 'No Tier systems'}</strong>
      </div>
      <div class="cz-tier-settings__rate-sheet-scope">
        <span>Used by</span>
        <strong>{sheet.usedBy.length > 0 ? sheet.usedBy.map(formatScope).join(' · ') : 'Not currently used'}</strong>
      </div>
    </li>
  );
}
