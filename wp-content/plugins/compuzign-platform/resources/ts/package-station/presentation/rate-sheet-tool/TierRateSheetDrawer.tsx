// The focused Tier's Rate Sheet connections — content for the registered
// `tier-rate-sheet` and `tier-rate-sheet-group` drawer templates.
//
// Siblings of `rate-sheet`, not variants of it. The Rate Sheet drawer authors the
// whole collection; these two open ONE TIER'S connection to one sheet, or to one
// group inside it, and show only what that Tier is connected to:
//
//   tier-rate-sheet        the readable `cz-rate-sheet-tool__grid` filtered to the
//                          focused Tier's connected rows, and the editable grid
//                          over the same rows. No Groups section.
//   tier-rate-sheet-group  the addressed group's own identity in the module
//                          header (name, status, row count) with the focused
//                          Tier's rows from it as the readable grid — no separate
//                          groups block, since it would only repeat the header —
//                          and the editable groups block in Edit.
//
// Both are the SAME presentations the Rate Sheet tool renders (./rateSheetParts)
// over the SAME controller, committed through the SAME Package Manager save. One
// Edit action moves the drawer from view to edit — the registered drawer mode —
// and `InlineEditorShell` owns the single Save/Cancel footer and the dirty-cancel
// confirm, exactly as the Rate Sheet drawer does. Neither drawer opens the Tier
// drawer, and neither adds an editor, an endpoint, or an id.
//
// View mode also carries the canonical Drawer Tab Contract (DrawerTabs —
// Overview | Connections), matching Package Family and Tier: Overview is the
// scope above; Connections is read-only and lists the supplying Services behind
// the scoped rows, resolved from the manager relationship's own stored
// `source_service_id`/`source_service_title` (the same provenance the Tier
// Inclusion drawer's Service shell already reads) — never a second lookup, never
// a placeholder. `rate-sheet` itself has no such tab because its own edit mode
// already exposes source Services directly through its picker; these narrower
// connection drawers had no equivalent, which is the gap this closes. Edit mode
// stays tab-less, exactly as `rate-sheet`'s edit mode is.

import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { DrawerContentProps } from '@/station-manager/drawerTypes';
import { DrawerTabs } from '@/drawer-kit/DrawerTabs';
import type { DrawerBaseTabId } from '@/drawer-kit/DrawerTabs';
import { EntityActionFooter } from '@/drawer-kit/EntityActionFooter';
import { InlineEditorShell } from '@/drawer-kit/InlineEditorShell';
import { ReadBlock } from '@/drawer-kit/ReadBlock';
import { RateSheetIcon, ServicesIcon } from '@/admin-station/shell/icons';
import { decodeTierRateSheetDrawerRecordId } from '../../drawer/tier-rate-sheet/tierRateSheetDrawerTypes';
import type { TierRateSheetDrawerTarget } from '../../drawer/tier-rate-sheet/tierRateSheetDrawerTypes';
import { useTierRateSheetDrawer } from '../../surface/rateSheetTool/useTierRateSheetDrawer';
import type { TierRateSheetDrawerState } from '../../surface/rateSheetTool/useTierRateSheetDrawer';
import { TIER_LABELS } from '../../vocabulary';
import { connectedServicesForRows } from '../../surface/rateSheetTool/rateSheetToolModel';
import {
  RateSheetGridEditor,
  RateSheetGridRead,
  RateSheetGroupsEditor,
} from './rateSheetParts';

// ── SECTION: drawer content ───────────────────────────────────────────────────

export function TierRateSheetDrawerContent(props: DrawerContentProps): VNode {
  const target = typeof props.recordId === 'string'
    ? decodeTierRateSheetDrawerRecordId(props.recordId)
    : null;
  if (target === null) {
    return <div class="cz-station-drawer__state">This Rate Sheet connection identity is invalid.</div>;
  }
  return <TierRateSheetDrawerBody target={target} {...props} />;
}

