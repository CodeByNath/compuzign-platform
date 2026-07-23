// Tier Workspace Engine — the lower connected workspace (Details | Connections
// | Settings).
//
// An owned child of the PackageTierWorkspace orchestrator, beneath the Focus /
// Grid engine. It receives the SAME transient focused context the engine
// already resolved — the focused Family (with the station read context it
// carries) and the focused Tier occupant — plus the one intent dispatcher.
// It owns exactly one piece of transient state: which lower tab is open (plus
// the Details tab's local filter values). It fetches nothing, owns no second
// Family/Tier selection, and constructs no mutation: every action dispatches a
// record identity through `onIntent`, exactly like the engine above it.
//
//   Details     — the focused Tier's inclusion rows (pure projectTierDetails),
//                 compact rows with View / Edit dispatching the Rate Sheet
//                 row's OWN item_id to the rate-sheet-row drawer.
//   Connections — the station's ONE genuine Rate Sheet projected against the
//                 focused Family and Tier (pure projectRateSheetConnections),
//                 with the same row actions.
//   Settings    — the manager-level creation actions (Package Family, Rate
//                 Sheet setup, Rate Sheet group), each dispatching to its
//                 registered creation drawer. Creation names no existing
//                 record, so these dispatch the stable 'new' sentinel.

import { useMemo, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { StationIntentDispatch } from '../templateKits';
import type { PackageTierWorkspaceFamily, WorkspaceOccupant } from '../../stations/packageTierWorkspace/projection';
import {
  projectTierDetails,
  projectRateSheetConnections,
  type TierDetailsRow,
} from '../../stations/packageTierWorkspace/rateSheetProjection';

type LowerTab = 'details' | 'connections' | 'settings';

const LOWER_TABS: readonly { id: LowerTab; label: string }[] = [
  { id: 'details',     label: 'Details' },
  { id: 'connections', label: 'Connections' },
  { id: 'settings',    label: 'Settings' },
];

const NO_TIER_MESSAGE = 'Select a Tier above to see its Rate Sheet details.';
const NO_ROWS_MESSAGE = 'This Tier has no included Rate Sheet rows.';
const NO_SHEET_MESSAGE = 'No Rate Sheet is configured for this Package Station yet. Set it up under Settings.';

interface Props {
  family: PackageTierWorkspaceFamily;
  /** The focused Tier occupant (full workspace occupant), or null when the
   *  focused Family projects no Tiers. */
  occupant: WorkspaceOccupant | null;
  onIntent: StationIntentDispatch;
}

export function TierLowerWorkspace({ family, occupant, onIntent }: Props): VNode {
  const [tab, setTab] = useState<LowerTab>('details');

  return (
    <section class="cz-tier-workspace__lower" aria-label="Tier Rate Sheet workspace">
      <div class="cz-tier-workspace__lower-head">
        <div class="cz-tier-workspace__lower-tabs" role="tablist" aria-label="Rate Sheet workspace sections">
          {LOWER_TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              class="cz-tier-workspace__lower-tab"
              aria-selected={tab === entry.id}
              onClick={() => setTab(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
        {/* The focused context, restated so the lower deck is honest about its
            scope in Grid view too. Read-only: selection lives above. */}
        <p class="cz-tier-workspace__lower-context">
          {family.name}
          {occupant !== null && <> · {occupant.card.name}</>}
        </p>
      </div>

      <div class="cz-tier-workspace__lower-body" role="tabpanel">
        {tab === 'details' && <DetailsPanel family={family} occupant={occupant} onIntent={onIntent} />}
        {tab === 'connections' && <ConnectionsPanel family={family} occupant={occupant} onIntent={onIntent} />}
        {tab === 'settings' && <SettingsPanel family={family} onIntent={onIntent} />}
      </div>
    </section>
  );
}

// ── Details ──────────────────────────────────────────────────────────────────

function DetailsPanel({ family, occupant, onIntent }: Props): VNode {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState<'all' | 'resolved' | 'unresolved'>('all');

  const rows = useMemo(
    () => projectTierDetails({
      selections: occupant?.selections ?? [],
      station: family.station,
      familyRelatedServiceIds: family.relatedServiceIds,
    }),
    [occupant, family],
  );

  // Category filter options exist only where rows actually carry source
  // categories — no invented taxonomy.
  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const row of rows) for (const item of row.categories) seen.add(item);
    return [...seen].sort();
  }, [rows]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (needle && !row.label.toLowerCase().includes(needle)
        && !(row.serviceTitle ?? '').toLowerCase().includes(needle)) return false;
      if (category !== 'all' && !row.categories.includes(category)) return false;
      if (status === 'resolved' && !row.resolved) return false;
      if (status === 'unresolved' && row.resolved) return false;
      return true;
    });
  }, [rows, search, category, status]);

  if (occupant === null) return <p class="cz-station-empty">{NO_TIER_MESSAGE}</p>;
  if (rows.length === 0) return <p class="cz-station-empty">{NO_ROWS_MESSAGE}</p>;

  return (
    <div class="cz-tier-workspace__rs">
      <div class="cz-tier-workspace__rs-toolbar">
        <input
          type="search"
          class="cz-tier-workspace__rs-search"
          placeholder="Search rows…"
          aria-label="Search Rate Sheet rows"
          value={search}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
        />
        {categories.length > 0 && (
          <select
            class="cz-tier-workspace__rs-filter"
            aria-label="Filter by category"
            value={category}
            onChange={(e) => setCategory((e.target as HTMLSelectElement).value)}
          >
            <option value="all">All categories</option>
            {categories.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
        )}
        <select
          class="cz-tier-workspace__rs-filter"
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus((e.target as HTMLSelectElement).value as typeof status)}
        >
          <option value="all">All statuses</option>
          <option value="resolved">Resolved</option>
          <option value="unresolved">Unresolved</option>
        </select>
        <span class="cz-tier-workspace__rs-count">{visible.length} of {rows.length}</span>
      </div>

      <ul class="cz-tier-workspace__rs-rows">
        {visible.map((row) => <DetailsRow row={row} onIntent={onIntent} key={row.recordId} />)}
      </ul>
    </div>
  );
}

