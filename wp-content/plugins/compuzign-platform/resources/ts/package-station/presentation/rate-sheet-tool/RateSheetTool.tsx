// Rate Sheet tool — the Package Station's Rate Sheet authoring drawer content.
//
// The Package-owned content for the registered `rate-sheet` drawer template,
// mounted by the generic Admin drawer shell (NOT a body surface, NOT the retired
// Command Centre). It is the faithful rebuild of the removed `PackageRateSheetEditor`:
// pick source Services, price the supplied rows their inclusions onboard into,
// organise them into Rate Sheet groups, and commit through the surviving Package
// Manager save contract.
//
// It follows the SAME mature drawer flow as the Package Family, Tier, Service,
// and Category drawers, and owns no drawer machinery of its own:
//   - View / Edit is the registered drawer mode (`supportedModes: ['view','edit']`).
//     The shell supplies `mode` and `onModeChange`; this file keeps no local mode
//     state and builds no custom tabs.
//   - View mode reads through the shared `ReadBlock` module cards and publishes
//     the record footer with `EntityActionFooter` through the shell's `setFooter`.
//   - Edit mode hands the authoring controls to the shared `InlineEditorShell`,
//     which owns Save / Cancel, the dirty-cancel confirmation, the saving state,
//     and the save error — so the record footer is withdrawn while it is open,
//     exactly as the Package Family and Tier drawers do. There is one footer and
//     one save button at any time.
//
// Presentation only. Every read, edit, and save lives on the controller the
// Package-owned `useRateSheetTool` hook supplies; this file calls no endpoint.
// Saved priced rows become selectable by Tier occupants automatically — a Tier
// chooses a Rate Sheet `item_id` and declares its quantity; the price authority
// stays here. Admin hosts the panel; Package owns the data.

import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { DrawerContentProps } from '@/station-manager/drawerTypes';
import { EntityActionFooter } from '@/drawer-kit/EntityActionFooter';
import { InlineEditorShell } from '@/drawer-kit/InlineEditorShell';
import { ReadBlock } from '@/drawer-kit/ReadBlock';
import { RateSheetIcon } from '@/admin-station/shell/icons';
import type { PackageRateSheetUnit } from '../../types';
import { useRateSheetTool } from '../../surface/rateSheetTool/useRateSheetTool';
import type { RateSheetToolController } from '../../surface/rateSheetTool/useRateSheetTool';
import { rateSheetRowsInGroup, summariseRateSheet } from '../../surface/rateSheetTool/rateSheetToolModel';
import type { RateSheetEditorRow } from '../../surface/rateSheetTool/rateSheetToolModel';