function TierRateSheetDrawerBody({
  target, mode, onClose, onModeChange, onSaved, setFooter, setCloseGuard,
}: DrawerContentProps & { target: TierRateSheetDrawerTarget }): VNode {
  const savedRef = useRef(onSaved); savedRef.current = onSaved;
  const modeRef  = useRef(onModeChange); modeRef.current = onModeChange;
  const [activeTab, setActiveTab] = useState<DrawerBaseTabId>('details');

  const notifySaved = useCallback(() => savedRef.current(), []);
  const scope = useTierRateSheetDrawer(
    target.instanceId,
    target.slotId,
    target.rateSheetId,
    target.scope,
    notifySaved,
  );

  const editing = mode === 'edit';
  const { dirty, saving, saveError, tool } = scope;

  // Leaving a save returns the drawer to its readable scope and refreshes the
  // wall it was opened from; the focused Tier and Family selections live on that
  // wall and are never touched from here.
  const explicitSave = useRef(false);
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
    setCloseGuard?.(dirty ? () => window.confirm('Discard unsaved Rate Sheet changes?') : null);
    return () => setCloseGuard?.(null);
  }, [setCloseGuard, dirty]);

  const requestEdit = useCallback(() => onModeChange('edit'), [onModeChange]);
  const leaveEdit = useCallback(() => { tool?.discard(); onModeChange('view'); }, [tool, onModeChange]);
  const save = useCallback(async () => {
    if (!tool) return;
    explicitSave.current = true;
    await tool.save();
  }, [tool]);

  // The record footer stays Close-only, exactly as the Package Family and Tier
  // drawers leave it: this drawer's single module already owns its own Edit
  // action in its footer, so the record footer never repeats it.
  useEffect(() => {
    if (!setFooter) return;
    if (editing) { setFooter(null); return () => setFooter(null); }
    setFooter(<EntityActionFooter close={{ id: 'close', label: 'Close', onSelect: onClose }} />);
    return () => setFooter(null);
  }, [setFooter, editing, onClose]);

  if (scope.loading) {
    return <div class="cz-station-drawer__state" aria-busy="true">Loading this Tier's Rate Sheet connection…</div>;
  }
  if (scope.unavailable !== null) {
    return <div class="cz-station-drawer__state" role="alert">{scope.unavailable}</div>;
  }

  const tierLabel = TIER_LABELS[target.slotId] ?? target.slotId;
  const title = target.scope.kind === 'group'
    ? (scope.group?.label.trim() || 'Untitled group')
    : (scope.sheet?.title.trim() || 'Untitled Rate Sheet');

  if (editing) {
    return (
      <InlineEditorShell
        title={title}
        onSave={save}
        onCancel={leaveEdit}
        saving={saving}
        saveErr={saveError}
        isDirty={dirty}
        saveDisabled={!dirty}
      >
        <TierRateSheetEditScope scope={scope} target={target} tierLabel={tierLabel} />
      </InlineEditorShell>
    );
  }
  return (
    <div class="cz-req-detail">
      <DrawerTabs active={activeTab} onSelect={setActiveTab} />
      {activeTab === 'details' ? (
        <TierRateSheetReadScope scope={scope} target={target} tierLabel={tierLabel} title={title} onEdit={requestEdit} />
      ) : (
        <TierRateSheetConnectionsScope scope={scope} tierLabel={tierLabel} />
      )}
    </div>
  );
}

// ── SECTION: view mode ────────────────────────────────────────────────────────

function TierRateSheetReadScope({
  scope, target, tierLabel, title, onEdit,
}: {
  scope: TierRateSheetDrawerState;
  target: TierRateSheetDrawerTarget;
  tierLabel: string;
  title: string;
  onEdit: () => void;
}): VNode {
  const isGroup = target.scope.kind === 'group';
  const identity = isGroup ? (scope.group?.id ?? '') : target.rateSheetId;
  const subtitle = isGroup
    ? `${identity} · rows the ${tierLabel} Tier draws from this group.`
    : `${identity} · inclusions the ${tierLabel} Tier connects to in this sheet.`;
  // Module status pill: the Presentation Status Contract renders only
  // Active/Pending/Disabled (drawer-kit/schema/presentation.ts). A Rate Sheet's
  // own status is 'active' | 'archived' — not a travel state here, so 'archived'
  // presents as the closest canonical module state, Disabled. A group carries no
  // status of its own (RateSheetEditorGroup stores no lifecycle), so both scopes
  // read the parent sheet's status — the same inheritance packageTierWorkspace's
  // deck already applies to this drawer's own Connections-lane row.
  const status = scope.sheet?.status === 'archived' ? 'disabled' : 'active';

  return (
    <ReadBlock
      title={title}
      subtitle={subtitle}
      icon={<RateSheetIcon />}
      scopeClass="drawerOverview"
      status={status}
      actions={[{ id: 'edit', label: 'Edit', onSelect: onEdit }]}
    >
      {scope.scopedRows.length === 0 ? (
        <div class="drawerModule__empty">
          <p class="drawerModule__empty-title">No connected rows</p>
          <p class="drawerModule__empty-copy">
            {isGroup
              ? `The ${tierLabel} Tier selects no row from this group.`
              : `The ${tierLabel} Tier selects no resolving row from this Rate Sheet.`}
          </p>
        </div>
      ) : (
        <RateSheetGridRead rows={scope.scopedRows} groups={scope.sheet?.groups ?? []} />
      )}
    </ReadBlock>
  );
}

