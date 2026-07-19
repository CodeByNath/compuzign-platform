import { useCallback, useEffect, useState } from 'preact/hooks';
import {
  createPackageFamily,
  fetchPackageFamilies,
  permanentDeletePackageFamily,
  restorePackageFamily,
  revertPackageFamilyOverview,
  savePackageFamilyOverview,
  settlePackageFamilyOverview,
  updatePackageFamilyStatus,
} from '@/api/endpoints/admin';
import type { PackageFamilyItem } from '@/api/types/admin';
import { PRESENTATION_PILL, TRAVEL_PILL } from '@/drawer-kit/schema/presentation';
import type { PillMeta } from '@/drawer-kit/schema/presentation';

// Package Family management (Services > Connections).
//
// The Package-owned commercial bucket station (e.g. KAIROS): create, overview
// draft → apply/discard, publish/disable, archive/trash/restore, and
// guard-protected permanent delete — all through the shared StationLifecycle
// endpoints. Groups contain connected Services; they never replace the
// Service-owned Service Category structure.

type BinScope = 'current' | 'archived' | 'trashed';

// Lifecycle operations offered on a live (current-scope) group. The single
// source of the visibility rules (draft, status, settled-overview branches);
// the section's split menu and the Family Card strip both map these to
// buttons, so the lifecycle logic never forks.
export interface GroupLifecycleOperation {
  id: string;
  label: string;
  kind: 'run' | 'confirm-trash';
  danger?: boolean;
  operation?: () => Promise<unknown>;
}

export function currentGroupLifecycleOperations(row: PackageFamilyItem): GroupLifecycleOperation[] {
  const operations: GroupLifecycleOperation[] = [];
  if (row.has_draft) {
    operations.push(
      { id: 'settle', label: 'Apply changes', kind: 'run', operation: () => settlePackageFamilyOverview(row.group_id) },
      { id: 'revert', label: 'Discard changes', kind: 'run', operation: () => revertPackageFamilyOverview(row.group_id) },
    );
  }
  if (row.platform_status === 'disabled' && !row.has_draft && row.module_status.overview === 'settled') {
    operations.push({ id: 'publish', label: 'Publish', kind: 'run', operation: () => updatePackageFamilyStatus(row.group_id, 'active') });
  }
  if (row.platform_status === 'disabled' && !row.has_draft && row.module_status.overview !== 'settled') {
    operations.push({ id: 'complete', label: 'Complete setup', kind: 'run', operation: () => settlePackageFamilyOverview(row.group_id) });
  }
  if (row.platform_status === 'active') {
    operations.push({ id: 'disable', label: 'Disable', kind: 'run', operation: () => updatePackageFamilyStatus(row.group_id, 'disabled') });
  }
  operations.push(
    { id: 'archive', label: 'Archive', kind: 'run', operation: () => updatePackageFamilyStatus(row.group_id, 'archived') },
    { id: 'trash', label: 'Trash', kind: 'confirm-trash', danger: true },
  );
  return operations;
}

export interface GroupConfirmState {
  id: string; label: string; action: 'trash' | 'delete'; dependents: string;
}

export function PackageFamilyConfirmDialog({ confirming, onCancel, onConfirm }: {
  confirming: GroupConfirmState;
  onCancel: () => void;
  onConfirm: (target: GroupConfirmState) => void;
}) {
  return (
    <div class="cz-publish-confirm-overlay"><div class="cz-publish-confirm" role="dialog" aria-modal="true">
      <div class="cz-publish-confirm__header">
        <h3 class="cz-publish-confirm__title">
          {confirming.action === 'delete' ? `Permanently delete ${confirming.label}?` : `Move ${confirming.label} to Trash?`}
        </h3>
      </div>
      <div class="cz-publish-confirm__body"><p class="cz-publish-confirm__lead">
        {confirming.action === 'delete'
          ? 'This cannot be undone. Deletion is blocked while Services, Rate Sheet rows, or Tiers depend on this group.'
          : `Connected records are preserved (${confirming.dependents}); the group can be restored from the Trash.`}
      </p></div>
      <div class="cz-publish-confirm__footer">
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={onCancel}>Cancel</button>
        <button type="button" class="cz-admin-btn cz-admin-btn--danger" onClick={() => onConfirm(confirming)}>
          {confirming.action === 'delete' ? 'Delete permanently' : 'Move to Trash'}
        </button>
      </div>
    </div></div>
  );
}

// Station status pill — same derivation as the taxonomy Service Category Group table
// (Presentation Status Contract: Active/Pending/Disabled only on live rows).
// Exported for the Family Card strip so both surfaces share one derivation.
export function groupStatusPill(row: PackageFamilyItem): PillMeta {
  if (row.platform_status === 'disabled') {
    return row.module_status.overview !== 'settled'
      ? PRESENTATION_PILL.pending
      : PRESENTATION_PILL.disabled;
  }
  const hasUnsettled = row.has_draft || row.module_status.overview === 'pending';
  return hasUnsettled
    ? { cls: PRESENTATION_PILL.active.cls, label: 'Active · changes pending' }
    : PRESENTATION_PILL.active;
}

