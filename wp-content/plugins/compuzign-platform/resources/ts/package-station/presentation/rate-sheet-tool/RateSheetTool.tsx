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
// A FOCUSED sheet presents its two drawer groups through the shared
// Tabs/Accordion renderers — Details (the sheet itself and its own priced rows)
// and Options (its Bundles) — exactly as TierDrawerContent composes the Tier
// drawer's own groups. Both groups open READABLE; only Edit opens the inline
// editor, which is a focused task that suppresses the group chrome in CSS
// (`.cz-req-detail--editing`) rather than by unmounting the renderers. There is
// no Bin: Rate Sheets have no bin lifecycle.
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
import { ChildChipStrip } from '@/drawer-kit/ui/ChildChipStrip';
import { DrawerGroupAccordion } from '@/drawer-kit/ui/DrawerGroupAccordion';
import { DrawerGroupTabs } from '@/drawer-kit/ui/DrawerGroupTabs';
import type { DrawerGroup } from '@/drawer-kit/ui/drawerGroups';
import { AppsIcon, MenuIcon, RateSheetIcon } from '@/admin-station/shell/icons';
import { useRateSheetTool } from '../../surface/rateSheetTool/useRateSheetTool';
import type { RateSheetGroupId, RateSheetToolController } from '../../surface/rateSheetTool/useRateSheetTool';
import { bundleKey, bundleSuppliedContent, findBundleRow, ordinaryRows, rowKey, summariseRateSheet } from '../../surface/rateSheetTool/rateSheetToolModel';
import type {
  BundleSourceSheet,
  RateSheetEditorBundle,
  RateSheetEditorRow,
  RateSheetEditorValue,
} from '../../surface/rateSheetTool/rateSheetToolModel';
import { RateSheetGridEditor } from './rateSheetParts';
import { RateSheetBundleImportPicker } from './RateSheetBundleImportPicker';
import { RateSheetBundleWorkspace } from './RateSheetBundleWorkspace';
import { RateSheetServiceImportPicker } from './RateSheetServiceImportPicker';

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
  // The focused sheet is the group screen: Details and Options both render
  // (readable, or as this group's own focused editor) beneath the one shared
  // Tabs/Accordion nav. Edit no longer swaps the whole body for an editor.
  if (focused && controller.selected) {
    return (
      <FocusedRateSheetGroups
        controller={controller}
        value={controller.selected}
        editing={editing}
        onEdit={requestEdit}
        onSave={save}
        onCancel={leaveEdit}
      />
    );
  }
  if (editing) {
    return (
      <InlineEditorShell
        title="Rate Sheets"
        onSave={save}
        onCancel={leaveEdit}
        saving={saving}
        saveErr={saveError}
        isDirty={dirty}
        saveDisabled={!dirty || controller.editingRowId !== null}
      >
        <RateSheetCollectionEditor controller={controller} />
      </InlineEditorShell>
    );
  }
  return <RateSheetCollectionView controller={controller} onEdit={requestEdit} />;
}

// ── SECTION: focused sheet — the two drawer groups ────────────────────────────

/**
 * The focused Rate Sheet's Details/Options group screen — the same composition
 * TierDrawerContent renders: one `.cz-req-detail` root, one group array, one of
 * the two shared renderers, and a `trailing` nav slot carrying the view toggle
 * plus the group-scoped create action.
 *
 * Both groups own a readable entry state and open their OWN inline editor in
 * place, so exactly one editor can be open at a time (the inactive group's
 * content is not rendered by either renderer). While one is open,
 * `.cz-req-detail--editing` suppresses the nav chrome in CSS — the renderers and
 * every group's content stay mounted at the same tree position, so an editor's
 * own local state is never wiped by a reparenting remount.
 */