// Unit prices carry cents (the grid steps by 0.01), so the shared `formatPrice`
// — whole dollars, for Tier headline pricing — would misreport them here.
const UNIT_PRICE_FORMAT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatUnitPrice(price: number): string {
  return UNIT_PRICE_FORMAT.format(price);
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

// ── SECTION: drawer content ───────────────────────────────────────────────────

/** Registered `rate-sheet` drawer content. Resolves the Package-owned controller
 *  and hands it to the mode-routed body; the shell supplies the "Rate Sheet"
 *  title, close chrome, and footer region. `recordId` is not used — the tool is
 *  scoped to the Package Station's host Service, not to a record. */
export function RateSheetDrawerContent(props: DrawerContentProps): VNode {
  const { items, loading, error } = useRateSheetTool();
  const controller = items[0] as RateSheetToolController | undefined;

  if (loading) {
    return <div class="cz-station-drawer__state" aria-busy="true">Loading the Rate Sheet…</div>;
  }
  if (error) {
    return <div class="cz-station-drawer__state" role="alert">{error}</div>;
  }
  if (!controller) {
    return (
      <div class="cz-station-drawer__state">
        The Package Station needs a host Service before its Rate Sheet can be authored.
      </div>
    );
  }

  return <RateSheetDrawerBody controller={controller} {...props} />;
}

// ── SECTION: mode routing, footer, and close guard ────────────────────────────

function RateSheetDrawerBody({
  controller,
  mode,
  onClose,
  onModeChange,
  onSaved,
  setFooter,
  setCloseGuard,
}: DrawerContentProps & { controller: RateSheetToolController }): VNode {
  const editing = mode === 'edit';
  const { dirty, saving, saveError } = controller;

  const savedRef = useRef(onSaved);          savedRef.current = onSaved;
  const modeRef  = useRef(onModeChange);     modeRef.current  = onModeChange;

  // Refresh the wall the drawer was opened from once a save completes, so the
  // Tier engine's pricing reflects the new rows. Detected from the controller's
  // own save lifecycle — no change to the preserved hook. An explicit Save also
  // returns the drawer to View, the way a saved module closes its editor in the
  // mature drawers; connecting a source Service persists too, but stays in Edit
  // because the author is still building the sheet.
  const explicitSave = useRef(false);
  const wasSaving = useRef(false);
  useEffect(() => {
    if (wasSaving.current && !saving) {
      const wasExplicit = explicitSave.current;
      explicitSave.current = false;
      if (!saveError) {
        savedRef.current();
        if (wasExplicit) modeRef.current('view');
      }
    }
    wasSaving.current = saving;
  }, [saving, saveError]);

  // Guard the shell's own close paths (Escape / backdrop / header ×) and a tab
  // away against discarding unsaved edits — the same guard grammar the Tier
  // drawer uses. Content with no pending edit closes directly.
  useEffect(() => {
    const protectNavigation = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    setCloseGuard?.(dirty ? () => window.confirm('Discard unsaved Rate Sheet changes?') : null);
    window.addEventListener('beforeunload', protectNavigation);
    return () => {
      setCloseGuard?.(null);
      window.removeEventListener('beforeunload', protectNavigation);
    };
  }, [setCloseGuard, dirty]);

  const requestEdit = useCallback(() => onModeChange('edit'), [onModeChange]);

  const leaveEdit = useCallback(() => {
    // Revert to the last saved read model, then hand the mode back to the shell.
    controller.discard();
    onModeChange('view');
  }, [controller, onModeChange]);

  const save = useCallback(async () => {
    explicitSave.current = true;
    await controller.save();
  }, [controller]);

  // The record footer. Withdrawn while the inline editor is open, because
  // InlineEditorShell carries its own Cancel / Save — one footer, one save.
  useEffect(() => {
    if (!setFooter) return;
    if (editing) {
      setFooter(null);
      return () => setFooter(null);
    }
    setFooter(
      <EntityActionFooter
        close={{ id: 'close', label: 'Close', onSelect: onClose }}
        primary={{ id: 'edit', label: 'Edit Rate Sheet', onSelect: requestEdit }}
      />,
    );
    return () => setFooter(null);
  }, [setFooter, editing, onClose, requestEdit]);

  if (editing) {
    return (
      <InlineEditorShell
        title={controller.value.title.trim() || 'Rate Sheet'}
        onSave={save}
        onCancel={leaveEdit}
        saving={saving}
        saveErr={saveError}
        isDirty={dirty}
        saveDisabled={!dirty}
      >
        <RateSheetEditor controller={controller} />
      </InlineEditorShell>
    );
  }

  return <RateSheetView controller={controller} onEdit={requestEdit} />;
}

// ── SECTION: view mode ────────────────────────────────────────────────────────

/** Read-only summary of the saved Rate Sheet: title, connected source Services,
 *  groups, and the priced rows with their unit, unit price, default quantity,
 *  and group assignment — plus row counts and pricing coverage. */
function RateSheetView({
  controller,
  onEdit,
}: {
  controller: RateSheetToolController;
  onEdit: () => void;
}): VNode {
  const { value, connectedServiceIds, catalog } = controller;
  const summary = useMemo(
    () => summariseRateSheet(value, connectedServiceIds.length),
    [value, connectedServiceIds.length],
  );

  // Resolve connected source Services to their titles through the controller's
  // existing catalogue read — the same call the Edit-mode picker makes, so the
  // view names no new endpoint. Until it resolves, the id stands in.
  const loadCatalog = controller.loadCatalog;
  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const serviceTitles = useMemo(() => {
    const byId = new Map(catalog.map((service) => [service.id, service.title]));
    return connectedServiceIds.map((id) => byId.get(id) ?? `Service #${id}`);
  }, [catalog, connectedServiceIds]);

  const editAction = [{ id: 'edit', label: 'Edit', onSelect: onEdit }];

  return (
    <div class="cz-req-detail">
      <ReadBlock
        title={value.title.trim() || 'Untitled Rate Sheet'}
        subtitle="Pricing and supply the Package Tiers select from."
        icon={<RateSheetIcon />}
        scopeClass="drawerOverview"
        actions={editAction}
      >
        <div class="drawerModule__fields">
          <div class="drawerModule__field">
            <p class="drawerModule__label">Title</p>
            <p class="drawerModule__value">{value.title.trim() || 'Not set'}</p>
          </div>
          <div class="drawerModule__field">
            <p class="drawerModule__label">Supply</p>
            <p class="drawerModule__value">
              {plural(summary.rows, 'priced row')}{' · '}
              {plural(summary.groups, 'group')}{' · '}
              {plural(summary.sources, 'source Service')}
            </p>
          </div>
          <div class="drawerModule__field">
            <p class="drawerModule__label">Pricing coverage</p>
            <p class="drawerModule__value">
              {summary.rows === 0
                ? 'No rows to price yet.'
                : `${summary.priced} of ${summary.rows} priced${summary.unpriced > 0 ? ` · ${summary.unpriced} still at zero` : ''}`}
            </p>
          </div>
          <div class="drawerModule__field">
            <p class="drawerModule__label">Grouping</p>
            <p class="drawerModule__value">
              {summary.rows === 0
                ? 'No rows to group yet.'
                : `${summary.grouped} grouped · ${summary.ungrouped} ungrouped`}
            </p>
          </div>
          {summary.unavailable > 0 && (
            <div class="drawerModule__field">
              <p class="drawerModule__label">Unavailable sources</p>
              <p class="drawerModule__value">
                {plural(summary.unavailable, 'row')} no longer resolve to a supplying Service.
              </p>
            </div>
          )}
        </div>
      </ReadBlock>

      <ReadBlock
        title="Source Services"
        count={summary.sources}
        subtitle="Connected Services whose inclusions supply the priced rows."
        actions={editAction}
      >
        {serviceTitles.length === 0 ? (
          <div class="drawerModule__empty">
            <p class="drawerModule__empty-title">No source Services connected</p>
            <p class="drawerModule__empty-copy">
              Connect a Service in Edit to load its inclusions as priceable rows.
            </p>
          </div>
        ) : (
          <div class="cz-sc-inclusion-pool">
            {serviceTitles.map((title) => <span key={title} class="cz-tf-chip">{title}</span>)}
          </div>
        )}
      </ReadBlock>

      <ReadBlock
        title="Groups"
        count={summary.groups}
        subtitle="How the priced rows are organised for Tier selection."
        actions={editAction}
      >
        {value.groups.length === 0 ? (
          <div class="drawerModule__empty">
            <p class="drawerModule__empty-title">No groups yet</p>
            <p class="drawerModule__empty-copy">
              Rows stay ungrouped until a group is created in Edit.
            </p>
          </div>
        ) : (
          <div class="drawerModule__fields">
            {value.groups.map((group) => (
              <div key={group.id} class="drawerModule__field">
                <p class="drawerModule__label">{group.label || 'Untitled group'}</p>
                <p class="drawerModule__value">
                  {plural(rateSheetRowsInGroup(value, group.id).length, 'row')}
                </p>
              </div>
            ))}
          </div>
        )}
      </ReadBlock>

      <ReadBlock
        title="Priced Rows"
        count={summary.rows}
        subtitle="Unit price, unit, default quantity, and group for each supplied row."
        actions={editAction}
      >
        {value.items.length === 0 ? (
          <div class="drawerModule__empty">
            <p class="drawerModule__empty-title">No priced rows yet</p>
            <p class="drawerModule__empty-copy">
              Give the Rate Sheet a title, then add a source Service in Edit to load its
              inclusions as priceable rows.
            </p>
          </div>
        ) : (
          <div class="cz-rate-sheet-tool__grid-wrap">
            <table class="cz-rate-sheet-tool__grid">
              <thead>
                <tr>
                  <th scope="col">Supplied content</th>
                  <th scope="col">Unit Price</th>
                  <th scope="col">Per</th>
                  <th scope="col">Qty</th>
                  <th scope="col">Group</th>
                </tr>
              </thead>
              <tbody>
                {value.items.map((row) => (
                  <RateSheetViewRow
                    key={row.id}
                    row={row}
                    groupLabel={value.groups.find((group) => group.id === row.groupId)?.label ?? null}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReadBlock>
    </div>
  );
}

function RateSheetViewRow({ row, groupLabel }: { row: RateSheetEditorRow; groupLabel: string | null }): VNode {
  return (
    <tr>
      <td class="cz-rate-sheet-tool__cell-name">
        {row.optionLabel}{row.sourceAvailable ? '' : ' — Unavailable'}
      </td>
      <td>{formatUnitPrice(row.unitPrice)}</td>
      <td>{row.per}</td>
      <td>{row.quantity}</td>
      <td>{groupLabel ?? 'Ungrouped'}</td>
    </tr>
  );
}

// ── SECTION: editor ───────────────────────────────────────────────────────────

function RateSheetEditor({ controller }: { controller: RateSheetToolController }): VNode {
  const { value, units } = controller;
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupLabel, setGroupLabel] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const submitGroup = () => {
    if (!groupLabel.trim()) return;
    controller.createGroup(groupLabel);
    setGroupLabel('');
    setCreatingGroup(false);
  };

  return (
    <div class="cz-rate-sheet-tool__editor">
      <label class="cz-rate-sheet-tool__field">
        <span class="cz-rate-sheet-tool__field-label">Title</span>
        <input
          class="cz-tf-input"
          value={value.title}
          placeholder="e.g. Standard Supply Rate Sheet"
          onInput={(event) => controller.setTitle((event.currentTarget as HTMLInputElement).value)}
        />
      </label>

      <div class="cz-rate-sheet-tool__toolbar">
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--secondary"
          onClick={() => { setCreatingGroup(true); }}
        >
          Create Group
        </button>
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--secondary"
          onClick={() => setPickerOpen((open) => !open)}
        >
          {pickerOpen ? 'Close Services' : 'Add Source Service'}
        </button>
      </div>

      {creatingGroup && (
        <div class="cz-rate-sheet-tool__group-create">
          <input
            class="cz-tf-input"
            value={groupLabel}
            placeholder="New group name"
            autoFocus
            aria-label="New group name"
            onInput={(event) => setGroupLabel((event.currentTarget as HTMLInputElement).value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') { event.preventDefault(); submitGroup(); }
              if (event.key === 'Escape') { setCreatingGroup(false); setGroupLabel(''); }
            }}
          />
          <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" onClick={submitGroup} disabled={!groupLabel.trim()}>Add Group</button>
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => { setCreatingGroup(false); setGroupLabel(''); }}>Cancel</button>
        </div>
      )}

      {pickerOpen && <SourcePicker controller={controller} onDone={() => setPickerOpen(false)} />}

      {value.groups.length > 0 && (
        <div class="cz-rate-sheet-tool__groups" aria-label="Rate Sheet groups">
          {value.groups.map((group) => (
            <div key={group.id} class="cz-rate-sheet-tool__group-row">
              <input
                class="cz-tf-input"
                value={group.label}
                aria-label={`Group name for ${group.label}`}
                onInput={(event) => controller.renameGroup(group.id, (event.currentTarget as HTMLInputElement).value)}
              />
              <button
                type="button"
                class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                aria-label={`Delete group ${group.label}`}
                onClick={() => controller.deleteGroup(group.id)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {value.items.length === 0 ? (
        <p class="cz-station-empty">
          No priced rows yet. Give the Rate Sheet a title, then add a source Service to load its inclusions as priceable rows.
        </p>
      ) : (
        <div class="cz-rate-sheet-tool__grid-wrap">
          <table class="cz-rate-sheet-tool__grid">
            <thead>
              <tr>
                <th scope="col">Supplied content</th>
                <th scope="col">Unit Price</th>
                <th scope="col">Per</th>
                <th scope="col">Qty</th>
                <th scope="col">Group</th>
              </tr>
            </thead>
            <tbody>
              {value.items.map((row) => {
                const disabled = !row.sourceAvailable;
                return (
                  <tr key={row.id}>
                    <td class="cz-rate-sheet-tool__cell-name">
                      {row.optionLabel}{disabled ? ' — Unavailable' : ''}
                    </td>
                    <td>
                      <input
                        class="cz-tf-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.unitPrice}
                        disabled={disabled}
                        aria-label={`Unit price for ${row.optionLabel}`}
                        onInput={(event) => controller.setRowUnitPrice(row.id, Number((event.currentTarget as HTMLInputElement).value))}
                      />
                    </td>
                    <td>
                      <select
                        class="cz-tf-select"
                        value={row.per}
                        disabled={disabled}
                        aria-label={`Unit for ${row.optionLabel}`}
                        onChange={(event) => controller.setRowPer(row.id, (event.currentTarget as HTMLSelectElement).value as PackageRateSheetUnit)}
                      >
                        {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                      </select>
                    </td>
                    <td>
                      <input
                        class="cz-tf-input"
                        type="number"
                        min="1"
                        step="1"
                        value={row.quantity}
                        disabled={disabled}
                        aria-label={`Quantity for ${row.optionLabel}`}
                        onInput={(event) => controller.setRowQuantity(row.id, Number((event.currentTarget as HTMLInputElement).value))}
                      />
                    </td>
                    <td>
                      <select
                        class="cz-tf-select"
                        value={row.groupId ?? ''}
                        disabled={disabled}
                        aria-label={`Group for ${row.optionLabel}`}
                        onChange={(event) => {
                          const next = (event.currentTarget as HTMLSelectElement).value;
                          controller.setRowGroup(row.id, next === '' ? null : next);
                        }}
                      >
                        <option value="">Ungrouped</option>
                        {value.groups.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── SECTION: source picker ────────────────────────────────────────────────────

function SourcePicker({ controller, onDone }: { controller: RateSheetToolController; onDone: () => void }): VNode {
  const { catalog, catalogLoading, catalogError, connectedServiceIds } = controller;
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => { controller.loadCatalog(); }, []);

  const connected = new Set(connectedServiceIds);

  const toggle = (id: number, checked: boolean) =>
    setSelected((current) => (checked ? [...current, id] : current.filter((value) => value !== id)));

  return (
    <div class="cz-rate-sheet-tool__picker">
      <div class="cz-rate-sheet-tool__picker-head">
        <strong>Browse Services</strong>
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={onDone}>Cancel</button>
      </div>
      <p class="cz-rate-sheet-tool__picker-note">
        Select Services to establish supply. Their inclusions load as priceable rows after the Rate Sheet is saved.
      </p>
      {catalogLoading && <p class="cz-station-empty" aria-busy="true">Loading Services…</p>}
      {catalogError && <p class="cz-admin-error-msg" role="alert">{catalogError}</p>}
      {!catalogLoading && !catalogError && (
        <>
          <div class="cz-rate-sheet-tool__picker-list">
            {catalog.map((service) => {
              const already = connected.has(service.id);
              return (
                <label key={service.id} class="cz-rate-sheet-tool__candidate">
                  <input
                    type="checkbox"
                    checked={already || selected.includes(service.id)}
                    disabled={already || controller.saving}
                    onChange={(event) => toggle(service.id, (event.currentTarget as HTMLInputElement).checked)}
                  />
                  <span>{service.title}</span>
                  {already && <span class="cz-rate-sheet-tool__candidate-tag">Connected</span>}
                </label>
              );
            })}
          </div>
          <div class="cz-rate-sheet-tool__picker-actions">
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--primary"
              disabled={selected.length === 0 || controller.saving}
              onClick={async () => {
                await controller.connectServices(selected);
                setSelected([]);
                onDone();
              }}
            >
              {controller.saving ? 'Adding…' : 'Add Selected Services'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
