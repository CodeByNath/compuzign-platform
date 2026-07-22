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
// Responsibilities are deliberately distinct:
//
//   Details     — the focused Tier's OWN inclusion rows (pure
//                 projectTierDetails): the compact operational list, with row
//                 View / Edit dispatching each Rate Sheet row's own item_id to
//                 the rate-sheet-row drawer.
//   Connections — the station's ONE genuine Rate Sheet in its relationship
//                 context (pure projectRateSheetConnections): coverage against
//                 the focused Family and Tier, providers, groups, and only the
//                 rows that explain coverage — unresolved rows and rows the
//                 focused Tier does NOT select. Tier-selected rows are counted
//                 here, operated on in Details.
//   Settings    — the station-level creation actions (pure
//                 projectWorkspaceSettings): Package Family (station-wide),
//                 Rate Sheet setup (only while unconfigured), Rate Sheet Group
//                 (only once the sheet exists). Creation names no existing
//                 record, so these dispatch the stable 'new' sentinel.
//
// Every empty state names what exists and the next valid action (pure
// resolveTierDetailsEmptyState) — never a dead instruction.

import { useMemo, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { StationIntentDispatch } from '../templateKits';
import type { PackageTierWorkspaceFamily, WorkspaceOccupant } from '../../stations/packageTierWorkspace/projection';
import {
  partitionConnectionsRows,
  projectRateSheetConnections,
  projectTierDetails,
  projectWorkspaceSettings,
  resolveTierDetailsEmptyState,
  type ConnectionsRow,
  type TierDetailsRow,
  type WorkspaceEmptyState,
} from '../../stations/packageTierWorkspace/rateSheetProjection';

type LowerTab = 'details' | 'connections' | 'settings';

const LOWER_TABS: readonly { id: LowerTab; label: string }[] = [
  { id: 'details',     label: 'Details' },
  { id: 'connections', label: 'Connections' },
  { id: 'settings',    label: 'Settings' },
];

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
              id={`cz-tier-lower-tab-${entry.id}`}
              type="button"
              role="tab"
              class="cz-tier-workspace__lower-tab"
              aria-selected={tab === entry.id}
              aria-controls="cz-tier-lower-panel"
              onClick={() => setTab(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
        {/* The focused scope, restated so the deck is honest about what it
            operates on in Grid view too. Read-only: selection lives above. */}
        <p class="cz-tier-workspace__lower-context">
          <span class="cz-tier-workspace__lower-context-label">Focused scope</span>
          {family.name}
          {occupant !== null ? <> · {occupant.card.name}</> : <> · no Tier connected</>}
        </p>
      </div>

      <div
        id="cz-tier-lower-panel"
        class="cz-tier-workspace__lower-body"
        role="tabpanel"
        aria-labelledby={`cz-tier-lower-tab-${tab}`}
      >
        {tab === 'details' && <DetailsPanel family={family} occupant={occupant} onIntent={onIntent} />}
        {tab === 'connections' && <ConnectionsPanel family={family} occupant={occupant} onIntent={onIntent} />}
        {tab === 'settings' && <SettingsPanel family={family} onIntent={onIntent} />}
      </div>
    </section>
  );
}

// One deliberate empty/first-use block: what exists, then the next valid action.
function EmptyState({ state }: { state: WorkspaceEmptyState }): VNode {
  return (
    <div class="cz-tier-workspace__state">
      <p class="cz-tier-workspace__state-message">{state.message}</p>
      {state.hint !== null && <p class="cz-tier-workspace__state-hint">{state.hint}</p>}
    </div>
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

  const emptyState = resolveTierDetailsEmptyState({
    hasOccupant: occupant !== null,
    sheetConfigured: family.station.rateSheet !== null,
    rowCount: rows.length,
    familyName: family.name,
    tierName: occupant?.card.name ?? null,
  });
  if (emptyState !== null) return <EmptyState state={emptyState} />;

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

  const sections = useMemo(() => partitionConnectionsRows(model.rows), [model]);

  if (!model.configured) {
    return (
      <EmptyState state={{
        message: 'No Rate Sheet is configured for this Package Station yet.',
        hint: 'Set it up under Settings — the station owns one Rate Sheet, and its rows connect the source Services to Tier pricing.',
      }} />
    );
  }

  const tierName = occupant?.card.name ?? null;

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
          <div><dt>{tierName !== null ? `Selected by ${tierName}` : 'Selected by focused Tier'}</dt><dd>{model.tierSelectedCount}</dd></div>
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

      {sections.attention.length > 0 && (
        <ConnectionsSection
          title="Needs attention"
          hint="These rows price a relationship that no longer resolves."
          rows={sections.attention}
          onIntent={onIntent}
        />
      )}

      {sections.unselected.length > 0 && (
        <ConnectionsSection
          title={tierName !== null ? `Not selected by ${tierName}` : 'Rows on the sheet'}
          hint={tierName !== null
            ? `Available sheet rows this Tier does not include — the coverage ${tierName} leaves out.`
            : 'The sheet’s available rows. Focus a Tier above to see its coverage.'}
          rows={sections.unselected}
          onIntent={onIntent}
        />
      )}

      {model.rowCount === 0 ? (
        <p class="cz-tier-workspace__rs-meta">
          The sheet has no rows yet. Rows connect automatically as source
          Services supply content.
        </p>
      ) : sections.attention.length === 0 && sections.unselected.length === 0 && (
        <p class="cz-tier-workspace__rs-meta">
          {tierName !== null
            ? `Every resolved sheet row is selected by ${tierName}; operate on them under Details.`
            : 'Every sheet row is resolved.'}
        </p>
      )}
    </div>
  );
}

// A coverage section lists rows for understanding, so it offers View only —
// operating on a Tier's own rows stays in Details.
function ConnectionsSection({ title, hint, rows, onIntent }: {
  title: string;
  hint: string;
  rows: ConnectionsRow[];
  onIntent: StationIntentDispatch;
}): VNode {
  return (
    <div class="cz-tier-workspace__rs-section">
      <div class="cz-tier-workspace__rs-section-head">
        <h5 class="cz-tier-workspace__rs-section-title">{title} ({rows.length})</h5>
        <p class="cz-tier-workspace__rs-meta">{hint}</p>
      </div>
      <ul class="cz-tier-workspace__rs-rows">
        {rows.map((row) => (
          <li class="cz-tier-workspace__rs-row" key={row.recordId}>
            <div class="cz-tier-workspace__rs-main">
              <span class="cz-tier-workspace__rs-title">
                {row.label}
                {!row.resolved && <span class="cz-tier-workspace__rs-badge cz-tier-workspace__rs-badge--unresolved">Unresolved</span>}
                {row.resolved && !row.inFamilyScope && (
                  <span class="cz-tier-workspace__rs-badge cz-tier-workspace__rs-badge--scope">Outside Family scope</span>
                )}
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
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Settings ─────────────────────────────────────────────────────────────────

function SettingsPanel({ family, onIntent }: Pick<Props, 'family' | 'onIntent'>): VNode {
  const model = projectWorkspaceSettings(family.station);

  return (
    <div class="cz-tier-workspace__rs">
      <p class="cz-tier-workspace__rs-meta">{model.sheetStatusLine}</p>
      <ul class="cz-tier-workspace__settings">
        {model.actions.map((action) => (
          <li class="cz-tier-workspace__settings-item" key={action.id}>
            <div class="cz-tier-workspace__rs-main">
              <span class="cz-tier-workspace__rs-title">{action.title}</span>
              <span class="cz-tier-workspace__rs-meta">{action.description}</span>
            </div>
            <button
              type="button"
              class="cz-tier-workspace__rs-btn cz-tier-workspace__rs-btn--primary"
              onClick={() => onIntent('new', action.id)}
            >
              {action.buttonLabel}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