function FocusedRateSheetGroups({
  controller, value, editing, onEdit, onSave, onCancel,
}: {
  controller: RateSheetToolController;
  value:      RateSheetEditorValue;
  editing:    boolean;
  onEdit:     () => void;
  onSave:     () => Promise<void>;
  onCancel:   () => void;
}): VNode {
  const { dirty, saving, saveError, groupTab, groupView } = controller;

  // One editor session for the whole focused sheet — the same footer grammar,
  // dirty guard and row lock whichever group opened it. Only its title and body
  // differ, because only the SCOPE differs.
  const openEditor = (title: string, body: VNode): VNode => (
    <InlineEditorShell
      title={title}
      onSave={onSave}
      onCancel={onCancel}
      saving={saving}
      saveErr={saveError}
      isDirty={dirty}
      saveDisabled={!dirty || !value.title.trim() || controller.editingRowId !== null}
    >
      {body}
    </InlineEditorShell>
  );

  const groups: DrawerGroup<RateSheetGroupId>[] = [
    {
      id: 'details',
      label: 'Details',
      content: editing && groupTab === 'details'
        ? openEditor(
          value.title.trim() || 'New Rate Sheet',
          <FocusedRateSheetEditor controller={controller} value={value} />,
        )
        : <FocusedRateSheetRead value={value} onEdit={onEdit} />,
    },
    {
      id: 'options',
      label: 'Options',
      content: (
        <RateSheetBundleSwitcher
          controller={controller}
          sheet={value}
          editing={editing && groupTab === 'options'}
          onEdit={onEdit}
          openEditor={openEditor}
        />
      ),
    },
  ];

  // The icon shown is the AVAILABLE ALTERNATE view, not the current one — the
  // same convention the Tier drawer's own toggle and the Admin header's theme
  // toggle already use.
  const viewToggleTarget = groupView === 'tabs' ? 'accordion' : 'tabs';
  const viewToggleLabel  = viewToggleTarget === 'accordion' ? 'Switch to accordion view' : 'Switch to tabs view';
  // "+ Bundle" lives here, in the drawer's own nav chrome beside the view
  // toggle, reachable only while Options is the active group — never on the
  // chip strip's trailing seam, which is navigation, not creation.
  const trailing = (
    <>
      <button
        type="button"
        class="cz-station-iconbtn cz-drawer-groups__view-toggle"
        aria-label={viewToggleLabel}
        title={viewToggleLabel}
        onClick={() => controller.setGroupView(viewToggleTarget)}
      >
        {viewToggleTarget === 'accordion' ? <MenuIcon /> : <AppsIcon />}
      </button>
      {groupTab === 'options' && (
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
          disabled={controller.editingRowId !== null}
          onClick={() => { controller.beginBundleAuthoring(); onEdit(); }}
        >
          + Bundle
        </button>
      )}
    </>
  );

  return (
    <div class={`cz-req-detail${editing ? ' cz-req-detail--editing' : ''}`}>
      {groupView === 'accordion' ? (
        <DrawerGroupAccordion groups={groups} activeId={groupTab} onSelect={controller.selectGroupTab} trailing={trailing} />
      ) : (
        <DrawerGroupTabs groups={groups} activeId={groupTab} onSelect={controller.selectGroupTab} trailing={trailing} />
      )}
    </div>
  );
}

// ── SECTION: Options — the sheet's Bundles ────────────────────────────────────

/**
 * The Options group's content: a `[Bundle …]` child chip strip over the SELECTED
 * Bundle's readable module card, or — once Edit is pressed — that Bundle's own
 * focused workspace. The exact shape TierEditionDeclarationSwitcher gives Tier
 * Options, minus the Bin, which Rate Sheets do not have.
 *
 * The selection itself is a CONTROLLED value read from the controller, not local
 * state: the drawer body unmounts on every refetch, which would silently reset a
 * local selection after each save.
 */
