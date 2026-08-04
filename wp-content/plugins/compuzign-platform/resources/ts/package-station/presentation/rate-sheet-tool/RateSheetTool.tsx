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
// which owns Save / Cancel and the dirty-cancel confirm — one footer, one save.
//
// A pool launcher opens the readable collection. A standalone Platform-ID row
// resolves to one compact read card, and Settings' `new` launcher enters this
// same editor with one empty sheet selected.
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
import { evaluateModule, rateSheetCollectionModule } from '@/drawer-kit/utils/moduleNotifications';
import { RateSheetIcon } from '@/admin-station/shell/icons';
import { useRateSheetTool } from '../../surface/rateSheetTool/useRateSheetTool';
import { fetchRateSheetByPlatformId } from '../../api';
import type { RateSheetToolController } from '../../surface/rateSheetTool/useRateSheetTool';
import { summariseRateSheet } from '../../surface/rateSheetTool/rateSheetToolModel';
import type { RateSheetEditorValue } from '../../surface/rateSheetTool/rateSheetToolModel';
import { RateSheetGridEditor, RateSheetGridRead, RateSheetGroupsEditor } from './rateSheetParts';

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
    if (typeof recordId !== 'string' || !recordId.startsWith('CZPRC')) return;
    fetchRateSheetByPlatformId(recordId)
      .then((response) => {
        if (response.success) controller.openSheet(response.rate_sheet_id);
      })
      .catch((err) => {
        setAddressError(err instanceof Error ? err.message : 'Could not resolve this Rate Sheet.');
      });
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
  const leaveEdit = useCallback(() => { controller.discard(); onModeChange('view'); }, [controller, onModeChange]);
  const save = useCallback(async () => { explicitSave.current = true; await controller.save(); }, [controller]);

  useEffect(() => {
    if (!setFooter) return;
    if (editing) { setFooter(null); return () => setFooter(null); }
    setFooter(
      <EntityActionFooter
        close={{ id: 'close', label: 'Close', onSelect: onClose }}
        primary={{ id: 'edit', label: 'Edit Rate Sheets', onSelect: requestEdit }}
      />,
    );
    return () => setFooter(null);
  }, [setFooter, editing, onClose, requestEdit]);

  if (addressError) return <div class="cz-station-drawer__state" role="alert">{addressError}</div>;
  if (editing) {
    return (
      <InlineEditorShell
        title="Rate Sheets"
        onSave={save}
        onCancel={leaveEdit}
        saving={saving}
        saveErr={saveError}
        isDirty={dirty}
        saveDisabled={!dirty}
      >
        <RateSheetCollectionEditor controller={controller} />
      </InlineEditorShell>
    );
  }
  return <RateSheetCollectionView controller={controller} onEdit={requestEdit} focused={typeof recordId === 'string' && recordId.startsWith('CZPRC')} />;
}

// ── SECTION: view mode (the list) ─────────────────────────────────────────────

function RateSheetCollectionView({
  controller, onEdit, focused,
}: { controller: RateSheetToolController; onEdit: () => void; focused: boolean }): VNode {
  const { list, connectedServiceIds } = controller;
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

  if (focused) {
    if (!controller.selected) return <div class="cz-station-drawer__state" aria-busy="true">Resolving Rate Sheet…</div>;
    return <div class="cz-req-detail"><RateSheetReadCard value={controller.selected} sourceCount={connectedServiceIds.length} actions={editAction} /></div>;
  }

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
        <RateSheetReadCard
          value={controller.selected}
          sourceCount={connectedServiceIds.length}
          actions={editAction}
        />
      )}
    </div>
  );
}

function RateSheetReadCard({
  value, sourceCount, actions,
}: { value: RateSheetEditorValue; sourceCount: number; actions: { id: string; label: string; onSelect: () => void }[] }): VNode {
  const summary = useMemo(() => summariseRateSheet(value, sourceCount), [value, sourceCount]);
  return (
    <ReadBlock title={value.title.trim() || 'Untitled Rate Sheet'} count={summary.rows} subtitle="Priced rows in this sheet." status={value.status === 'archived' ? 'disabled' : 'active'} actions={actions}>
      <div class="drawerModule__fields">
        <div class="drawerModule__field">
          <p class="drawerModule__label">Platform ID</p>
          <p class="drawerModule__value">{value.platformId || (value.id ? 'Not assigned' : 'Assigned after Save')}</p>
        </div>
        <div class="drawerModule__field">
          <p class="drawerModule__label">Summary</p>
          <p class="drawerModule__value">{plural(summary.rows, 'inclusion')} · {plural(summary.groups, 'group')}</p>
        </div>
        <div class="drawerModule__field">
          <p class="drawerModule__label">Per / unit</p>
          <p class="drawerModule__value">{[...new Set(value.items.map((row) => row.per))].join(', ') || 'No units configured'}</p>
        </div>
        {value.groups.map((group) => (
          <div key={group.id} class="drawerModule__field">
            <p class="drawerModule__label">{group.label || 'Untitled group'} Platform ID</p>
            <p class="drawerModule__value">{group.platformId || 'Not assigned'}</p>
          </div>
        ))}
      </div>
      {value.items.length === 0 ? (
        <div class="drawerModule__empty"><p class="drawerModule__empty-title">No priced rows yet</p></div>
      ) : (
        <RateSheetGridRead rows={value.items} groups={value.groups} />
      )}
    </ReadBlock>
  );
}

// ── SECTION: edit mode (the collection editor) ────────────────────────────────

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
          {sheet.key === selectedKey && controller.selected && <RateSheetSheetEditor controller={controller} value={controller.selected} />}
        </div>
      ))}
    </div>
  );
}

function RateSheetSheetEditor({ controller, value }: { controller: RateSheetToolController; value: RateSheetEditorValue }): VNode {
  const { units, options } = controller;
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupLabel, setGroupLabel] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const submitGroup = () => {
    if (!groupLabel.trim()) return;
    controller.createGroup(groupLabel);
    setGroupLabel('');
    setCreatingGroup(false);
  };

  const usedSources = new Set(value.items.map((row) => row.optionId));
  const available = options.filter((option) => !usedSources.has(option.id));

  return (
    <div class="cz-rate-sheet-tool__sheet" style="padding-left: var(--cz-space-3)">
      <div class="cz-rate-sheet-tool__toolbar">
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => setCreatingGroup(true)}>Create Group</button>
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => setAddOpen((open) => !open)}>{addOpen ? 'Close Rows' : 'Add Row'}</button>
      </div>

      {creatingGroup && (
        <div class="cz-rate-sheet-tool__group-create">
          <input class="cz-tf-control cz-tf-input" value={groupLabel} placeholder="New group name" autoFocus aria-label="New group name"
            onInput={(event) => setGroupLabel((event.currentTarget as HTMLInputElement).value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submitGroup(); } if (event.key === 'Escape') { setCreatingGroup(false); setGroupLabel(''); } }} />
          <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" onClick={submitGroup} disabled={!groupLabel.trim()}>Add Group</button>
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => { setCreatingGroup(false); setGroupLabel(''); }}>Cancel</button>
        </div>
      )}

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
                  <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => controller.addRow(option.id)}>Add</button>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {value.groups.length > 0 && (
        <RateSheetGroupsEditor groups={value.groups} commands={controller} />
      )}

      {value.items.length === 0 ? (
        <p class="cz-station-empty">No priced rows yet. Use Add Row to price a connected source's supplied content.</p>
      ) : (
        <RateSheetGridEditor rows={value.items} groups={value.groups} units={units} commands={controller} />
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
