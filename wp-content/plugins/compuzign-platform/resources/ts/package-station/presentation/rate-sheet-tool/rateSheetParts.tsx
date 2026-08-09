// Rate Sheet tool — the shared `cz-rate-sheet-tool__groups` and
// `cz-rate-sheet-tool__grid` presentations.
//
// These are the ONE implementation of the Rate Sheet groups block (editable
// only — a group's read-side identity is its module header, owned by whichever
// drawer addresses it, never a second summary here) and the Rate Sheet pricing
// grid (both readable and editable forms). They were extracted from
// ./RateSheetTool once a second genuine consumer arrived — the focused Tier's
// Connections drawers, which show the SAME sheet scoped to the rows one Tier
// connects to. Same semantics, same Package Station ownership, one
// implementation: extraction, never a second editor.
//
// Every part is presentation-only. It renders the rows it is handed, addresses
// them by the model's own `rowKey`, and reports edits through narrow command
// interfaces the Rate Sheet controller already satisfies. It reads no state,
// calls no endpoint, and mints no id.

import { useState } from 'preact/hooks';
import type { ComponentChildren, VNode } from 'preact';
import { BUILT_IN_RATE_SHEET_UNITS } from '../../types';
import type { PackageRateSheetUnit } from '../../types';
import { priceOptionKey, rowKey } from '../../surface/rateSheetTool/rateSheetToolModel';
import type {
  RateSheetEditorGroup,
  RateSheetEditorRow,
} from '../../surface/rateSheetTool/rateSheetToolModel';

const UNIT_PRICE_FORMAT = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2,
});

export function formatUnitPrice(price: number): string {
  return UNIT_PRICE_FORMAT.format(price);
}

/** Group edits the block reports back. `RateSheetToolController` satisfies it. */
export interface RateSheetGroupCommands {
  renameGroup: (groupId: string, label: string) => void;
  deleteGroup: (groupId: string) => void;
}

/** Row edits the grid reports back. `RateSheetToolController` satisfies it. */
export interface RateSheetRowCommands {
  setRowUnitPrice: (rowId: string, unitPrice: number) => void;
  setRowPer:       (rowId: string, per: PackageRateSheetUnit) => void;
  setRowQuantity:  (rowId: string, quantity: number) => void;
  setRowGroup:     (rowId: string, groupId: string | null) => void;
  removeRow:       (rowId: string) => void;
  /** Creates a group in this sheet and returns its stored id, or null if blank. */
  createGroup:     (label: string) => string | null;
  /** Adds a unit to the Manager vocabulary and returns the settled label. */
  createUnit:      (label: string) => PackageRateSheetUnit | null;
  renameUnit:      (unit: PackageRateSheetUnit, label: string) => PackageRateSheetUnit | null;
  renameGroup:     (groupId: string, label: string) => void;
  deleteGroup:     (groupId: string) => void;
  // A row's own zero-or-more alternative unit prices — children of the row,
  // never a second row, never Rate-Sheet-wide. `RateSheetToolController`
  // satisfies these too; only `RateSheetUnitPriceOptionEditor` below (the
  // standalone drawer's active-row Unit Price cell) ever calls them.
  /** Adds a blank price option to the row and returns its key. */
  addPriceOption:          (rowId: string) => string;
  removePriceOption:       (rowId: string, optionKey: string) => void;
  setPriceOptionLabel:     (rowId: string, optionKey: string, label: string) => void;
  setPriceOptionUnitPrice: (rowId: string, optionKey: string, unitPrice: number) => void;
}

/**
 * The standalone Rate Sheet drawer's one-row-at-a-time lock. Optional and
 * additive: when a caller doesn't pass it, `RateSheetGridEditor` renders
 * exactly as it always has (every row live-editable, plain Remove) — this is
 * what keeps the focused-Tier connection drawers (`TierRateSheetDrawer.tsx`,
 * `allowRemove={false}`) byte-for-byte unchanged. `RateSheetToolController`
 * satisfies this directly; Save/Remove/Delete all persist through the same
 * full-manager save the controller already uses, never a row-scoped endpoint.
 */
