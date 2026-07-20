// Package Family Settings → Assigned Tools.
//
// Compact assignment management for ONE Family. It shows only the tools this
// Family can assign (the available ones) plus anything already active, with a
// single Activate / Deactivate control per row. Activation is owner-specific: it
// writes a boolean on THIS Family's group row through
// usePackageFamilyStation.setToolEnabled and creates no tool data.
//
// The full catalogue — descriptions, authority, and the future-tool roadmap —
// lives once at Station level (Package Station → Tools / Skills), not here, so a
// Family drawer is not a repeated copy of the registry.
//
// Assignments save immediately; this panel shows a transient saved confirmation.
// There is no draft/publish step for assignment (the Family's Publish contract
// governs its Overview, not its tools) — the two models are never mixed.
//
// This panel presents and dispatches only — it owns no persistence, no Tier
// CRUD, and opens no nested drawer (the platform forbids drawer nesting).

import { useState } from 'preact/hooks';
import { PACKAGE_TOOLS, isToolEnabled } from '@/modules/packages/packageTools';
import type { PackageToolKey } from '@/modules/packages/packageTools';
import type { PackageFamilyStation } from '@/hooks/usePackageFamilyStation';

// Owner-context Tier presentation. Tier data is station-global and PROJECTED
// through this Family's source Services, so the copy is product-facing and
// describes availability rather than claiming per-Family Tier records.
function TierOwnerContext({ station }: { station: PackageFamilyStation }) {
  const count = station.relationshipData.tierSelections;
  if (count === 0) {
    return (
      <p class="cz-family-tool__context">
        No Tier selections yet — connect Services to this Family to make Tiers available here.
      </p>
    );
  }
  return (
    <p class="cz-family-tool__context">
      {count} Tier selection{count === 1 ? '' : 's'} available through Services in this Family.
    </p>
  );
}

export function PackageFamilyToolsPanel({ station }: { station: PackageFamilyStation }) {
  const [error, setError] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<PackageToolKey | null>(null);

  const toggle = async (key: PackageToolKey, next: boolean) => {
    setError(null);
    setSavedKey(null);
    try {
      await station.setToolEnabled(key, next);
      setSavedKey(key);
      window.setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 2400);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the tool.');
    }
  };

  // Only assignable tools, plus anything already active on this Family. The
  // future-tool roadmap belongs to the Station catalogue, never a Family drawer.
  const rows = PACKAGE_TOOLS.filter(
    (tool) => tool.available || isToolEnabled(station.tools, tool.key),
  );
  const anyActive = rows.some((tool) => isToolEnabled(station.tools, tool.key));

  return (
    <section class="cz-family-tools" aria-label="Assigned Tools">
      <header class="cz-family-tools__head">
        <h4 class="cz-family-tools__title">Assigned Tools</h4>
        <p class="cz-family-tools__lead">
          Activate the tools this Package Family uses. Changes save immediately and never create
          records.
        </p>
      </header>

      {error && <div class="cz-admin-error-msg" role="alert">{error}</div>}

      <ul class="cz-family-tools__list">
        {rows.map((tool) => {
          const enabled = isToolEnabled(station.tools, tool.key);
          const busy = station.loading.tool === tool.key;
          const saved = savedKey === tool.key && !busy;
          return (
            <li
              key={tool.key}
              class={`cz-family-tool${enabled ? ' cz-family-tool--active' : ''}`}
            >
              <div class="cz-family-tool__body">
                <div class="cz-family-tool__heading">
                  <span class="cz-family-tool__label">{tool.label}</span>
                  <span class={`cz-family-tool__state${enabled ? ' cz-family-tool__state--on' : ''}`}>
                    {enabled ? 'Active' : 'Inactive'}
                  </span>
                  {saved && <span class="cz-family-tool__saved" role="status">Saved</span>}
                </div>
                {tool.key === 'tier' && enabled && <TierOwnerContext station={station} />}
              </div>
              <div class="cz-family-tool__action">
                <button
                  type="button"
                  class={`cz-admin-btn cz-admin-btn--sm cz-family-tool__btn ${enabled ? 'cz-admin-btn--secondary' : 'cz-admin-btn--primary'}`}
                  disabled={busy}
                  onClick={() => toggle(tool.key, !enabled)}
                >
                  {busy ? 'Saving…' : enabled ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {anyActive && (
        <p class="cz-family-tools__note">
          Deactivating a tool hides it for this Family only. It never removes existing data.
        </p>
      )}
    </section>
  );
}
