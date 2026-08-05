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
import { rowKey } from '../../surface/rateSheetTool/rateSheetToolModel';
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

function InlineCreateSelect({
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
 */
export function RateSheetGridEditor({
  rows, groups, units, commands, allowRemove = true,
}: {
  rows:     readonly RateSheetEditorRow[];
  groups:   readonly RateSheetEditorGroup[];
  units:    readonly PackageRateSheetUnit[];
  commands: RateSheetRowCommands;
  allowRemove?: boolean;
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
            {allowRemove && <th scope="col" aria-label="Remove"></th>}
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
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RateSheetEditRow({
  row, groups, units, commands, allowRemove,
}: {
  row:      RateSheetEditorRow;
  groups:   readonly RateSheetEditorGroup[];
  units:    readonly PackageRateSheetUnit[];
  commands: RateSheetRowCommands;
  allowRemove: boolean;
}): VNode {
  const key = rowKey(row);
  const disabled = !row.sourceAvailable;
  return (
    <tr>
      <td class="cz-rate-sheet-tool__cell-name">
        <div class="cz-rate-sheet-tool__cell-name-stack">
          <span>{row.optionLabel}{disabled ? ' — Unavailable' : ''}</span>
          <small>{row.platformId || (row.id ? 'Platform ID not assigned' : 'Platform ID assigned after Save')}</small>
        </div>
      </td>
      <td>
        <input class="cz-tf-control cz-tf-input" type="number" min="0" step="0.01" value={row.unitPrice} disabled={disabled}
          aria-label={`Unit price for ${row.optionLabel}`}
          onInput={(event) => commands.setRowUnitPrice(key, Number((event.currentTarget as HTMLInputElement).value))} />
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
      {allowRemove && (
        <td>
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" aria-label={`Remove ${row.optionLabel}`} onClick={() => commands.removeRow(key)}>Remove</button>
        </td>
      )}
    </tr>
  );
}