export interface RateSheetRowLockCommands {
  editingRowId:         string | null;
  saving:                boolean;
  saveError:             string | null;
  beginRowEdit:          (rowId: string) => void;
  cancelRowEdit:         () => void;
  saveActiveRow:         () => Promise<void>;
  removeRowImmediately:  (rowId: string) => Promise<void>;
}

// ── SECTION: inline create ────────────────────────────────────────────────────

/**
 * A picker that can also create the thing it is picking. Both row dropdowns need
 * exactly this — pick an existing value, or name a new one and have it selected
 * on the row that asked — so the behaviour is written once here rather than
 * twice inline. It mints nothing itself: `onCreate` returns the value that was
 * settled on, and only that value is selected.
 *
 * The interaction follows the established Service Station pattern: a sentinel
 * option swaps the select for an input, Enter commits, Escape abandons, and blur
 * commits so a click elsewhere does not silently discard the name.
 */
const ADD_SENTINEL = '__add__';
const EDIT_SENTINEL = '__edit__';

export function InlineCreateSelect({
  value, disabled, ariaLabel, addLabel, editLabel, editValues, placeholder, children,
  onSelect, onCreate, onRename, onDelete,
}: {
  value:       string;
  disabled:    boolean;
  ariaLabel:   string;
  addLabel:    string;
  editLabel:   string;
  editValues:  readonly { value: string; label: string }[];
  placeholder: string;
  children:    ComponentChildren;
  onSelect:    (next: string) => void;
  onCreate:    (label: string) => string | null;
  onRename:    (value: string, label: string) => void;
  onDelete?:   (value: string) => void;
}): VNode {
  const [adding, setAdding] = useState(false);
  const [managing, setManaging] = useState(false);
  const [draft, setDraft] = useState('');

  const commit = () => {
    const settled = onCreate(draft);
    if (settled !== null) onSelect(settled);
    setDraft('');
    setAdding(false);
  };

  if (adding) {
    return (
      <input
        class="cz-tf-control cz-tf-input"
        value={draft}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus
        onInput={(event) => setDraft((event.currentTarget as HTMLInputElement).value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') { event.preventDefault(); commit(); }
          if (event.key === 'Escape') { setDraft(''); setAdding(false); }
        }}
      />
    );
  }


  if (managing) {
    return (
      <div class="cz-rate-sheet-tool__inline-values" aria-label={editLabel}>
        {editValues.length === 0 ? (
          <span class="cz-rate-sheet-tool__picker-note">No editable values.</span>
        ) : editValues.map((entry) => (
          <div key={entry.value} class="cz-rate-sheet-tool__inline-value">
            <input
              class="cz-tf-control cz-tf-input"
              defaultValue={entry.label}
              aria-label={`Rename ${entry.label}`}
              onBlur={(event) => onRename(entry.value, (event.currentTarget as HTMLInputElement).value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') (event.currentTarget as HTMLInputElement).blur();
                if (event.key === 'Escape') setManaging(false);
              }}
            />
            {onDelete && (
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => onDelete(entry.value)}>Delete</button>
            )}
          </div>
        ))}
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => setManaging(false)}>Done</button>
      </div>
    );
  }

  return (
    <select
      class="cz-tf-control cz-tf-select"
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(event) => {
        const next = (event.currentTarget as HTMLSelectElement).value;
        if (next === ADD_SENTINEL) { setAdding(true); return; }
        if (next === EDIT_SENTINEL) { setManaging(true); return; }
        onSelect(next);
      }}
    >
      {children}
      <option disabled>────────────</option>
      <option value={ADD_SENTINEL}>{addLabel}</option>
      <option value={EDIT_SENTINEL}>{editLabel}</option>
    </select>
  );
}

// ── SECTION: groups block ─────────────────────────────────────────────────────

