// Package Family Settings → Tools / Skills.
//
// Renders one row per registered tool. Activation is owner-specific: it writes
// through usePackageFamilyStation.setToolEnabled, which persists a boolean on
// THIS Family's group row and creates no tool data. Tier is the first real
// tool; Promotion / Bundle / Campaign are registry-compatible future tools,
// shown read-only until real Family-owned authority exists.
//
// This panel presents and dispatches only — it owns no persistence, no Tier
// CRUD, and opens no nested drawer (the platform forbids drawer nesting).

import { useState } from 'preact/hooks';
import { PACKAGE_TOOLS, isToolEnabled } from '@/modules/packages/packageTools';
import type { PackageToolKey } from '@/modules/packages/packageTools';
import type { PackageFamilyStation } from '@/hooks/usePackageFamilyStation';

// Owner-context Tier presentation. Tier data is station-global and PROJECTED
// through this Family's source Services (never independently owned here), so the
// copy describes projection honestly rather than claiming per-Family records.
function TierOwnerContext({ station }: { station: PackageFamilyStation }) {
  const count = station.relationshipData.tierSelections;
  if (count === 0) {
    return (
      <div class="cz-family-tool__context">
        <p class="cz-family-tool__context-lead">No tiers configured yet for this Family.</p>
        <p class="cz-family-tool__context-hint">
          Tiers are authored in the Package Manager Tier workflow. They appear here once source
          Services connected to this Family supply Tier selections.
        </p>
      </div>
    );
  }
  return (
    <div class="cz-family-tool__context">
      <p class="cz-family-tool__context-lead">
        {count} Tier selection{count === 1 ? '' : 's'} projected through this Family’s Services.
      </p>
      <p class="cz-family-tool__context-hint">
        Tier records stay in the single Package Station authority; this Family projects and
        surfaces them.
      </p>
    </div>
  );
}

export function PackageFamilyToolsPanel({ station }: { station: PackageFamilyStation }) {
  const [error, setError] = useState<string | null>(null);

  const toggle = async (key: PackageToolKey, next: boolean) => {
    setError(null);
    try {
      await station.setToolEnabled(key, next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the tool.');
    }
  };

  const anyActive = PACKAGE_TOOLS.some((tool) => isToolEnabled(station.tools, tool.key));

  return (
    <section class="cz-family-tools" aria-label="Tools and Skills">
      <header class="cz-family-tools__head">
        <h4 class="cz-family-tools__title">Tools / Skills</h4>
        <p class="cz-family-tools__lead">
          Activate the optional systems this Package Family needs. Activation is specific to this
          Family and never creates records.
        </p>
      </header>

      {error && <div class="cz-admin-error-msg" role="alert">{error}</div>}

      <ul class="cz-family-tools__list">
        {PACKAGE_TOOLS.map((tool) => {
          const enabled = isToolEnabled(station.tools, tool.key);
          const busy = station.loading.tool === tool.key;
          const stateLabel = tool.available ? (enabled ? 'Active' : 'Inactive') : 'Coming soon';
          return (
            <li
              key={tool.key}
              class={`cz-family-tool${tool.available ? '' : ' cz-family-tool--unavailable'}${enabled ? ' cz-family-tool--active' : ''}`}
            >
              <div class="cz-family-tool__body">
                <div class="cz-family-tool__heading">
                  <span class="cz-family-tool__label">{tool.label}</span>
                  <span class={`cz-family-tool__state${enabled ? ' cz-family-tool__state--on' : ''}`}>
                    {stateLabel}
                  </span>
                </div>
                <p class="cz-family-tool__desc">{tool.description}</p>
                {!tool.available && tool.unavailableReason && (
                  <p class="cz-family-tool__reason">{tool.unavailableReason}</p>
                )}
                {tool.available && tool.key === 'tier' && enabled && (
                  <TierOwnerContext station={station} />
                )}
              </div>
              <div class="cz-family-tool__action">
                <button
                  type="button"
                  class={`cz-admin-btn cz-admin-btn--sm cz-family-tool__btn ${enabled ? 'cz-admin-btn--secondary' : 'cz-admin-btn--primary'}`}
                  disabled={!tool.available || busy}
                  onClick={() => tool.available && toggle(tool.key, !enabled)}
                >
                  {busy ? 'Saving…' : tool.available ? (enabled ? 'Deactivate' : 'Activate') : 'Unavailable'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {anyActive && (
        <p class="cz-family-tools__note">
          Deactivating a tool hides it for this Family only. It never deletes existing data.
        </p>
      )}
    </section>
  );
}