function DetailsRow({ row, onIntent }: { row: TierDetailsRow; onIntent: StationIntentDispatch }): VNode {
  return (
    <li class="cz-tier-workspace__rs-row">
      <div class="cz-tier-workspace__rs-main">
        <span class="cz-tier-workspace__rs-title">
          {row.label}
          {!row.resolved && <span class="cz-tier-workspace__rs-badge cz-tier-workspace__rs-badge--unresolved">Unresolved</span>}
          {row.resolved && !row.inFamilyScope && (
            <span class="cz-tier-workspace__rs-badge cz-tier-workspace__rs-badge--scope">Outside Family scope</span>
          )}
        </span>
        <span class="cz-tier-workspace__rs-meta">
          {row.serviceTitle ?? 'Unknown Service'}
          {row.categories.length > 0 && <> · {row.categories.join(', ')}</>}
          {row.groupLabel !== null && <> · {row.groupLabel}</>}
        </span>
      </div>
      <div class="cz-tier-workspace__rs-figures">
        {row.unitPrice !== null && row.per !== null
          ? <span>${row.unitPrice.toFixed(2)} {row.per}</span>
          : <span>—</span>}
        <span>× {row.tierQuantity}</span>
        {row.quantityDiffers && row.sheetQuantity !== null && (
          <span class="cz-tier-workspace__rs-meta" title="The Rate Sheet row's own quantity differs from this Tier's selected quantity.">
            sheet default × {row.sheetQuantity}
          </span>
        )}
        {row.lineTotal !== null && <strong>${row.lineTotal.toFixed(2)}</strong>}
      </div>
      <div class="cz-tier-workspace__rs-actions">
        <button type="button" class="cz-tier-workspace__rs-btn" onClick={() => onIntent(row.recordId, 'rate-row-view')}>View</button>
        <button type="button" class="cz-tier-workspace__rs-btn cz-tier-workspace__rs-btn--primary" onClick={() => onIntent(row.recordId, 'rate-row-edit')}>Edit</button>
      </div>
    </li>
  );
}

// ── Connections ──────────────────────────────────────────────────────────────