export function dependentsSummary(row: PackageFamilyItem): string {
  const parts = [
    `${row.dependents.services} ${row.dependents.services === 1 ? 'Service' : 'Services'}`,
  ];
  if (row.dependents.rate_sheet_rows > 0) parts.push(`${row.dependents.rate_sheet_rows} Rate Sheet ${row.dependents.rate_sheet_rows === 1 ? 'row' : 'rows'}`);
  if (row.dependents.tier_selections > 0) parts.push(`${row.dependents.tier_selections} Tier ${row.dependents.tier_selections === 1 ? 'selection' : 'selections'}`);
  return parts.join(' · ');
}

export function PackageFamiliesSection({ onChanged }: { onChanged: () => void }) {
  const [scope, setScope] = useState<BinScope>('current');
  const [rows, setRows] = useState<PackageFamilyItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyGroupId, setBusyGroupId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string; description: string } | null>(null);
  const [openActions, setOpenActions] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{
    id: string; label: string; action: 'trash' | 'delete'; dependents: string;
  } | null>(null);

  const load = useCallback(async (nextScope: BinScope) => {
    setLoadError(null);
    try {
      const response = await fetchPackageFamilies(nextScope === 'current' ? undefined : nextScope);
      setRows(response.package_category_groups);
    } catch (error) {
      setRows([]);
      setLoadError(error instanceof Error ? error.message : 'Could not load Package Families.');
    }
  }, []);

  useEffect(() => { setRows(null); void load(scope); }, [scope, load]);
  useEffect(() => {
    if (openActions === null) return undefined;
    const close = () => setOpenActions(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openActions]);

  const run = async (groupId: string, operation: () => Promise<unknown>) => {
    setActionError(null);
    setBusyGroupId(groupId);
    try {
      await operation();
      await load(scope);
      onChanged();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The operation failed.');
    } finally {
      setBusyGroupId(null);
    }
  };

  const submitCreate = async () => {
    const name = createName.trim();
    if (!name) return;
    setActionError(null);
    setCreateBusy(true);
    try {
      await createPackageFamily({ name, description: createDescription.trim() || undefined });
      setCreating(false); setCreateName(''); setCreateDescription('');
      await load(scope);
      onChanged();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not create the group.');
    } finally {
      setCreateBusy(false);
    }
  };

  const submitEdit = async () => {
    if (!editing || !editing.name.trim()) return;
    await run(editing.id, () => savePackageFamilyOverview(editing.id, {
      name: editing.name.trim(), description: editing.description,
    }));
    setEditing(null);
  };

  return (
    <section class="cz-manager-section cz-manager-section--content-only" aria-label="Package Families">
      <div class="cz-manager-filters" role="group" aria-label="Group lifecycle scope">
        {(['current', 'archived', 'trashed'] as const).map((candidate) => (
          <button type="button" key={candidate} class={scope === candidate ? 'is-active' : undefined}
            aria-pressed={scope === candidate} onClick={() => { setOpenActions(null); setScope(candidate); }}>
            {candidate === 'current' ? 'Current' : candidate === 'archived' ? 'Archived' : 'Trash'}
          </button>
        ))}
      </div>

      {actionError && <div class="cz-admin-error-msg" role="alert">{actionError}</div>}
      {loadError && <div class="cz-admin-error-msg" role="alert">{loadError}</div>}
      {rows === null && !loadError && <p class="cz-sp-tier-table__muted">Loading Families…</p>}

      {scope === 'current' && (
        creating ? (
          <div class="cz-rate-sheet-editor__group-create">
            <label class="cz-tf-field"><span>Group name</span>
              <input class="cz-tf-input" value={createName} autoFocus placeholder="e.g. KAIROS"
                onInput={(event) => setCreateName(event.currentTarget.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void submitCreate(); } }} />
            </label>
            <label class="cz-tf-field"><span>Description</span>
              <input class="cz-tf-input" value={createDescription}
                onInput={(event) => setCreateDescription(event.currentTarget.value)} />
            </label>
            <button type="button" class="cz-admin-btn cz-admin-btn--primary" disabled={!createName.trim() || createBusy}
              onClick={() => void submitCreate()}>{createBusy ? 'Creating…' : 'Create Group'}</button>
            <button type="button" class="cz-admin-btn cz-admin-btn--secondary" disabled={createBusy}
              onClick={() => { setCreating(false); setCreateName(''); setCreateDescription(''); }}>Cancel</button>
          </div>
        ) : (
          <div class="cz-manager-section__actions">
            <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={() => setCreating(true)}>
              <span aria-hidden="true">+</span> New Family
            </button>
          </div>
        )
      )}

      {rows !== null && rows.length === 0 && !loadError && (
        <div class="cz-manager-empty">
          <strong>{scope === 'current' ? 'No Families yet.' : scope === 'archived' ? 'No archived families.' : 'Trash is empty.'}</strong>
          {scope === 'current' && <p>Create a permanent commercial bucket such as KAIROS, then assign Services to it from the Services tab.</p>}
        </div>
      )}

      {rows !== null && rows.length > 0 && (
        <div class="cz-manager-collection cz-manager-collection--category-groups" role="table" aria-label="Package Families">
          <div class="cz-manager-collection__header" role="row">
            <span role="columnheader">Group</span>
            <span role="columnheader">Connected dependencies</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Action</span>
          </div>
          <div class="cz-manager-collection__body" role="rowgroup">{rows.map((row) => {
              const busy = busyGroupId === row.group_id;
              const pill = scope === 'current'
                ? groupStatusPill(row)
                : TRAVEL_PILL[row.platform_status as 'archived' | 'trashed'] ?? TRAVEL_PILL.archived;
              return (
                <div class="cz-manager-collection__row" role="row" key={row.group_id}>
                  <div class="cz-manager-collection__cell cz-manager-collection__identity" role="cell" data-label="Group">
                    {editing?.id === row.group_id ? (
                      <div class="cz-manager-collection__edit-fields">
                        <input class="cz-tf-input" value={editing.name} autoFocus aria-label={`Rename ${row.label}`}
                          onInput={(event) => setEditing({ ...editing, name: event.currentTarget.value })} />
                        <input class="cz-tf-input" value={editing.description} aria-label={`Description of ${row.label}`}
                          onInput={(event) => setEditing({ ...editing, description: event.currentTarget.value })} />
                      </div>
                    ) : <>
                      <strong>{row.label}</strong>
                      {row.description && <small>{row.description}</small>}
                    </>}
                  </div>
                  <div class="cz-manager-collection__cell cz-manager-collection__secondary" role="cell" data-label="Connected">
                    {dependentsSummary(row)}
                  </div>
                  <div class="cz-manager-collection__cell cz-manager-collection__status" role="cell" data-label="Status">
                    <span class={`cz-module-status-pill ${pill.cls}`}>{pill.label}</span>
                  </div>
                  <div class="cz-manager-collection__cell cz-manager-collection__action" role="cell" data-label="Action">
                    <div class="cz-manager-group-actions">
                      {editing?.id === row.group_id ? (
                        <>
                          <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm"
                            disabled={busy || !editing.name.trim()} onClick={() => void submitEdit()}>Save</button>
                          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                            disabled={busy} onClick={() => setEditing(null)}>Cancel</button>
                        </>
                      ) : (
                        <div class="cz-manager-split-action">
                          <div class="cz-manager-split-action__control">
                            <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm cz-manager-split-action__primary"
                              disabled={busy || scope !== 'current'}
                              onClick={() => setEditing({ id: row.group_id, name: row.label, description: row.description })}>Edit</button>
                            <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm cz-manager-split-action__toggle"
                              disabled={busy} aria-label={`More actions for ${row.label}`} aria-expanded={openActions === row.group_id}
                              onClick={(event) => { event.stopPropagation(); setOpenActions(openActions === row.group_id ? null : row.group_id); }}>▾</button>
                          </div>
                          {openActions === row.group_id && (
                            <div class="cz-manager-split-action__menu" onClick={(event) => event.stopPropagation()}>
                              {scope === 'current' ? <>
                                {currentGroupLifecycleOperations(row).map((operation) => (
                                  <button type="button" key={operation.id} class={operation.danger ? 'is-danger' : undefined}
                                    onClick={() => {
                                      setOpenActions(null);
                                      if (operation.kind === 'confirm-trash') setConfirming({ id: row.group_id, label: row.label, action: 'trash', dependents: dependentsSummary(row) });
                                      else if (operation.operation) void run(row.group_id, operation.operation);
                                    }}>{operation.label}</button>
                                ))}
                              </> : <>
                                <button type="button" onClick={() => { setOpenActions(null); void run(row.group_id, () => restorePackageFamily(row.group_id)); }}>Restore</button>
                                {scope === 'archived' && <button type="button" class="is-danger" onClick={() => { setOpenActions(null); setConfirming({ id: row.group_id, label: row.label, action: 'trash', dependents: dependentsSummary(row) }); }}>Move to Trash</button>}
                                {scope === 'trashed' && <button type="button" class="is-danger" onClick={() => { setOpenActions(null); setConfirming({ id: row.group_id, label: row.label, action: 'delete', dependents: dependentsSummary(row) }); }}>Delete permanently</button>}
                              </>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}</div>
        </div>
      )}

      {confirming && (
        <PackageFamilyConfirmDialog
          confirming={confirming}
          onCancel={() => setConfirming(null)}
          onConfirm={(target) => {
            setConfirming(null);
            void run(target.id, () => target.action === 'delete'
              ? permanentDeletePackageFamily(target.id)
              : updatePackageFamilyStatus(target.id, 'trashed'));
          }}
        />
      )}
    </section>
  );
}
