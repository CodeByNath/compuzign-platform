// Commercial Legs Migration popup — backfills Tier Pricing Rules' legacy
// synthesis for occupants/Editions still storing commercial_legs: []
// alongside a real, usable billing_cycle (see
// docs/code-map/tier-pricing-rules-plan.md). Admin-only maintenance action,
// deliberately separate from Tier Pricing Rules' own authoring surface —
// this reads/writes through its own preview/apply routes only, never the
// Tier drawer or its save paths.
//
// Flow: open → preview (never writes) → shows affected/skipped counts →
// Confirm Apply → run migration → the SAME popup body is replaced with a
// completion message and final statistics. Once applied, the popup offers
// only Close — Apply is not offered again without reopening it (which
// re-previews; harmless, since a record already migrated is reported as
// skipped, never re-migrated).
//
// Self-contained: this component owns its own open/closed and
// preview/apply state locally. It is not threaded through
// useTierDrawerController or any Tier Pricing Rules state.

import { useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { CommercialLegsMigrationStats } from '../../types';
import { applyCommercialLegsMigration, previewCommercialLegsMigration } from '../../api';

type PopupState =
  | { phase: 'closed' }
  | { phase: 'loading' }
  | { phase: 'preview'; stats: CommercialLegsMigrationStats }
  | { phase: 'applying'; stats: CommercialLegsMigrationStats }
  | { phase: 'done'; stats: CommercialLegsMigrationStats }
  | { phase: 'error'; message: string };

function totalToMigrate(stats: CommercialLegsMigrationStats): number {
  return stats.occupants_migrated + stats.editions_migrated;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function CommercialLegsMigrationLauncher(): VNode {
  const [state, setState] = useState<PopupState>({ phase: 'closed' });
  const busy = state.phase === 'loading' || state.phase === 'applying';
  const canApply = state.phase === 'preview' && totalToMigrate(state.stats) > 0;
  const isFinal = state.phase === 'done' || state.phase === 'error';

  const open = () => {
    setState({ phase: 'loading' });
    previewCommercialLegsMigration()
      .then((res) => setState({ phase: 'preview', stats: res.stats }))
      .catch((error: unknown) => setState({ phase: 'error', message: errorMessage(error, 'Preview failed.') }));
  };

  const close = () => {
    if (busy) return;
    setState({ phase: 'closed' });
  };

  const confirmApply = () => {
    if (state.phase !== 'preview') return;
    setState({ phase: 'applying', stats: state.stats });
    applyCommercialLegsMigration()
      .then((res) => setState({ phase: 'done', stats: res.stats }))
      .catch((error: unknown) => setState({ phase: 'error', message: errorMessage(error, 'Migration failed.') }));
  };

  return (
    <div class="cz-tier-settings__leaf">
      <div class="cz-tier-deck__lane-head">
        <div>
          <span class="cz-tier-deck__field-label">Maintenance</span>
          <h4 class="cz-tier-settings__leaf-title">Commercial Legs Migration</h4>
          <p class="cz-tier-deck__lane-note">
            Backfill legacy pricing records with their derived Commercial Leg. Admin-only, separate from Tier Pricing Rules.
          </p>
        </div>
      </div>
      <button type="button" class="cz-tier-deck__button cz-tier-deck__button--primary" onClick={open}>
        Migrate Legacy Pricing…
      </button>

      {state.phase !== 'closed' && (
        <div class="cz-publish-confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div class="cz-publish-confirm">
            <div class="cz-publish-confirm__header">
              <h3 class="cz-publish-confirm__title">Commercial Legs Migration</h3>
            </div>
            <div class="cz-publish-confirm__body">
              {state.phase === 'loading' && (
                <p class="cz-publish-confirm__lead">Checking for records to migrate…</p>
              )}
              {state.phase === 'error' && (
                <p class="cz-publish-confirm__lead">{state.message}</p>
              )}
              {(state.phase === 'preview' || state.phase === 'applying') && (
                <>
                  <p class="cz-publish-confirm__lead">
                    {totalToMigrate(state.stats) > 0
                      ? 'The following records will get one derived Commercial Leg, backfilling their existing Rate Sheet selections. Nothing else changes.'
                      : 'Nothing to migrate — every occupant and Edition already has a Commercial Leg, or has nothing to derive one from.'}
                  </p>
                  <ul class="cz-publish-confirm__summary">
                    <li><strong>Occupants to migrate:</strong> {state.stats.occupants_migrated}</li>
                    <li><strong>Occupants skipped:</strong> {state.stats.occupants_skipped}</li>
                    <li><strong>Editions to migrate:</strong> {state.stats.editions_migrated}</li>
                    <li><strong>Editions skipped:</strong> {state.stats.editions_skipped}</li>
                  </ul>
                </>
              )}
              {state.phase === 'done' && (
                <>
                  <p class="cz-publish-confirm__lead">
                    {totalToMigrate(state.stats) > 0 ? 'Migration complete.' : 'Nothing needed migrating.'}
                  </p>
                  <ul class="cz-publish-confirm__summary">
                    <li><strong>Occupants migrated:</strong> {state.stats.occupants_migrated}</li>
                    <li><strong>Occupants skipped:</strong> {state.stats.occupants_skipped}</li>
                    <li><strong>Editions migrated:</strong> {state.stats.editions_migrated}</li>
                    <li><strong>Editions skipped:</strong> {state.stats.editions_skipped}</li>
                  </ul>
                </>
              )}
            </div>
            <div class="cz-publish-confirm__footer">
              {isFinal ? (
                <button type="button" class="cz-tier-deck__button" onClick={close}>
                  Close
                </button>
              ) : (
                <>
                  <button type="button" class="cz-tier-deck__button" onClick={close} disabled={busy}>
                    Cancel
                  </button>
                  <button type="button" class="cz-tier-deck__button cz-tier-deck__button--primary" onClick={confirmApply} disabled={busy || !canApply}>
                    {state.phase === 'applying' ? '…' : 'Confirm Apply'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
