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

function InlineCreateSelect({
  value, disabled, ariaLabel, addLabel, placeholder, children, onSelect, onCreate,
}: {
  value:       string;
  disabled:    boolean;
  ariaLabel:   string;
  addLabel:    string;
  placeholder: string;
  children:    ComponentChildren;
  onSelect:    (next: string) => void;
  onCreate:    (label: string) => string | null;
}): VNode {
  const [adding, setAdding] = useState(false);
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

  return (
    <select
      class="cz-tf-control cz-tf-select"
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(event) => {
        const next = (event.currentTarget as HTMLSelectElement).value;
        if (next === ADD_SENTINEL) { setAdding(true); return; }
        onSelect(next);
      }}
    >
      {children}
      <option value={ADD_SENTINEL}>{addLabel}</option>
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
              <td class="cz-rate-sheet-tool__cell-name">{row.optionLabel}{row.sourceAvailable ? '' : ' — Unavailable'}</td>
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
      <td class="cz-rate-sheet-tool__cell-name">{row.optionLabel}{disabled ? ' — Unavailable' : ''}</td>
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
          placeholder="New unit name"
          onSelect={(next) => commands.setRowPer(key, next)}
          onCreate={commands.createUnit}
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
          placeholder="New group name"
          onSelect={(next) => commands.setRowGroup(key, next === '' ? null : next)}
          onCreate={commands.createGroup}
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
