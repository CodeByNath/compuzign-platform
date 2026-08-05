// Rate Sheet tool — the Package Station's Rate Sheet COLLECTION drawer content.
//
// Package-owned content for the registered `rate-sheet` drawer template, mounted
// by the generic Admin drawer shell. It manages the whole rate_sheets[] collection
// — list, create, open, edit, duplicate, archive, delete, and per-sheet row
// curation — and commits through the surviving Package Manager save contract as a
// partial upsert set plus an explicit deletion list.
//
// It keeps the SAME mature drawer flow: View / Edit is the registered drawer mode.
// View lists the sheets through shared `ReadBlock` cards and publishes the record
// footer; Edit hands the collection editor to the shared `InlineEditorShell`,
// which owns Save / Cancel and the dirty-cancel confirm for sheet-level fields
// (title, status, groups, source connections). Each grid row locks/unlocks on
// its own through `RateSheetGridEditor`'s `lockCommands` and persists its own
// Save/Remove/Delete immediately through the SAME full-manager save — so the
// footer Save is disabled whenever a row is active, keeping exactly one
// visible "Save" action at a time.
//
// A pool launcher opens the readable collection. A standalone Settings row
// carries the already-loaded native key behind its visible Platform identity
// and opens one compact read card; `new` enters the same one-sheet editor with
// one empty sheet selected.
//
// Presentation only. Every read, edit, and save lives on the controller the
// Package-owned `useRateSheetTool` hook supplies; this file calls no endpoint and
// mints no id. Deleting a sheet a Tier still uses is rejected by the backend
// guard and surfaced as the save error.

import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { DrawerContentProps } from '@/station-manager/drawerTypes';
import { EntityActionFooter } from '@/drawer-kit/EntityActionFooter';
import { InlineEditorShell } from '@/drawer-kit/InlineEditorShell';
import { ReadBlock } from '@/drawer-kit/ReadBlock';
import { MODULE_ICONS } from '@/drawer-kit/schema/icons';
import { evaluateModule, rateSheetCollectionModule } from '@/drawer-kit/utils/moduleNotifications';
import { RateSheetIcon } from '@/admin-station/shell/icons';
import { useRateSheetTool } from '../../surface/rateSheetTool/useRateSheetTool';
import type { RateSheetToolController } from '../../surface/rateSheetTool/useRateSheetTool';
import { summariseRateSheet } from '../../surface/rateSheetTool/rateSheetToolModel';
import type { RateSheetEditorValue } from '../../surface/rateSheetTool/rateSheetToolModel';
import { RateSheetGridEditor } from './rateSheetParts';

