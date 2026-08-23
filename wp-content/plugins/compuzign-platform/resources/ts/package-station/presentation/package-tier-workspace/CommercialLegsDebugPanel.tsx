// Package Settings — Maintenance — Commercial Legs Debug.
//
// Read-only diagnostics only: no save, no mutation, no publish, no repair,
// no migration. Runs the SAME live customer projection an already-approved
// backend phase built (PackageRepository::findAllActiveFamiliesForCostBuilder(),
// the exact method /wp-json/compuzign/v1/package-builder already calls) for
// one selected Family, and renders its resolved commercial_legs timeline —
// never a second resolver, never reconstructed from Package Station
// authoring data.

import { useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { WorkspaceFamilyScope } from '../../surface/packageTierWorkspace/projection';
import { fetchCommercialLegsDebug } from '../../api';
import type {
  CommercialLegsDebugFamily,
  CommercialLegsDebugTier,
  CommercialLegsDebugEditionOption,
  CommercialLegsDebugPeriod,
  CommercialLegsDebugItem,
} from '../../types';

interface Props {
  families: WorkspaceFamilyScope[];
}

function formatMoney(value: number | null): string {
  return value === null ? '—' : `$${value.toFixed(2)}`;
}

function formatMonth(value: number | null): string {
  return value === null ? 'Indefinite' : String(value);
}

function ItemsTable({ items }: { items: CommercialLegsDebugItem[] }): VNode {
  if (items.length === 0) {
    return <p class="cz-legs-debug__muted">No items.</p>;
  }
  return (
    <table class="cz-legs-debug__table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Label</th>
          <th>Qty</th>
          <th>Price Option</th>
          <th>Unit Price</th>
          <th>Line Total</th>
          <th>Available</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <tr key={`${item.item_id}-${index}`}>
            <td>{item.item_id}</td>
            <td>{item.label}</td>
            <td>{item.quantity}</td>
            <td>{item.price_option_id ?? '—'}</td>
            <td>{formatMoney(item.unit_price)}</td>
            <td>{formatMoney(item.line_total)}</td>
            <td>{item.available ? 'yes' : 'no'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PeriodsBlock({ periods }: { periods: CommercialLegsDebugPeriod[] }): VNode {
  if (periods.length === 0) {
    return <p class="cz-legs-debug__muted">No resolved periods.</p>;
  }
  return (
    <div>
      {periods.map((period, periodIndex) => (
        <details key={periodIndex} open class="cz-legs-debug__period">
          <summary>
            Period {formatMonth(period.from_month)} → {formatMonth(period.to_month)}
          </summary>
          {period.components.map((component, componentIndex) => (
            <details key={componentIndex} open class="cz-legs-debug__component">
              <summary>
                {component.source} · {component.billing_cycle ?? '—'} · {formatMoney(component.price)} · {component.available ? 'available' : 'unavailable'}
              </summary>
              <ItemsTable items={component.items} />
            </details>
          ))}
        </details>
      ))}
    </div>
  );
}

function EditionsBlock({ editions }: { editions: CommercialLegsDebugEditionOption[] }): VNode | null {
  if (editions.length === 0) {
    return null;
  }
  return (
    <div class="cz-legs-debug__editions">
      {editions.map((edition) => (
        <details key={edition.id} class="cz-legs-debug__edition">
          <summary>
            Edition: {edition.label} ({edition.edition_platform_id || 'no CZTEL yet'}) — flat price {formatMoney(edition.price)}, commitment {edition.minimum_term_value ?? '—'} {edition.minimum_term_unit ?? ''}
          </summary>
          <PeriodsBlock periods={edition.commercial_legs} />
        </details>
      ))}
    </div>
  );
}

function TierBlock({ tierId, tier }: { tierId: string; tier: CommercialLegsDebugTier }): VNode {
  return (
    <details open class="cz-legs-debug__tier">
      <summary>
        Tier: {tierId} — {tier.label} ({tier.platform_id || 'no CZT yet'}) — flat price {formatMoney(tier.price)}, commitment {tier.minimum_term_value ?? '—'} {tier.minimum_term_unit ?? ''}
      </summary>
      <PeriodsBlock periods={tier.commercial_legs} />
      <EditionsBlock editions={tier.edition_options} />
    </details>
  );
}

export function CommercialLegsDebugPanel({ families }: Props): VNode {
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [family, setFamily] = useState<CommercialLegsDebugFamily | null>(null);

  const runDebug = async () => {
    if (!selectedFamilyId) return;
    setLoading(true);
    setError(null);
    setFamily(null);
    try {
      const res = await fetchCommercialLegsDebug(selectedFamilyId);
      if (res.success && res.family) {
        setFamily(res.family);
      } else {
        setError(res.message ?? 'This Family could not be resolved.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="cz-legs-debug">
      <p class="cz-tier-deck__lane-note">
        Runs the exact same live customer projection (Package Builder) for one Family and shows its resolved commercial_legs timeline. Read-only — no save, no mutation.
      </p>
      <div class="cz-legs-debug__controls">
        <select
          class="cz-tf-control cz-tf-select"
          value={selectedFamilyId}
          aria-label="Select a Package Family to debug"
          onChange={(event) => setSelectedFamilyId((event.currentTarget as HTMLSelectElement).value)}
        >
          <option value="">Select a Package Family…</option>
          {families.map((f) => (
            <option key={f.id} value={f.id}>{f.name || '(untitled)'} — {f.platformId || 'no CZPG yet'}</option>
          ))}
        </select>
        <button
          type="button"
          class="cz-tier-deck__button cz-tier-deck__button--primary"
          disabled={!selectedFamilyId || loading}
          onClick={runDebug}
        >
          {loading ? 'Running…' : 'Run Debug'}
        </button>
      </div>
      {error && <p class="cz-station-empty" role="alert">{error}</p>}
      {family && (
        <div class="cz-legs-debug__result">
          <p class="cz-legs-debug__family-title">
            Family: {family.title} ({family.family_platform_id || 'no CZPG yet'})
          </p>
          <p class="cz-legs-debug__muted">
            Tier Instance: {family.tier_instance_id} ({family.tier_instance_platform_id || 'no CZTG yet'})
          </p>
          {Object.entries(family.tiers).map(([tierId, tier]) => (
            <TierBlock key={tierId} tierId={tierId} tier={tier} />
          ))}
        </div>
      )}
    </div>
  );
}
