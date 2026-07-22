// Rate Sheet setup — the host-neutral initialise composition.
//
// The Package Station models ONE Rate Sheet configuration. Initialising it is a
// real setup step, not a bare title write: the manager commit materialises a
// Rate Sheet row for every live relationship item the station's sources supply
// (at the domain defaults — $0.00, "Per item", quantity 1, ungrouped). This
// composition is honest about that whole arc:
//
//   form                — title plus a preview of the rows setup will connect;
//   success             — the configured result of THIS setup, with a Done
//                         close (never a silent auto-close);
//   already-configured  — a passive state with no form, so a stale "+ Rate
//                         Sheet" click can never start a second setup.
//
// Duplicate prevention is layered: the host's fresh station read drives the
// already-configured stage here, and the station command itself refuses to
// replace an existing sheet at save time.
//
// Host-neutral: it receives the sheet summary, the eligible rows, a command and
// the bridge; it knows no station shell, no StepContext, and no endpoint.

import { useEffect, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import {
  countEligibleServices,
  resolveRateSheetSetupStage,
} from './rateSheetSetupModel';
import type {
  RateSheetSetupEligibleRow,
  RateSheetSetupSheetSummary,
} from './rateSheetSetupModel';

export type RateSheetSetupResult = { ok: true } | { ok: false; message: string };

export interface RateSheetSetupContentProps {
  /** The station's configured sheet, or null while unconfigured. After a
   *  successful initialise the host's advanced state flows back in here. */
  sheet: RateSheetSetupSheetSummary | null;
  /** The live relationship rows the setup save will connect as sheet rows. */
  eligibleRows: RateSheetSetupEligibleRow[];
  initialise: (title: string) => Promise<RateSheetSetupResult>;
  bridge: EntityDrawerHostBridge;
}

// The preview stays a compact confirmation, not a second catalogue.
const PREVIEW_LIMIT = 6;

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export function RateSheetSetupContent({ sheet, eligibleRows, initialise, bridge }: RateSheetSetupContentProps): VNode {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justConfigured, setJustConfigured] = useState(false);

  const stage = resolveRateSheetSetupStage(sheet !== null, justConfigured);

  const apply = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(null);
    const result = await initialise(title.trim());
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    // The wall refresh starts now; the drawer stays open on its success state
    // so the setup has a visible result before the user returns to the wall.
    setJustConfigured(true);
    bridge.onMutationComplete?.();
  };

  useEffect(() => {
    if (stage === 'form') {
      bridge.setFooter(
        <div class="cz-tf-footer">
          <div class="cz-tf-footer__spacer" />
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary" disabled={saving} onClick={() => bridge.close()}>Cancel</button>
          <button type="button" class="cz-admin-btn cz-admin-btn--primary" disabled={saving || !title.trim()} onClick={() => void apply()}>
            {saving ? 'Setting up…' : 'Set up Rate Sheet'}
          </button>
        </div>,
      );
    } else {
      bridge.setFooter(
        <div class="cz-tf-footer">
          <div class="cz-tf-footer__spacer" />
          <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={() => bridge.close()}>
            {stage === 'success' ? 'Done' : 'Close'}
          </button>
        </div>,
      );
    }
    return () => bridge.setFooter(null);
  }, [bridge, stage, saving, title]);

  if (stage === 'already-configured') {
    return (
      <div class="cz-tf-form">
        <p class="cz-tf-hint cz-tf-hint--lead">
          A Rate Sheet is already configured for this Package Station:
          “{sheet!.title || 'Rate Sheet'}” with {plural(sheet!.rowCount, 'row')} and {plural(sheet!.groupCount, 'group')}.
        </p>
        <p class="cz-tf-hint">
          The station owns one Rate Sheet, so there is nothing to set up. Edit
          rows from the workspace, and add groups through “New Rate Sheet
          Group” under Settings.
        </p>
      </div>
    );
  }

  if (stage === 'success') {
    return (
      <div class="cz-tf-form">
        <div class="cz-admin-ok-msg">Rate Sheet configured.</div>
        {sheet ? (
          <p class="cz-tf-hint cz-tf-hint--lead">
            “{sheet.title || 'Rate Sheet'}” now carries {plural(sheet.rowCount, 'connected row')}.
          </p>
        ) : (
          <p class="cz-tf-hint cz-tf-hint--lead">The station's Rate Sheet is now configured.</p>
        )}
        {sheet !== null && sheet.rowCount > 0 && (
          <p class="cz-tf-hint">
            Connected rows start at $0.00 “Per item” × 1 — open each row from
            Details or Connections to set its commercial terms.
          </p>
        )}
        <p class="cz-tf-hint">The workspace behind this drawer is refreshing to show the configured sheet.</p>
      </div>
    );
  }

  const serviceCount = countEligibleServices(eligibleRows);
  const preview = eligibleRows.slice(0, PREVIEW_LIMIT);

  return (
    <div class="cz-tf-form">
      <div class="cz-tf-field">
        <label class="cz-tf-label">Rate Sheet title</label>
        <input
          type="text" class="cz-tf-input" value={title}
          onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
        />
      </div>

      {eligibleRows.length > 0 ? (
        <div class="cz-tf-field">
          <p class="cz-tf-label">What setup connects</p>
          <p class="cz-tf-hint">
            Saving initialises the station's one Rate Sheet and connects{' '}
            {plural(eligibleRows.length, 'supplied row')}
            {serviceCount > 0 && <> from {plural(serviceCount, 'source Service')}</>}
            , each starting at $0.00 “Per item” × 1 for pricing afterwards.
          </p>
          <ul class="cz-tf-list">
            {preview.map((row) => (
              <li class="cz-tf-list__item" key={row.id}>
                <span class="cz-tf-list__label">{row.label}</span>
                {row.serviceTitle !== null && <span class="cz-tf-list__meta">{row.serviceTitle}</span>}
              </li>
            ))}
          </ul>
          {eligibleRows.length > PREVIEW_LIMIT && (
            <p class="cz-tf-hint">…and {eligibleRows.length - PREVIEW_LIMIT} more.</p>
          )}
        </div>
      ) : (
        <p class="cz-tf-hint">
          No source Services supply content yet, so the sheet starts without
          rows. Rows connect automatically as supplied content arrives from
          source Services.
        </p>
      )}

      {error && <div class="cz-admin-error-msg" role="alert">{error}</div>}
    </div>
  );
}