// ── SECTION: Connections tab ──────────────────────────────────────────────────

/**
 * Read-only. Lists the supplying Services behind the scoped rows, resolved
 * from the manager relationship's own stored `source_service_id`/`_title` —
 * the same field the Tier Inclusion drawer's Service shell reads. No
 * navigation into Service Station: Package Station reports the connection's
 * identity, never a cross-station link, matching the Tier Inclusion Service
 * shell's own read-only precedent.
 */
function TierRateSheetConnectionsScope({
  scope, tierLabel,
}: {
  scope: TierRateSheetDrawerState;
  tierLabel: string;
}): VNode {
  const services = connectedServicesForRows(scope.scopedRows);

  return (
    <ReadBlock
      title="Connections"
      subtitle={`Services supplying the ${tierLabel} Tier's connected rows here.`}
      icon={<ServicesIcon />}
      scopeClass="drawerOverview"
    >
      {services.length === 0 ? (
        <div class="drawerModule__empty">
          <p class="drawerModule__empty-title">No supplying Service</p>
          <p class="drawerModule__empty-copy">
            No connected row here resolves to a supplying Service.
          </p>
        </div>
      ) : (
        <div class="drawerModule__fields">
          {services.map((service) => (
            <div key={service.id} class="drawerModule__field">
              <p class="drawerModule__label">{service.title} · #{service.id}</p>
              <p class="drawerModule__value">{service.rows} connected {service.rows === 1 ? 'row' : 'rows'}</p>
            </div>
          ))}
        </div>
      )}
    </ReadBlock>
  );
}

// ── SECTION: edit mode ────────────────────────────────────────────────────────

function TierRateSheetEditScope({
  scope, target, tierLabel,
}: {
  scope: TierRateSheetDrawerState;
  target: TierRateSheetDrawerTarget;
  tierLabel: string;
}): VNode {
  if (!scope.tool || !scope.sheet) {
    return <p class="cz-station-empty">This Rate Sheet is no longer editable.</p>;
  }

  // Group scope: the existing editable groups block, over the addressed group
  // only. Rows keep their own editor in the Rate Sheet scope.
  if (target.scope.kind === 'group') {
    if (!scope.group) return <p class="cz-station-empty">This Rate Sheet no longer holds this group.</p>;
    return (
      <div class="cz-rate-sheet-tool__sheet">
        <p class="cz-rate-sheet-tool__picker-note">
          Renaming this group changes it for every Tier that uses it. The {tierLabel} Tier draws {scope.scopedRows.length} of its rows.
        </p>
        <RateSheetGroupsEditor groups={[scope.group]} commands={scope.tool} />
      </div>
    );
  }

  // Rate Sheet scope: the existing editable grid, over the focused Tier's rows.
  // Row removal is not offered here — it would delete a row from the sheet for
  // every consumer from a view that shows one Tier's slice of it; that action
  // stays in the Rate Sheet drawer, where the whole sheet is visible.
  return (
    <div class="cz-rate-sheet-tool__sheet">
      <p class="cz-rate-sheet-tool__picker-note">
        Pricing the {scope.scopedRows.length} rows the {tierLabel} Tier connects to. Prices belong to the Rate Sheet, so an edit applies to every Tier using the row.
      </p>
      {scope.scopedRows.length === 0 ? (
        <p class="cz-station-empty">This Tier selects no resolving row from this Rate Sheet.</p>
      ) : (
        <RateSheetGridEditor
          rows={scope.scopedRows}
          groups={scope.sheet.groups}
          units={scope.units}
          commands={scope.tool}
          allowRemove={false}
        />
      )}
    </div>
  );
}
