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

import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren, VNode } from 'preact';
import { BUILT_IN_RATE_SHEET_UNITS } from '../../types';
import type { PackageRateSheetUnit } from '../../types';
import { defaultPriceLabel } from '../../rateSheetLabels';
import { priceOptionKey, rowDisplayLabel, rowKey } from '../../surface/rateSheetTool/rateSheetToolModel';
import type {
  RateSheetEditorGroup,
  RateSheetEditorPriceOption,
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
  /** What the row's own Default Price is CALLED. Blank restores the built-in
   *  name; nothing about the price or its selection changes. */
  setRowDefaultPriceLabel: (rowId: string, label: string) => void;
  setRowPer:       (rowId: string, per: PackageRateSheetUnit) => void;
  setRowQuantity:  (rowId: string, quantity: number) => void;
  setRowGroup:     (rowId: string, groupId: string | null) => void;
  /** A Bundle row's own display label. Offered only for a row that carries one
   *  (`row.label !== undefined`); a sheet row's label has always been the
   *  Service-resolved supplied-content label and still is. */
  setRowLabel:     (rowId: string, label: string) => void;
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
                  <span>{rowDisplayLabel(row)}{row.sourceAvailable ? '' : ' — Unavailable'}</span>
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
  rows, groups, units, commands, allowRemove = true, lockCommands, nameLabel = 'Supplied content', extraColumn,
}: {
  rows:     readonly RateSheetEditorRow[];
  groups:   readonly RateSheetEditorGroup[];
  units:    readonly PackageRateSheetUnit[];
  commands: RateSheetRowCommands;
  allowRemove?: boolean;
  lockCommands?: RateSheetRowLockCommands;
  /** ONE additional column, inserted immediately after the name column and
   *  before Unit Price. Additive and optional: omitted, the grid has exactly
   *  the columns it always had. The Bundle editor uses it for `Supplied
   *  content` — what its one row compiles — which therefore never crowds the
   *  name cell and never becomes a block beneath the grid. `render` is told
   *  whether the row is the unlocked one, so a locked row can stay read-only
   *  like every other locked row here. */
  extraColumn?: {
    label:  string;
    render: (row: RateSheetEditorRow, editing: boolean) => ComponentChildren;
  };
  /** What the first column is CALLED. Additive and defaulted, so every existing
   *  caller keeps `Supplied content` byte-for-byte; the Bundle editor names it
   *  `Product Bundle`, because for that row the first cell is the combination's
   *  own name. Presentation only — no cell, command or lock changes. */
  nameLabel?: string;
}): VNode {
  return (
    <div class="cz-rate-sheet-tool__grid-wrap">
      <table class="cz-rate-sheet-tool__grid">
        <thead>
          <tr>
            <th scope="col">{nameLabel}</th>
            {extraColumn && <th scope="col">{extraColumn.label}</th>}
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
              extraColumn={extraColumn}
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
  row, groups, units, commands, disabled, showPriceOptions = false, extraColumn,
}: {
  row:      RateSheetEditorRow;
  groups:   readonly RateSheetEditorGroup[];
  units:    readonly PackageRateSheetUnit[];
  commands: RateSheetRowCommands;
  disabled: boolean;
  extraColumn?: { label: string; render: (row: RateSheetEditorRow, editing: boolean) => ComponentChildren };
  // Standalone-drawer-only: the locked row lock's active-row branch opts in
  // so its Unit Price cell becomes the Default/Option popover editor.
  // Omitted (every other caller — the always-editable grid the focused-Tier
  // connection drawers use) keeps the plain input byte-for-byte unchanged.
  showPriceOptions?: boolean;
}): VNode {
  const key = rowKey(row);
  // Every field's accessible name comes from what the row DISPLAYS, so a row
  // that names itself (a Bundle) reads by that name rather than by the supplied
  // content behind it. Identical for a sheet row, which has no name of its own.
  const rowName = rowDisplayLabel(row) || 'this row';
  return (
    <>
      <td class="cz-rate-sheet-tool__cell-name">
        <div class="cz-rate-sheet-tool__cell-name-stack">
          {row.label === undefined ? (
            <span>{row.optionLabel}{disabled ? ' — Unavailable' : ''}</span>
          ) : (
            // A row that names itself shows only that name here. What stands
            // behind it belongs in its own column, never crowded in beneath.
            <input class="cz-tf-control cz-tf-input" type="text" value={row.label} disabled={disabled}
              placeholder={row.optionLabel}
              aria-label={`Name for ${rowName}`}
              onInput={(event) => commands.setRowLabel(key, (event.currentTarget as HTMLInputElement).value)} />
          )}
          {row.label !== undefined && row.optionLabel !== '' && (
            <small>{row.optionLabel}{disabled ? ' — Unavailable' : ''}</small>
          )}
          <small>{row.platformId || (row.id ? 'Platform ID not assigned' : 'Platform ID assigned after Save')}</small>
        </div>
      </td>
      {extraColumn && <td class="cz-rate-sheet-tool__cell-extra">{extraColumn.render(row, true)}</td>}
      <td>
        {showPriceOptions ? (
          <RateSheetUnitPriceOptionEditor row={row} commands={commands} disabled={disabled} />
        ) : (
          <input class="cz-tf-control cz-tf-input" type="number" min="0" step="0.01" value={row.unitPrice} disabled={disabled}
            aria-label={`Unit price for ${rowName}`}
            onInput={(event) => commands.setRowUnitPrice(key, Number((event.currentTarget as HTMLInputElement).value))} />
        )}
      </td>
      <td>
        <InlineCreateSelect
          value={row.per}
          disabled={disabled}
          ariaLabel={`Unit for ${rowName}`}
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
          aria-label={`Quantity for ${rowName}`}
          onInput={(event) => commands.setRowQuantity(key, Number((event.currentTarget as HTMLInputElement).value))} />
      </td>
      <td>
        <InlineCreateSelect
          value={row.groupId ?? ''}
          disabled={disabled}
          ariaLabel={`Group for ${rowName}`}
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
 * The Unit Price cell's own editor — an anchored popover, opened by a plain
 * **Edit** button, for the standalone drawer's active row only. The trigger
 * stays in the cell's existing position and shows no value/price preview of
 * its own (a row can carry several prices — Default plus zero or more
 * options — so showing just the Default Price beside it would misleadingly
 * imply that's the row's only one; the locked row's own read summary,
 * `RateSheetPriceOptionsSummary`, already carries the multi-price view).
 * Edit opens a compact 2-column table anchored to that same trigger (never
 * a detached drawer/modal). The standard compact case
 * always shows exactly three editable price rows, labelled (by placeholder,
 * never committed data) **One-Time Fee** / **Annual Renewal** / **Monthly
 * Subscription** — row 1 is the row's own existing Default Price
 * (`unit_price`/`defaultPriceLabel`), rows 2 and 3 are `priceOptions[0]` and
 * `priceOptions[1]` **when present**. Default Price is not Option 0: its row
 * edits `unit_price` through the exact same `setRowUnitPrice` the plain
 * input always used, plus the NAME that price goes by (`defaultPriceLabel`
 * — admin display configuration, never an identity, never a change to how a
 * Tier selects it). If row 2 and/or row 3 has no `priceOptions[]` entry yet,
 * it still renders as an editable row (STANDARD_OPTION_PLACEHOLDERS below)
 * — but opening the popover creates nothing; `materializeStandardSlot`
 * mints the real entry, through the SAME `addPriceOption`/
 * `setPriceOptionLabel`/`setPriceOptionUnitPrice` commands every option
 * already uses, only on the admin's own first keystroke into that row (if
 * row 3 is typed into while row 2 is still missing, row 2 is minted blank
 * first so array order — and so which row each entry displays as — stays
 * correct; `priceOptions[]` has always been a plain ordered array with no
 * separate slot identity, see the `Option ${index + 1}` fallback below).
 * Every option row (standard or beyond) edits `priceOptions[n]`'s own
 * `label`/`unitPrice` directly — no tab switching, every existing price
 * visible and editable at once. A row already carrying more than two
 * options renders the extra ones after the standard three, in order,
 * `+ Add price` appends further, never capped; nothing here truncates or
 * reinterprets stored options. `open` is local, ephemeral presentation
 * state — never part of `RateSheetToolController`, never persisted — and
 * resets closed on every mount, i.e. every time this row becomes active,
 * since this component is only rendered inside that branch. The popover's
 * own small **Save** is a close affordance, not a second persistence path:
 * every field already writes through the same row-lock draft the outer
 * row's own Save/Cancel commits or discards, exactly like Per/Qty/Group/
 * Remove.
 */
const STANDARD_OPTION_PLACEHOLDERS = ['Annual Renewal', 'Monthly Subscription'] as const;
export function RateSheetPriceOptionEditor({
  ariaLabel, unitPrice, defaultLabel, priceOptions, disabled,
  onUnitPrice, onDefaultLabel, onAddOption, onRemoveOption, onOptionLabel, onOptionUnitPrice,
}: {
  ariaLabel:    string;
  unitPrice:    number;
  /** The admin's own name for that price; blank shows the built-in one. */
  defaultLabel: string;
  priceOptions: readonly RateSheetEditorPriceOption[];
  disabled:     boolean;
  onUnitPrice:  (unitPrice: number) => void;
  onDefaultLabel: (label: string) => void;
  /** Adds a blank option and returns the key that addresses it. */
  onAddOption:  () => string;
  onRemoveOption:    (optionKey: string) => void;
  onOptionLabel:     (optionKey: string, label: string) => void;
  onOptionUnitPrice: (optionKey: string, unitPrice: number) => void;
}): VNode {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // The popover's own focus/close contract: focus the first field on open;
  // Escape or an outside click closes it, returning focus to the trigger —
  // the same close behaviour whichever way it happens, so a keyboard user
  // never loses their place. Nothing here is persisted or discarded by
  // closing; every field already writes into the row's own draft as it's
  // typed, exactly like the plain input this replaces always did.
  useEffect(() => {
    if (!open) return undefined;
    firstFieldRef.current?.focus();
    const onPointerDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const close = () => { setOpen(false); triggerRef.current?.focus(); };

  // See the doc comment above: mints a still-missing standard row (2 or 3)
  // only on the admin's own first keystroke into it, seeding whichever field
  // (label or price) they actually typed into.
  const materializeStandardSlot = (index: 0 | 1, patch: { label?: string; unitPrice?: number }) => {
    if (index === 1 && priceOptions.length === 0) onAddOption();
    const key = onAddOption();
    if (patch.label !== undefined) onOptionLabel(key, patch.label);
    if (patch.unitPrice !== undefined) onOptionUnitPrice(key, patch.unitPrice);
  };

  return (
    <div class="cz-rate-sheet-tool__price-popover-wrap" ref={wrapRef}>
      {/* The trigger is a plain Edit button — never a value/price preview.
          A row can carry several prices (Default plus zero or more
          options); showing just the Default Price here would misleadingly
          imply it's the row's only one. The locked row's own read summary
          (RateSheetPriceOptionsSummary) already carries the multi-price
          view; this trigger only opens the editor that manages them all. */}
      <button type="button" ref={triggerRef} class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
        aria-haspopup="true" aria-expanded={open}
        aria-label={`Edit ${defaultPriceLabel(defaultLabel)} for ${ariaLabel}`}
        onClick={() => setOpen((value) => !value)}>
        Edit
      </button>
      {open && (
        <div class="cz-rate-sheet-tool__price-popover" role="group" aria-label={`Unit Price for ${ariaLabel}`}>
          <button type="button" class="cz-rate-sheet-tool__price-popover-close"
            aria-label={`Close price editor for ${ariaLabel}`} onClick={close}>
            ×
          </button>
          <table class="cz-rate-sheet-tool__price-popover-table">
            <tbody>
              <tr>
                <th class="cz-rate-sheet-tool__price-popover-title" colSpan={2} scope="colgroup">Unit Price</th>
              </tr>
              <tr>
                <td>
                  <input ref={firstFieldRef} class="cz-tf-control cz-tf-input" type="text" value={defaultLabel} disabled={disabled}
                    placeholder="One-Time Fee"
                    aria-label={`Label for default price of ${ariaLabel}`}
                    onInput={(event) => onDefaultLabel((event.currentTarget as HTMLInputElement).value)} />
                </td>
                <td>
                  <input class="cz-tf-control cz-tf-input" type="number" min="0" step="0.01" value={unitPrice} disabled={disabled}
                    aria-label={ariaLabel}
                    onInput={(event) => onUnitPrice(Number((event.currentTarget as HTMLInputElement).value))} />
                </td>
              </tr>
              {/* Rows 2 and 3 of the standard compact case — always rendered,
                  even before a price_options[] entry exists there. See
                  materializeStandardSlot above: nothing is minted until the
                  admin actually types into one. */}
              {([0, 1] as const).map((index) => {
                const option = priceOptions[index] ?? null;
                const placeholder = STANDARD_OPTION_PLACEHOLDERS[index];
                return (
                  <tr key={`standard-option-${index}`}>
                    <td>
                      <input class="cz-tf-control cz-tf-input" type="text" value={option ? option.label : ''} disabled={disabled}
                        placeholder={placeholder}
                        aria-label={`Label for price option of ${ariaLabel}`}
                        onInput={(event) => {
                          const value = (event.currentTarget as HTMLInputElement).value;
                          if (option) onOptionLabel(priceOptionKey(option), value);
                          else materializeStandardSlot(index, { label: value });
                        }} />
                    </td>
                    <td class="cz-rate-sheet-tool__price-popover-price-cell">
                      <input class="cz-tf-control cz-tf-input" type="number" min="0" step="0.01" value={option ? option.unitPrice : ''} disabled={disabled}
                        aria-label={`Unit price for price option of ${ariaLabel}`}
                        onInput={(event) => {
                          const value = Number((event.currentTarget as HTMLInputElement).value);
                          if (option) onOptionUnitPrice(priceOptionKey(option), value);
                          else materializeStandardSlot(index, { unitPrice: value });
                        }} />
                      {option && !disabled && (
                        <button type="button" class="cz-rate-sheet-tool__price-popover-remove"
                          aria-label={`Remove price option ${option.label.trim() || placeholder}`}
                          onClick={() => onRemoveOption(priceOptionKey(option))}>
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {/* Any further, already-existing price options beyond the
                  standard two — never truncated, never capped. */}
              {priceOptions.slice(2).map((option, extraIndex) => {
                const index = extraIndex + 2;
                const optionKey = priceOptionKey(option);
                return (
                  <tr key={optionKey}>
                    <td>
                      <input class="cz-tf-control cz-tf-input" type="text" value={option.label} disabled={disabled}
                        placeholder="Option label"
                        aria-label={`Label for price option of ${ariaLabel}`}
                        onInput={(event) => onOptionLabel(optionKey, (event.currentTarget as HTMLInputElement).value)} />
                    </td>
                    <td class="cz-rate-sheet-tool__price-popover-price-cell">
                      <input class="cz-tf-control cz-tf-input" type="number" min="0" step="0.01" value={option.unitPrice} disabled={disabled}
                        aria-label={`Unit price for price option of ${ariaLabel}`}
                        onInput={(event) => onOptionUnitPrice(optionKey, Number((event.currentTarget as HTMLInputElement).value))} />
                      {!disabled && (
                        <button type="button" class="cz-rate-sheet-tool__price-popover-remove"
                          aria-label={`Remove price option ${option.label.trim() || `Option ${index + 1}`}`}
                          onClick={() => onRemoveOption(optionKey)}>
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!disabled && (
            <button type="button" class="cz-rate-sheet-tool__price-popover-add"
              aria-label={`Add price option for ${ariaLabel}`}
              onClick={() => onAddOption()}>
              + Add price
            </button>
          )}
          <div class="cz-rate-sheet-tool__price-popover-footer">
            <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" onClick={close}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** The row-scoped use of the editor above: a row's Unit Price cell. Default
 *  Price is not Option 0 — selecting it edits the row's own `unit_price`. */
function RateSheetUnitPriceOptionEditor({
  row, commands, disabled,
}: {
  row:      RateSheetEditorRow;
  commands: RateSheetRowCommands;
  disabled: boolean;
}): VNode {
  const rowId = rowKey(row);
  return (
    <RateSheetPriceOptionEditor
      ariaLabel={`Unit price for ${row.optionLabel}`}
      unitPrice={row.unitPrice}
      defaultLabel={row.defaultPriceLabel}
      priceOptions={row.priceOptions}
      disabled={disabled}
      onUnitPrice={(next) => commands.setRowUnitPrice(rowId, next)}
      onDefaultLabel={(label) => commands.setRowDefaultPriceLabel(rowId, label)}
      onAddOption={() => commands.addPriceOption(rowId)}
      onRemoveOption={(optionKey) => commands.removePriceOption(rowId, optionKey)}
      onOptionLabel={(optionKey, label) => commands.setPriceOptionLabel(rowId, optionKey, label)}
      onOptionUnitPrice={(optionKey, next) => commands.setPriceOptionUnitPrice(rowId, optionKey, next)}
    />
  );
}

/**
 * A locked row's own zero-or-more Price Options, read-only. Deliberately not
 * the edit popover's own rows — nothing here is selectable/clickable; it is
 * a static list inside the same Unit Price cell so a locked row with Price
 * Options still reads at a glance, no click required. Default is the row's
 * own existing `unitPrice`, listed first and always present, under the name
 * the row gives it (`defaultPriceLabel`, the same rule the edit popover
 * uses); each further line is one `row.priceOptions[]` entry, labelled
 * exactly as the edit popover labels an unlabeled option
 * (`Option ${index + 1}`) so the two presentations never disagree on a row's
 * own price names.
 */
function RateSheetPriceOptionsSummary({ row }: { row: RateSheetEditorRow }): VNode {
  return (
    <div class="cz-rate-sheet-tool__price-options-summary" aria-label={`Price options for ${row.optionLabel}`}>
      <p class="cz-rate-sheet-tool__price-options-summary-title">Price Options</p>
      <ul class="cz-rate-sheet-tool__price-options-summary-list">
        <li class="cz-rate-sheet-tool__price-options-summary-row">
          <span class="cz-rate-sheet-tool__price-options-summary-label">{defaultPriceLabel(row.defaultPriceLabel)}</span>
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
  row, groups, extraColumn,
}: {
  row:    RateSheetEditorRow;
  groups: readonly RateSheetEditorGroup[];
  extraColumn?: { label: string; render: (row: RateSheetEditorRow, editing: boolean) => ComponentChildren };
}): VNode {
  const renamed = (row.label?.trim() ?? '') !== '' && row.optionLabel !== '';
  return (
    <>
      <td class="cz-rate-sheet-tool__cell-name">
        <div class="cz-rate-sheet-tool__cell-name-stack">
          <span>{rowDisplayLabel(row)}{row.sourceAvailable ? '' : ' — Unavailable'}</span>
          {renamed && <small>{row.optionLabel}</small>}
          <small>{row.platformId || (row.id ? 'Platform ID not assigned' : 'Platform ID assigned after Save')}</small>
        </div>
      </td>
      {extraColumn && <td class="cz-rate-sheet-tool__cell-extra">{extraColumn.render(row, false)}</td>}
      <td>{row.priceOptions.length > 0 ? <RateSheetPriceOptionsSummary row={row} /> : formatUnitPrice(row.unitPrice)}</td>
      <td>{row.per}</td>
      <td>{row.quantity}</td>
      <td>{groups.find((group) => group.id === row.groupId)?.label ?? 'Ungrouped'}</td>
    </>
  );
}

function RateSheetEditRow({
  row, groups, units, commands, allowRemove, lockCommands, extraColumn,
}: {
  row:      RateSheetEditorRow;
  groups:   readonly RateSheetEditorGroup[];
  units:    readonly PackageRateSheetUnit[];
  commands: RateSheetRowCommands;
  allowRemove: boolean;
  lockCommands?: RateSheetRowLockCommands;
  extraColumn?: { label: string; render: (row: RateSheetEditorRow, editing: boolean) => ComponentChildren };
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
          <RateSheetRowReadCells row={row} groups={groups} extraColumn={extraColumn} />
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
        <RateSheetRowFieldCells row={row} groups={groups} units={units} commands={commands} disabled={disabled} showPriceOptions extraColumn={extraColumn} />
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
      <RateSheetRowFieldCells row={row} groups={groups} units={units} commands={commands} disabled={disabled} extraColumn={extraColumn} />
      {allowRemove && (
        <td>
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" aria-label={`Remove ${row.optionLabel}`} onClick={() => commands.removeRow(key)}>Remove</button>
        </td>
      )}
    </tr>
  );
}