function ConnectionsPanel({ family, occupant, onIntent }: Props): VNode {
  const model = useMemo(
    () => projectRateSheetConnections({
      station: family.station,
      tierSelections: (occupant?.selections ?? []).map((selection) => ({
        item_id: selection.item_id,
        quantity: selection.quantity,
      })),
      familyRelatedServiceIds: family.relatedServiceIds,
    }),
    [family, occupant],
  );

  if (!model.configured) return <p class="cz-station-empty">{NO_SHEET_MESSAGE}</p>;

  return (
    <div class="cz-tier-workspace__rs">
      {/* The one genuine Rate Sheet — the station-owned singleton configuration.
          It has no standalone persisted identity, and none is shown. */}
      <div class="cz-tier-workspace__rs-summary">
        <div class="cz-tier-workspace__rs-summary-title">
          <h4 class="cz-tier-workspace__rs-heading">{model.title || 'Rate Sheet'}</h4>
          <span class="cz-tier-workspace__rs-meta">Station Rate Sheet configuration</span>
        </div>
        <dl class="cz-tier-workspace__rs-stats">
          <div><dt>Rows</dt><dd>{model.rowCount}</dd></div>
          <div><dt>Resolved</dt><dd>{model.resolvedCount} / {model.rowCount}</dd></div>
          <div><dt>Selected by this Tier</dt><dd>{model.tierSelectedCount}</dd></div>
          <div><dt>In {family.name} scope</dt><dd>{model.familyApplicableCount}</dd></div>
        </dl>
        {(model.groups.length > 0 || model.ungroupedCount > 0) && (
          <div class="cz-tier-workspace__rs-chips">
            {model.groups.map((group) => (
              <span class="cz-tier-workspace__rs-chip" key={group.groupId}>{group.label} ({group.rowCount})</span>
            ))}
            {model.ungroupedCount > 0 && <span class="cz-tier-workspace__rs-chip">Ungrouped ({model.ungroupedCount})</span>}
          </div>
        )}
        {model.providers.length > 0 && (
          <p class="cz-tier-workspace__rs-meta">
            Supplied by {model.providers.map((provider) => `${provider.title ?? 'Unknown Service'} (${provider.rowCount})`).join(', ')}
          </p>
        )}
      </div>

      <ul class="cz-tier-workspace__rs-rows">
        {model.rows.map((row) => (
          <li class="cz-tier-workspace__rs-row" key={row.recordId}>
            <div class="cz-tier-workspace__rs-main">
              <span class="cz-tier-workspace__rs-title">
                {row.label}
                {!row.resolved && <span class="cz-tier-workspace__rs-badge cz-tier-workspace__rs-badge--unresolved">Unresolved</span>}
                {row.tierSelected && <span class="cz-tier-workspace__rs-badge cz-tier-workspace__rs-badge--selected">Tier-selected</span>}
              </span>
              <span class="cz-tier-workspace__rs-meta">
                {row.sourceType === 'inclusion' ? 'Feature' : row.sourceType === 'faq' ? 'Common Question' : 'Unknown source'}
                {row.serviceTitle !== null && <> · {row.serviceTitle}</>}
                {row.groupLabel !== null && <> · {row.groupLabel}</>}
              </span>
            </div>
            <div class="cz-tier-workspace__rs-figures">
              <span>${row.unitPrice.toFixed(2)} {row.per}</span>
              <span>× {row.quantity}</span>
            </div>
            <div class="cz-tier-workspace__rs-actions">
              <button type="button" class="cz-tier-workspace__rs-btn" onClick={() => onIntent(row.recordId, 'rate-row-view')}>View</button>
              <button type="button" class="cz-tier-workspace__rs-btn cz-tier-workspace__rs-btn--primary" onClick={() => onIntent(row.recordId, 'rate-row-edit')}>Edit</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Settings ─────────────────────────────────────────────────────────────────

function SettingsPanel({ family, onIntent }: Pick<Props, 'family' | 'onIntent'>): VNode {
  const sheet = family.station.rateSheet;

  return (
    <ul class="cz-tier-workspace__settings">
      <li class="cz-tier-workspace__settings-item">
        <div class="cz-tier-workspace__rs-main">
          <span class="cz-tier-workspace__rs-title">Package Family</span>
          <span class="cz-tier-workspace__rs-meta">Create a commercial Family group. Existing Families are managed from their own wall.</span>
        </div>
        <button
          type="button"
          class="cz-tier-workspace__rs-btn cz-tier-workspace__rs-btn--primary"
          onClick={() => onIntent('new', 'create-package-family')}
        >
          + Family Group
        </button>
      </li>

      <li class="cz-tier-workspace__settings-item">
        <div class="cz-tier-workspace__rs-main">
          <span class="cz-tier-workspace__rs-title">Rate Sheet</span>
          <span class="cz-tier-workspace__rs-meta">
            {sheet
              ? `Configured — “${sheet.title || 'Rate Sheet'}” with ${sheet.items.length} row${sheet.items.length === 1 ? '' : 's'}. The station owns one Rate Sheet.`
              : 'Not configured yet. Initialise the station’s one Rate Sheet.'}
          </span>
        </div>
        {!sheet && (
          <button
            type="button"
            class="cz-tier-workspace__rs-btn cz-tier-workspace__rs-btn--primary"
            onClick={() => onIntent('new', 'setup-rate-sheet')}
          >
            + Rate Sheet
          </button>
        )}
      </li>

      {/* Named explicitly: a RATE SHEET group (sheet organisation), not a
          Package relationship group and not a Package Family. Only offered once
          the sheet exists. */}
      {sheet && (
        <li class="cz-tier-workspace__settings-item">
          <div class="cz-tier-workspace__rs-main">
            <span class="cz-tier-workspace__rs-title">Rate Sheet Group</span>
            <span class="cz-tier-workspace__rs-meta">
              Add a group to organise the sheet's rows ({sheet.groups.length} so far). Rows join a group from their row editor.
            </span>
          </div>
          <button
            type="button"
            class="cz-tier-workspace__rs-btn cz-tier-workspace__rs-btn--primary"
            onClick={() => onIntent('new', 'create-rate-sheet-group')}
          >
            + Rate Sheet Group
          </button>
        </li>
      )}
    </ul>
  );
}