const plural = (count: number, singular: string, pluralForm = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : pluralForm}`;

// ── SECTION: drawer content ───────────────────────────────────────────────────

export function RateSheetDrawerContent(props: DrawerContentProps): VNode {
  const { items, loading, error } = useRateSheetTool();
  const controller = items[0] as RateSheetToolController | undefined;

  if (loading) return <div class="cz-station-drawer__state" aria-busy="true">Loading Rate Sheets…</div>;
  if (error) return <div class="cz-station-drawer__state" role="alert">{error}</div>;
  if (!controller) {
    return (
      <div class="cz-station-drawer__state">
        The Package Station needs a host Service before its Rate Sheets can be authored.
      </div>
    );
  }
  return <RateSheetDrawerBody controller={controller} {...props} />;
}

// ── SECTION: mode routing, footer, and close guard ────────────────────────────

function RateSheetDrawerBody({
  controller, recordId, mode, onClose, onModeChange, onSaved, setFooter, setCloseGuard,
}: DrawerContentProps & { controller: RateSheetToolController }): VNode {
  const editing = mode === 'edit';
  const focused = recordId === 'new' || (typeof recordId === 'string' && recordId !== '');
  const { dirty, saving, saveError } = controller;

  const savedRef = useRef(onSaved);      savedRef.current = onSaved;
  const modeRef  = useRef(onModeChange); modeRef.current  = onModeChange;

  const explicitSave = useRef(false);
  const openedAddress = useRef<string | number | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  useEffect(() => {
    if (openedAddress.current === recordId) return;
    openedAddress.current = recordId;
    setAddressError(null);
    if (recordId === 'new') {
      controller.createSheet();
      return;
    }
    if (typeof recordId !== 'string' || recordId === '') return;
    const match = controller.list.find((sheet) => sheet.id === recordId);
    if (!match) {
      setAddressError('This Rate Sheet is no longer available in the Package Manager collection.');
      return;
    }
    controller.openSheet(match.key);
  }, [controller, recordId]);
  const wasSaving = useRef(false);
  useEffect(() => {
    if (wasSaving.current && !saving) {
      const wasExplicit = explicitSave.current;
      explicitSave.current = false;
      if (!saveError) { savedRef.current(); if (wasExplicit) modeRef.current('view'); }
    }
    wasSaving.current = saving;
  }, [saving, saveError]);

  useEffect(() => {
    const protectNavigation = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    setCloseGuard?.(dirty ? () => window.confirm('Discard unsaved Rate Sheet changes?') : null);
    window.addEventListener('beforeunload', protectNavigation);
    return () => { setCloseGuard?.(null); window.removeEventListener('beforeunload', protectNavigation); };
  }, [setCloseGuard, dirty]);

  const requestEdit = useCallback(() => onModeChange('edit'), [onModeChange]);
  const leaveEdit = useCallback(() => {
    controller.discard();
    if (recordId === 'new') onClose();
    else {
      // `discard()` restores the authoritative collection and clears its
      // selection. A focused route must immediately reselect its own native
      // key before returning to View; the guarded mount effect intentionally
      // does not run a second time for the same address.
      if (typeof recordId === 'string' && recordId !== '') controller.openSheet(recordId);
      onModeChange('view');
    }
  }, [controller, onClose, onModeChange, recordId]);
  const save = useCallback(async () => { explicitSave.current = true; await controller.save(focused); }, [controller, focused]);

  useEffect(() => {
    if (!setFooter) return;
    if (editing) { setFooter(null); return () => setFooter(null); }
    setFooter(
      <EntityActionFooter
        close={{ id: 'close', label: 'Close', onSelect: onClose }}
        primary={focused ? undefined : { id: 'edit', label: 'Edit Rate Sheets', onSelect: requestEdit }}
      />,
    );
    return () => setFooter(null);
  }, [setFooter, editing, focused, onClose, requestEdit]);

  if (addressError) return <div class="cz-station-drawer__state" role="alert">{addressError}</div>;
  if (focused && !controller.selected) {
    const addressExists = recordId === 'new' || controller.list.some((sheet) => sheet.id === recordId);
    return addressExists
      ? <div class="cz-station-drawer__state" aria-busy="true">Preparing Rate Sheet…</div>
      : <div class="cz-station-drawer__state" role="alert">This Rate Sheet could not be selected.</div>;
  }
  if (editing) {
    return (
      <InlineEditorShell
        title={focused ? (controller.selected?.title.trim() || 'New Rate Sheet') : 'Rate Sheets'}
        onSave={save}
        onCancel={leaveEdit}
        saving={saving}
        saveErr={saveError}
        isDirty={dirty}
        saveDisabled={!dirty || (focused && !controller.selected?.title.trim()) || controller.editingRowId !== null}
      >
        {focused && controller.selected
          ? <FocusedRateSheetEditor controller={controller} value={controller.selected} />
          : <RateSheetCollectionEditor controller={controller} />}
      </InlineEditorShell>
    );
  }
  return focused && controller.selected
    ? <FocusedRateSheetRead value={controller.selected} onEdit={requestEdit} />
    : <RateSheetCollectionView controller={controller} onEdit={requestEdit} />;
}

// ── SECTION: view mode (the list) ─────────────────────────────────────────────

function RateSheetCollectionView({
  controller, onEdit,
}: { controller: RateSheetToolController; onEdit: () => void }): VNode {
  const { list } = controller;
  const editAction = [{ id: 'edit', label: 'Edit', onSelect: onEdit }];
  // The module's own lifecycle and notification panel, resolved by the shared
  // engine and opened from its pill — the same cycle every other module follows,
  // and the only guidance an empty pool needs.
  const [panelOpen, setPanelOpen] = useState(false);
  const state = evaluateModule(rateSheetCollectionModule, { count: list.length }, {
    platformStatus: list.some((sheet) => sheet.status === 'active') ? 'active' : 'disabled',
    platformLabel:  'Rate Sheet',
  });
  const moduleStatus = {
    status:        state.status,
    notes:         state.notes,
    panelOpen,
    onTogglePanel: () => setPanelOpen((open) => !open),
  };

  if (list.length === 0) {
    return (
      <div class="cz-req-detail">
        <ReadBlock title="Rate Sheets" subtitle="Pricing and supply the Package Tiers select from." icon={<RateSheetIcon />} scopeClass="drawerOverview" actions={editAction} {...moduleStatus}>
          <div class="drawerModule__empty">
            <p class="drawerModule__empty-title">No Rate Sheets yet</p>
            <p class="drawerModule__empty-copy">Create a Rate Sheet in Edit, then curate its priced rows.</p>
          </div>
        </ReadBlock>
      </div>
    );
  }

  return (
    <div class="cz-req-detail">
      <ReadBlock
        title="Rate Sheets"
        count={list.length}
        subtitle="Each Tier binds to one sheet; its rows resolve within that sheet."
        icon={<RateSheetIcon />}
        scopeClass="drawerOverview"
        actions={editAction}
        {...moduleStatus}
      >
        <div class="drawerModule__fields">
          {list.map((sheet) => (
            <div key={sheet.key} class="drawerModule__field">
              <p class="drawerModule__label">
                {sheet.title || 'Untitled Rate Sheet'}{sheet.status === 'archived' ? ' · Archived' : ''}
              </p>
              <p class="drawerModule__value">{plural(sheet.rows, 'priced row')} · {plural(sheet.groups, 'group')}</p>
            </div>
          ))}
        </div>
      </ReadBlock>

      {controller.selected && (
        <FocusedRateSheetRead value={controller.selected} onEdit={onEdit} />
      )}
    </div>
  );
}

function FocusedRateSheetRead({
  value, onEdit,
}: { value: RateSheetEditorValue; onEdit: () => void }): VNode {
  const summary = useMemo(() => summariseRateSheet(value, 0), [value]);
  const perValues = useMemo(() => [...new Set(value.items.map((row) => row.per))], [value.items]);
  return (
    <div class="cz-req-detail">
      <ReadBlock
        title="Rate Sheet"
        subtitle="Pricing configuration and inclusion summary for this Rate Sheet."
        icon={MODULE_ICONS.overview}
        iconVariant="drawerModule__icon--overview"
        scopeClass="drawerOverview"
        status={value.status === 'archived' ? 'disabled' : 'active'}
        actions={[{ id: 'edit', label: 'Edit', onSelect: onEdit }]}
      >
        <div class="drawerModule__fields">
        <div class="drawerModule__field">
          <p class="drawerModule__label">Name</p>
          <p class="drawerModule__value">{value.title.trim() || 'Untitled Rate Sheet'}</p>
        </div>
        <div class="drawerModule__field">
          <p class="drawerModule__label">Platform ID</p>
          <p class="drawerModule__value">{value.platformId || (value.id ? 'Not assigned' : 'Assigned after Save')}</p>
        </div>
        <div class="drawerModule__field">
          <p class="drawerModule__label">Inclusions</p>
          <p class="drawerModule__value">{summary.rows}</p>
        </div>
        <div class="drawerModule__field">
          <p class="drawerModule__label">Groups</p>
          <p class="drawerModule__value">{summary.groups}</p>
        </div>
        <div class="drawerModule__field">
          <p class="drawerModule__label">Per values</p>
          <p class="drawerModule__value">{perValues.length}{perValues.length > 0 ? ` · ${perValues.join(', ')}` : ''}</p>
        </div>
        </div>
      </ReadBlock>
    </div>
  );
}

// ── SECTION: edit mode (the collection editor) ────────────────────────────────

function FocusedRateSheetEditor({ controller, value }: {
  controller: RateSheetToolController;
  value: RateSheetEditorValue;
}): VNode {
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedKey = controller.selectedKey;
  return (
    <div class="cz-rate-sheet-tool__editor cz-rate-sheet-tool__editor--focused">
      <div class="cz-rate-sheet-tool__focused-head">
        <input
          class="cz-tf-control cz-tf-input"
          value={value.title}
          placeholder="Rate Sheet title"
          aria-label="Rate Sheet title"
          onInput={(event) => controller.setTitle((event.currentTarget as HTMLInputElement).value)}
        />
        <select
          class="cz-tf-control cz-tf-select"
          value={value.status}
          aria-label="Rate Sheet status"
          onChange={(event) => {
            if (selectedKey) controller.setSheetStatus(selectedKey, (event.currentTarget as HTMLSelectElement).value as 'active' | 'archived');
          }}
        >
          <option value="active">Active</option>
          <option value="archived">Disabled</option>
        </select>
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => setPickerOpen((open) => !open)}>
          {pickerOpen ? 'Close Services' : 'Add Source Service'}
        </button>
      </div>
      {pickerOpen && <SourcePicker controller={controller} onDone={() => setPickerOpen(false)} />}
      <RateSheetSheetEditor controller={controller} value={value} indented={false} />
    </div>
  );
}

function RateSheetCollectionEditor({ controller }: { controller: RateSheetToolController }): VNode {
  const { list, selectedKey } = controller;
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div class="cz-rate-sheet-tool__editor">
      <div class="cz-rate-sheet-tool__toolbar">
        <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={() => controller.createSheet()}>New Rate Sheet</button>
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => setPickerOpen((open) => !open)}>
          {pickerOpen ? 'Close Services' : 'Add Source Service'}
        </button>
      </div>

      {pickerOpen && <SourcePicker controller={controller} onDone={() => setPickerOpen(false)} />}

      {list.length === 0 && (
        <p class="cz-station-empty">No Rate Sheets yet. Create one, then add a source Service and curate its rows.</p>
      )}

      {list.map((sheet) => (
        <div key={sheet.key} class="cz-rate-sheet-tool__group-row" style="flex-direction: column; align-items: stretch; gap: var(--cz-space-2)">
          <div class="cz-rate-sheet-tool__group-row" style="align-items: center">
            <input
              class="cz-tf-control cz-tf-input"
              value={sheet.key === selectedKey ? (controller.selected?.title ?? sheet.title) : sheet.title}
              placeholder="Rate Sheet title"
              aria-label={`Title for ${sheet.title || 'untitled sheet'}`}
              onFocus={() => controller.openSheet(sheet.key)}
              onInput={(event) => { controller.openSheet(sheet.key); controller.setTitle((event.currentTarget as HTMLInputElement).value); }}
            />
            <select
              class="cz-tf-control cz-tf-select"
              value={sheet.status}
              aria-label={`Status for ${sheet.title || 'untitled sheet'}`}
              onChange={(event) => controller.setSheetStatus(sheet.key, (event.currentTarget as HTMLSelectElement).value as 'active' | 'archived')}
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
            <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => controller.openSheet(sheet.key === selectedKey ? '' : sheet.key)}>
              {sheet.key === selectedKey ? 'Collapse' : `Rows (${sheet.rows})`}
            </button>
            <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => controller.duplicateSheet(sheet.key)}>Duplicate</button>
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
              aria-label={`Delete ${sheet.title || 'untitled sheet'}`}
              onClick={() => { if (window.confirm('Delete this Rate Sheet? A Tier still using it will block the save until it is moved.')) controller.deleteSheet(sheet.key); }}
            >
              Delete
            </button>
          </div>
          {sheet.key === selectedKey && controller.selected && <RateSheetSheetEditor controller={controller} value={controller.selected} indented />}
        </div>
      ))}
    </div>
  );
}

function RateSheetSheetEditor({ controller, value, indented }: {
  controller: RateSheetToolController;
  value: RateSheetEditorValue;
  indented: boolean;
}): VNode {
  const { units, options } = controller;
  const [addOpen, setAddOpen] = useState(false);

  const usedSources = new Set(value.items.map((row) => row.optionId));
  const available = options.filter((option) => !usedSources.has(option.id));

  // Add Row is disabled while another row is being edited — only one row may
  // be unlocked at a time, and a newly added row starts unlocked itself.
  const rowLocked = controller.editingRowId !== null;

  return (
    <div class="cz-rate-sheet-tool__sheet" style={indented ? 'padding-left: var(--cz-space-3)' : undefined}>
      <div class="cz-rate-sheet-tool__toolbar">
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={rowLocked}
          onClick={() => setAddOpen((open) => !open)}>{addOpen ? 'Close Rows' : 'Add Row'}</button>
      </div>

      {addOpen && (
        <div class="cz-rate-sheet-tool__picker">
          <p class="cz-rate-sheet-tool__picker-note">Add a connected source's supplied content as a priced row.</p>
          {available.length === 0 ? (
            <p class="cz-station-empty">Every connected source is already a row. Add a Source Service to load more.</p>
          ) : (
            <div class="cz-rate-sheet-tool__picker-list">
              {available.map((option) => (
                <label key={option.id} class="cz-rate-sheet-tool__candidate">
                  <span>{option.label}</span>
                  <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={rowLocked}
                    onClick={() => controller.addRow(option.id)}>Add</button>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {value.items.length === 0 ? (
        <p class="cz-station-empty">No priced rows yet. Use Add Row to price a connected source's supplied content.</p>
      ) : (
        <RateSheetGridEditor rows={value.items} groups={value.groups} units={units} commands={controller} lockCommands={controller} />
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
        Connect Services to establish supply. Their inclusions become selectable rows you can add to any sheet.
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
                  <input type="checkbox" class="cz-tf-checkbox" checked={already || selected.includes(service.id)} disabled={already || controller.saving}
                    onChange={(event) => toggle(service.id, (event.currentTarget as HTMLInputElement).checked)} />
                  <span>{service.title}</span>
                  {already && <span class="cz-rate-sheet-tool__candidate-tag">Connected</span>}
                </label>
              );
            })}
          </div>
          <div class="cz-rate-sheet-tool__picker-actions">
            <button type="button" class="cz-admin-btn cz-admin-btn--primary" disabled={selected.length === 0 || controller.saving}
              onClick={async () => { await controller.connectServices(selected); setSelected([]); onDone(); }}>
              {controller.saving ? 'Adding…' : 'Add Selected Services'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