function RateSheetBundleSwitcher({
  controller, sheet, editing, onEdit, openEditor,
}: {
  controller: RateSheetToolController;
  sheet:      RateSheetEditorValue;
  editing:    boolean;
  onEdit:     () => void;
  openEditor: (title: string, body: VNode) => VNode;
}): VNode {
  const { bundles, selectedBundle, selectedBundleKey, selectedBundleRow } = controller;

  // Options must never sit on a selection that names nothing — a fresh mount, a
  // Bundle just deleted, or a Bundle dropped by a save all land here. There is
  // no sheet-level fallback inside Options: the sheet itself is Details.
  useEffect(() => {
    if (bundles.length === 0) return;
    if (bundles.some((bundle) => bundleKey(bundle) === selectedBundleKey)) return;
    controller.selectBundle(bundleKey(bundles[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundles, selectedBundleKey]);

  // A Bundle's display name is its own linked row's label — the Bundle Name —
  // never restated on the Bundle record itself. A Bundle mid-authoring, with
  // no row yet, has none to show.
  const bundleLabel = (bundle: RateSheetEditorBundle): string =>
    findBundleRow(bundle, sheet)?.label?.trim() || 'Untitled Bundle';

  if (editing) {
    return openEditor(
      controller.authoringBundle ? 'New Bundle' : selectedBundle ? (selectedBundleRow?.label?.trim() || 'Untitled Bundle') : 'Bundles',
      <div class="cz-rate-sheet-tool__editor cz-rate-sheet-tool__editor--focused">
        {controller.authoringBundle ? (
          <RateSheetBundleImportPicker controller={controller} bundle={null} />
        ) : selectedBundle && selectedBundleKey ? (
          <RateSheetBundleWorkspace
            controller={controller}
            bundle={selectedBundle}
            bundleKey={selectedBundleKey}
            sheet={sheet}
          />
        ) : (
          <p class="cz-station-empty">
            This Rate Sheet has no Bundles left to edit. Save or Cancel to return, then use "+ Bundle" to add one.
          </p>
        )}
      </div>,
    );
  }

  return (
    <div class="cz-shell-section">
      <ChildChipStrip
        chips={bundles.map((bundle) => ({ id: bundleKey(bundle), label: bundleLabel(bundle) }))}
        activeId={selectedBundleKey}
        ariaLabel="Bundles"
        onSelect={(id) => controller.selectBundle(id)}
      />

      {bundles.length === 0 && (
        <div class="cz-admin-empty" style="margin-top: var(--cz-space-2)">
          <p>No Bundles yet. Use "+ Bundle" to compose one from this Rate Sheet's own rows and other sheets'.</p>
        </div>
      )}

      {selectedBundle && selectedBundleKey && (
        <RateSheetBundleRead
          bundle={selectedBundle}
          row={selectedBundleRow}
          sources={controller.bundleSources}
          onEdit={onEdit}
          // The same removal the Bundle row's own Remove performs — one
          // confirm, one full-manager save, through the one controller command.
          // `removeRowImmediately` takes a ROW id (it detects Bundle ownership
          // itself, by matching `bundle.itemId`) — never the Bundle's OWN key,
          // which is a different id space entirely and would silently match no
          // row at all.
          onRemove={() => { if (selectedBundleRow) void controller.removeRowImmediately(rowKey(selectedBundleRow)); }}
        />
      )}
    </div>
  );
}

/**
 * The selected Bundle's readable module card — the same lean `ReadBlock` shape
 * the sheet's own Details module reads through: what the record IS and how much
 * it holds, never a field-by-field restatement of its row. A Bundle is a
 * composition, not a single declaration, so its price, unit, quantity and group
 * live where every other Rate Sheet row's do — in the row itself, inside the
 * inline editor — not spelled out here.
 *
 * `Remove` rides the module's own action footer, the existing drawer-module
 * action system. There is no removal button inside the editor.
 */
function RateSheetBundleRead({
  bundle, row, sources, onEdit, onRemove,
}: {
  bundle:   RateSheetEditorBundle;
  row:      RateSheetEditorRow | null;
  sources:  readonly BundleSourceSheet[];
  onEdit:   () => void;
  onRemove: () => void;
}): VNode {
  const supplied = bundleSuppliedContent(bundle, sources);
  return (
    <ReadBlock
      title="Bundle"
      subtitle="Compiled supplied content, offered upstream as one priced Rate Sheet row."
      icon={<RateSheetIcon />}
      scopeClass="drawerOverview"
      status={bundle.status === 'archived' ? 'disabled' : 'active'}
      actions={[
        { id: 'edit', label: 'Edit', onSelect: onEdit },
        { id: 'remove', label: 'Remove', onSelect: onRemove },
      ]}
    >
      <div class="drawerModule__fields">
        <div class="drawerModule__field">
          <p class="drawerModule__label">Product Bundle</p>
          <p class="drawerModule__value">{row?.label?.trim() || 'Untitled Bundle'}</p>
        </div>
        <div class="drawerModule__field">
          <p class="drawerModule__label">Platform ID</p>
          <p class="drawerModule__value">{bundle.platformId || (bundle.id ? 'Not assigned' : 'Assigned after Save')}</p>
        </div>
        <div class="drawerModule__field">
          <p class="drawerModule__label">Supplied content</p>
          <p class="drawerModule__value">
            {supplied.length}
            {supplied.length > 0 ? ` · ${supplied.map((entry) => entry.label).join('; ')}` : ''}
          </p>
        </div>
      </div>
    </ReadBlock>
  );
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
  // No `.cz-req-detail` wrapper of its own: the caller owns that root — the
  // Details group inside the focused group screen, or the collection view.
  return (
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
          <p class="drawerModule__label">Bundles</p>
          <p class="drawerModule__value">
            {value.bundles.length}
            {value.bundles.length > 0
              ? ` · ${value.bundles.map((bundle) => findBundleRow(bundle, value)?.label?.trim() || 'Untitled Bundle').join(', ')}`
              : ''}
          </p>
        </div>
        <div class="drawerModule__field">
          <p class="drawerModule__label">Per values</p>
          <p class="drawerModule__value">{perValues.length}{perValues.length > 0 ? ` · ${perValues.join(', ')}` : ''}</p>
        </div>
        </div>
      </ReadBlock>
  );
}

// ── SECTION: edit mode (the sheet and collection editors) ─────────────────────

/**
 * The Details group's own editor: the sheet's own fields and its own priced
 * rows. It carries no Bundle navigation at all — Bundles are the Options group,
 * and the controller's row scope follows the active group, so every command in
 * here addresses the sheet's own rows.
 */
function FocusedRateSheetEditor({ controller, value }: {
  controller: RateSheetToolController;
  value: RateSheetEditorValue;
}): VNode {
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
      </div>
      <RateSheetSheetEditor controller={controller} value={value} indented={false} />
    </div>
  );
}

function RateSheetCollectionEditor({ controller }: { controller: RateSheetToolController }): VNode {
  const { list, selectedKey } = controller;

  return (
    <div class="cz-rate-sheet-tool__editor">
      <div class="cz-rate-sheet-tool__toolbar">
        <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={() => controller.createSheet()}>New Rate Sheet</button>
      </div>

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
  const [addOpen, setAddOpen] = useState(false);

  // Add Service is disabled while another row is being edited — only one row
  // may be unlocked at a time, and a newly added row starts unlocked itself.
  const rowLocked = controller.editingRowId !== null;

  return (
    <div class="cz-rate-sheet-tool__sheet" style={indented ? 'padding-left: var(--cz-space-3)' : undefined}>
      <div class="cz-rate-sheet-tool__toolbar">
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={rowLocked}
          onClick={() => setAddOpen((open) => !open)}>{addOpen ? 'Close' : '+ Add Service'}</button>
      </div>

      {addOpen && (
        <RateSheetServiceImportPicker controller={controller} value={value} onDone={() => setAddOpen(false)} />
      )}

      {ordinaryRows(value).length === 0 ? (
        <p class="cz-station-empty">No priced rows yet. Use + Add Service to price a connected source's supplied content.</p>
      ) : (
        <RateSheetGridEditor rows={ordinaryRows(value)} groups={value.groups} units={controller.units} commands={controller} lockCommands={controller} />
      )}
    </div>
  );
}