/** The editable groups block — rename in place, delete explicitly. */
export function RateSheetGroupsEditor({
  groups, commands,
}: {
  groups:   readonly RateSheetEditorGroup[];
  commands: RateSheetGroupCommands;
}): VNode {
  return (
    <div class="cz-rate-sheet-tool__groups" aria-label="Rate Sheet groups">
      {groups.map((group) => (
        <div key={group.id} class="cz-rate-sheet-tool__group-row">
          <input class="cz-tf-control cz-tf-input" value={group.label} aria-label={`Group name for ${group.label}`}
            onInput={(event) => commands.renameGroup(group.id, (event.currentTarget as HTMLInputElement).value)} />
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" aria-label={`Delete group ${group.label}`} onClick={() => commands.deleteGroup(group.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}

// ── SECTION: pricing grid ─────────────────────────────────────────────────────

/** The readable pricing grid over the rows it is handed, in the given order. */
export function RateSheetGridRead({
  rows, groups,
}: {
  rows:   readonly RateSheetEditorRow[];
  groups: readonly RateSheetEditorGroup[];
}): VNode {
  return (
    <div class="cz-rate-sheet-tool__grid-wrap">
      <table class="cz-rate-sheet-tool__grid">
        <thead><tr><th scope="col">Supplied content</th><th scope="col">Unit Price</th><th scope="col">Per</th><th scope="col">Qty</th><th scope="col">Group</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              <td class="cz-rate-sheet-tool__cell-name">
                <div class="cz-rate-sheet-tool__cell-name-stack">
                  <span>{row.optionLabel}{row.sourceAvailable ? '' : ' — Unavailable'}</span>
                  <small>{row.platformId || (row.id ? 'Platform ID not assigned' : 'Platform ID assigned after Save')}</small>
                </div>
              </td>
              <td>{formatUnitPrice(row.unitPrice)}</td>
              <td>{row.per}</td>
              <td>{row.quantity}</td>
              <td>{groups.find((group) => group.id === row.groupId)?.label ?? 'Ungrouped'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The editable pricing grid over the rows it is handed.
 *
 * `allowRemove` selects whether the Remove column is offered. Removing a row
 * deletes it from the sheet for every consumer, so it belongs to the view that
 * holds the whole sheet; a scope showing one Tier's rows omits it and keeps
 * repricing and regrouping. The capability is not reduced — it stays where the
 * whole sheet is visible.
 *
 * `lockCommands` opts into the standalone Rate Sheet drawer's one-row-lock
 * editor (Edit/Save/Cancel/Remove/Delete). Omitted, every row stays live-
 * editable exactly as before — the focused-Tier connection drawers rely on
 * that default and never pass it.
 */
export function RateSheetGridEditor({
  rows, groups, units, commands, allowRemove = true, lockCommands,
}: {
  rows:     readonly RateSheetEditorRow[];
  groups:   readonly RateSheetEditorGroup[];
  units:    readonly PackageRateSheetUnit[];
  commands: RateSheetRowCommands;
  allowRemove?: boolean;
  lockCommands?: RateSheetRowLockCommands;
}): VNode {
  return (
    <div class="cz-rate-sheet-tool__grid-wrap">
      <table class="cz-rate-sheet-tool__grid">
        <thead>
          <tr>
            <th scope="col">Supplied content</th>
            <th scope="col">Unit Price</th>
            <th scope="col">Per</th>
            <th scope="col">Qty</th>
            <th scope="col">Group</th>
            {allowRemove && <th scope="col" aria-label="Row actions"></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <RateSheetEditRow
              key={rowKey(row)}
              row={row}
              groups={groups}
              units={units}
              commands={commands}
              allowRemove={allowRemove}
              lockCommands={lockCommands}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The five data cells, identical whether the row is live-editable (no lock)
 *  or the active row of a locked grid. Extracted once so the locked editor
 *  never re-authors the same inputs the always-editable grid already has. */
function RateSheetRowFieldCells({
  row, groups, units, commands, disabled, showPriceOptions = false,
}: {
  row:      RateSheetEditorRow;
  groups:   readonly RateSheetEditorGroup[];
  units:    readonly PackageRateSheetUnit[];
  commands: RateSheetRowCommands;
  disabled: boolean;
  // Standalone-drawer-only: the locked row lock's active-row branch opts in
  // so its Unit Price cell becomes the tabbed Default/Option editor.
  // Omitted (every other caller — the always-editable grid the focused-Tier
  // connection drawers use) keeps the plain input byte-for-byte unchanged.
  showPriceOptions?: boolean;
}): VNode {
  const key = rowKey(row);
  return (
    <>
      <td class="cz-rate-sheet-tool__cell-name">
        <div class="cz-rate-sheet-tool__cell-name-stack">
          <span>{row.optionLabel}{disabled ? ' — Unavailable' : ''}</span>
          <small>{row.platformId || (row.id ? 'Platform ID not assigned' : 'Platform ID assigned after Save')}</small>
        </div>
      </td>
      <td>
        {showPriceOptions ? (
          <RateSheetUnitPriceOptionEditor row={row} commands={commands} disabled={disabled} />
        ) : (
          <input class="cz-tf-control cz-tf-input" type="number" min="0" step="0.01" value={row.unitPrice} disabled={disabled}
            aria-label={`Unit price for ${row.optionLabel}`}
            onInput={(event) => commands.setRowUnitPrice(key, Number((event.currentTarget as HTMLInputElement).value))} />
        )}
      </td>
      <td>
        <InlineCreateSelect
          value={row.per}
          disabled={disabled}
          ariaLabel={`Unit for ${row.optionLabel}`}
          addLabel="+ Add new unit"
          editLabel="Edit Per values"
          editValues={units
            .filter((unit) => !(BUILT_IN_RATE_SHEET_UNITS as readonly string[]).includes(unit))
            .map((unit) => ({ value: unit, label: unit }))}
          placeholder="New unit name"
          onSelect={(next) => commands.setRowPer(key, next)}
          onCreate={commands.createUnit}
          onRename={(unit, label) => { commands.renameUnit(unit, label); }}
        >
          {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
        </InlineCreateSelect>
      </td>
      <td>
        <input class="cz-tf-control cz-tf-input" type="number" min="1" step="1" value={row.quantity} disabled={disabled}
          aria-label={`Quantity for ${row.optionLabel}`}
          onInput={(event) => commands.setRowQuantity(key, Number((event.currentTarget as HTMLInputElement).value))} />
      </td>
      <td>
        <InlineCreateSelect
          value={row.groupId ?? ''}
          disabled={disabled}
          ariaLabel={`Group for ${row.optionLabel}`}
          addLabel="+ Add new group"
          editLabel="Edit Group values"
          editValues={groups.map((group) => ({ value: group.id, label: group.label }))}
          placeholder="New group name"
          onSelect={(next) => commands.setRowGroup(key, next === '' ? null : next)}
          onCreate={commands.createGroup}
          onRename={commands.renameGroup}
          onDelete={commands.deleteGroup}
        >
          <option value="">Ungrouped</option>
          {groups.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}
        </InlineCreateSelect>
      </td>
    </>
  );
}

/**
 * The Unit Price cell's own tabbed editor — `[ Default Price ] [ Option 1 ]
 * [ Option 2 ] [+]` — for the standalone drawer's active row only. Default
 * Price is not Option 0: selecting it edits the row's own existing
 * `unit_price` through the exact same `setRowUnitPrice` the plain input
 * always used. An option tab edits `row.priceOptions[n]`'s own `label`/
 * `unitPrice`. `selectedTab` is local, ephemeral presentation state — never
 * part of `RateSheetToolController`, never persisted — and resets to
 * Default Price on every mount, i.e. every time this row becomes active,
 * since this component is only rendered inside that branch.
 */
function RateSheetUnitPriceOptionEditor({
  row, commands, disabled,
}: {
  row:      RateSheetEditorRow;
  commands: RateSheetRowCommands;
  disabled: boolean;
}): VNode {
  const rowId = rowKey(row);
  const [selectedTab, setSelectedTab] = useState<string>('default');
  const selectedOption = selectedTab === 'default'
    ? null
    : row.priceOptions.find((option) => priceOptionKey(option) === selectedTab) ?? null;

  return (
    <div class="cz-rate-sheet-tool__price-options">
      <div class="cz-rate-sheet-tool__price-options-tabs" role="tablist" aria-label={`Unit Price options for ${row.optionLabel}`}>
        <button type="button" role="tab" aria-selected={selectedTab === 'default'}
          class={`cz-rate-sheet-tool__price-options-tab${selectedTab === 'default' ? ' cz-rate-sheet-tool__price-options-tab--active' : ''}`}
          onClick={() => setSelectedTab('default')}>
          Default Price
        </button>
        {row.priceOptions.map((option, index) => {
          const optionTabKey = priceOptionKey(option);
          return (
            <button type="button" role="tab" key={optionTabKey} aria-selected={selectedTab === optionTabKey}
              class={`cz-rate-sheet-tool__price-options-tab${selectedTab === optionTabKey ? ' cz-rate-sheet-tool__price-options-tab--active' : ''}`}
              onClick={() => setSelectedTab(optionTabKey)}>
              {option.label.trim() || `Option ${index + 1}`}
            </button>
          );
        })}
        {!disabled && (
          <button type="button" class="cz-rate-sheet-tool__price-options-tab cz-rate-sheet-tool__price-options-tab--add"
            aria-label={`Add price option for ${row.optionLabel}`}
            onClick={() => setSelectedTab(commands.addPriceOption(rowId))}>
            +
          </button>
        )}
      </div>
      {selectedOption === null ? (
        <input class="cz-tf-control cz-tf-input" type="number" min="0" step="0.01" value={row.unitPrice} disabled={disabled}
          aria-label={`Unit price for ${row.optionLabel}`}
          onInput={(event) => commands.setRowUnitPrice(rowId, Number((event.currentTarget as HTMLInputElement).value))} />
      ) : (
        <div class="cz-rate-sheet-tool__price-option-fields">
          <input class="cz-tf-control cz-tf-input" type="text" value={selectedOption.label} disabled={disabled}
            placeholder="Option label"
            aria-label={`Label for price option of ${row.optionLabel}`}
            onInput={(event) => commands.setPriceOptionLabel(rowId, selectedTab, (event.currentTarget as HTMLInputElement).value)} />
          <input class="cz-tf-control cz-tf-input" type="number" min="0" step="0.01" value={selectedOption.unitPrice} disabled={disabled}
            aria-label={`Unit price for price option of ${row.optionLabel}`}
            onInput={(event) => commands.setPriceOptionUnitPrice(rowId, selectedTab, Number((event.currentTarget as HTMLInputElement).value))} />
          {!disabled && (
            <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
              aria-label={`Remove price option ${selectedOption.label || `Option`}`}
              onClick={() => { commands.removePriceOption(rowId, selectedTab); setSelectedTab('default'); }}>
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * A locked row's own zero-or-more Price Options, read-only. Deliberately not
 * the edit editor's tab strip — nothing here is selectable/clickable; it is
 * a static list inside the same Unit Price cell so a locked row with Price
 * Options still reads at a glance, no click required. Default is the row's
 * own existing `unitPrice`, listed first and always present; each further
 * line is one `row.priceOptions[]` entry, labelled exactly as the edit tab
 * strip labels an unlabeled option (`Option ${index + 1}`) so the two
 * presentations never disagree on a row's own option names.
 */
function RateSheetPriceOptionsSummary({ row }: { row: RateSheetEditorRow }): VNode {
  return (
    <div class="cz-rate-sheet-tool__price-options-summary" aria-label={`Price options for ${row.optionLabel}`}>
      <p class="cz-rate-sheet-tool__price-options-summary-title">Price Options</p>
      <ul class="cz-rate-sheet-tool__price-options-summary-list">
        <li class="cz-rate-sheet-tool__price-options-summary-row">
          <span class="cz-rate-sheet-tool__price-options-summary-label">Default</span>
          <span class="cz-rate-sheet-tool__price-options-summary-value">{formatUnitPrice(row.unitPrice)}</span>
        </li>
        {row.priceOptions.map((option, index) => (
          <li key={priceOptionKey(option)} class="cz-rate-sheet-tool__price-options-summary-row">
            <span class="cz-rate-sheet-tool__price-options-summary-label">{option.label.trim() || `Option ${index + 1}`}</span>
            <span class="cz-rate-sheet-tool__price-options-summary-value">{formatUnitPrice(option.unitPrice)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The same five cells, read-only — a locked row's presentation. A row with
 *  zero Price Options keeps the plain Unit Price value, byte-for-byte as
 *  before; only a row that actually has Price Options gains the compact
 *  summary in the same cell. */
function RateSheetRowReadCells({
  row, groups,
}: {
  row:    RateSheetEditorRow;
  groups: readonly RateSheetEditorGroup[];
}): VNode {
  return (
    <>
      <td class="cz-rate-sheet-tool__cell-name">
        <div class="cz-rate-sheet-tool__cell-name-stack">
          <span>{row.optionLabel}{row.sourceAvailable ? '' : ' — Unavailable'}</span>
          <small>{row.platformId || (row.id ? 'Platform ID not assigned' : 'Platform ID assigned after Save')}</small>
        </div>
      </td>
      <td>{row.priceOptions.length > 0 ? <RateSheetPriceOptionsSummary row={row} /> : formatUnitPrice(row.unitPrice)}</td>
      <td>{row.per}</td>
      <td>{row.quantity}</td>
      <td>{groups.find((group) => group.id === row.groupId)?.label ?? 'Ungrouped'}</td>
    </>
  );
}

function RateSheetEditRow({
  row, groups, units, commands, allowRemove, lockCommands,
}: {
  row:      RateSheetEditorRow;
  groups:   readonly RateSheetEditorGroup[];
  units:    readonly PackageRateSheetUnit[];
  commands: RateSheetRowCommands;
  allowRemove: boolean;
  lockCommands?: RateSheetRowLockCommands;
}): VNode {
  const key = rowKey(row);
  const disabled = !row.sourceAvailable;

  if (lockCommands) {
    const isActive = lockCommands.editingRowId === key;

    if (!isActive) {
      // Locked (default) state: read-only fields, Edit + Remove. Edit is
      // refused while another row is already active; Remove persists
      // immediately (through the same full-manager save), so it is refused
      // too — a second in-flight mutation while one is already resolving
      // would race the same save transaction.
      const otherRowActive = lockCommands.editingRowId !== null;
      const busy = otherRowActive || lockCommands.saving;
      return (
        <tr>
          <RateSheetRowReadCells row={row} groups={groups} />
          {allowRemove && (
            <td>
              <div style="display:flex;gap:var(--cz-space-2)">
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                  aria-label={`Edit ${row.optionLabel}`} disabled={busy}
                  onClick={() => lockCommands.beginRowEdit(key)}>Edit</button>
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                  aria-label={`Remove ${row.optionLabel}`} disabled={busy}
                  onClick={() => { void lockCommands.removeRowImmediately(key); }}>Remove</button>
              </div>
            </td>
          )}
        </tr>
      );
    }

    // Editing (active) state: live fields, same commands as the always-
    // editable grid. Save/Delete persist through the full-manager save;
    // Cancel is local only. A not-yet-saved row (blank `id`) has no Delete —
    // Cancel is its only way to discard, since it represents nothing
    // committed yet.
    const isNewRow = row.id === '';
    return (
      <tr>
        <RateSheetRowFieldCells row={row} groups={groups} units={units} commands={commands} disabled={disabled} showPriceOptions />
        {allowRemove && (
          <td>
            <div style="display:flex;gap:var(--cz-space-2)">
              <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm"
                aria-label={`Save ${row.optionLabel}`} disabled={lockCommands.saving}
                onClick={() => { void lockCommands.saveActiveRow(); }}>{lockCommands.saving ? 'Saving…' : 'Save'}</button>
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                aria-label={`Cancel editing ${row.optionLabel}`} disabled={lockCommands.saving}
                onClick={() => lockCommands.cancelRowEdit()}>Cancel</button>
              {!isNewRow && (
                <button type="button" class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--sm"
                  aria-label={`Delete ${row.optionLabel}`} disabled={lockCommands.saving}
                  onClick={() => { void lockCommands.removeRowImmediately(key); }}>Delete</button>
              )}
            </div>
          </td>
        )}
      </tr>
    );
  }

  // No lock offered: the original always-editable row, unchanged.
  return (
    <tr>
      <RateSheetRowFieldCells row={row} groups={groups} units={units} commands={commands} disabled={disabled} />
      {allowRemove && (
        <td>
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" aria-label={`Remove ${row.optionLabel}`} onClick={() => commands.removeRow(key)}>Remove</button>
        </td>
      )}
    </tr>
  );
}
