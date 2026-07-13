import { useCallback, useEffect, useState } from 'preact/hooks';
import {
  createPackageCategoryGroup,
  fetchPackageCategoryGroups,
  permanentDeletePackageCategoryGroup,
  restorePackageCategoryGroup,
  revertPackageCategoryGroupOverview,
  savePackageCategoryGroupOverview,
  settlePackageCategoryGroupOverview,
  updatePackageCategoryGroupStatus,
} from '@/api/endpoints/admin';
import type { PackageCategoryGroupItem } from '@/api/types/admin';
import { PRESENTATION_PILL, TRAVEL_PILL } from '../schema/presentation';
import type { PillMeta } from '../schema/presentation';

// Package Category Group management (Services > Connections).
//
// The Package-owned commercial bucket station (e.g. KAIROS): create, overview
// draft → apply/discard, publish/disable, archive/trash/restore, and
// guard-protected permanent delete — all through the shared StationLifecycle
// endpoints. Groups contain connected Services; they never replace the
// Service-owned Service Category structure.

type BinScope = 'current' | 'archived' | 'trashed';

// Station status pill — same derivation as the taxonomy Category Group table
// (Presentation Status Contract: Active/Pending/Disabled only on live rows).
function groupStatusPill(row: PackageCategoryGroupItem): PillMeta {
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

function dependentsSummary(row: PackageCategoryGroupItem): string {
  const parts = [
    `${row.dependents.services} ${row.dependents.services === 1 ? 'Service' : 'Services'}`,
  ];
  if (row.dependents.rate_sheet_rows > 0) parts.push(`${row.dependents.rate_sheet_rows} Rate Sheet ${row.dependents.rate_sheet_rows === 1 ? 'row' : 'rows'}`);
  if (row.dependents.tier_selections > 0) parts.push(`${row.dependents.tier_selections} Tier ${row.dependents.tier_selections === 1 ? 'selection' : 'selections'}`);
  return parts.join(' · ');
}

export function PackageCategoryGroupsSection({ onChanged }: { onChanged: () => void }) {
  const [scope, setScope] = useState<BinScope>('current');
  const [rows, setRows] = useState<PackageCategoryGroupItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyGroupId, setBusyGroupId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string; description: string } | null>(null);
  const [confirming, setConfirming] = useState<{
    id: string; label: string; action: 'trash' | 'delete'; dependents: string;
  } | null>(null);

  const load = useCallback(async (nextScope: BinScope) => {
    setLoadError(null);
    try {
      const response = await fetchPackageCategoryGroups(nextScope === 'current' ? undefined : nextScope);
      setRows(response.package_category_groups);
    } catch (error) {
      setRows([]);
      setLoadError(error instanceof Error ? error.message : 'Could not load Category Groups.');
    }
  }, []);

  useEffect(() => { setRows(null); void load(scope); }, [scope, load]);

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
      await createPackageCategoryGroup({ name, description: createDescription.trim() || undefined });
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
    await run(editing.id, () => savePackageCategoryGroupOverview(editing.id, {
      name: editing.name.trim(), description: editing.description,
    }));
    setEditing(null);
  };

  return (
    <section class="cz-manager-section" aria-labelledby="manager-category-groups">
      <h4 id="manager-category-groups">Category Groups</h4>

      <div class="cz-manager-filters" role="group" aria-label="Group lifecycle scope">
        {(['current', 'archived', 'trashed'] as const).map((candidate) => (
          <button type="button" key={candidate} class={scope === candidate ? 'is-active' : undefined}
            aria-pressed={scope === candidate} onClick={() => setScope(candidate)}>
            {candidate === 'current' ? 'Current' : candidate === 'archived' ? 'Archived' : 'Trash'}
          </button>
        ))}
      </div>

      {actionError && <div class="cz-admin-error-msg" role="alert">{actionError}</div>}
      {loadError && <div class="cz-admin-error-msg" role="alert">{loadError}</div>}
      {rows === null && !loadError && <p class="cz-sp-tier-table__muted">Loading Category Groups…</p>}

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
              <span aria-hidden="true">+</span> New Category Group
            </button>
          </div>
        )
      )}

      {rows !== null && rows.length === 0 && !loadError && (
        <div class="cz-manager-empty">
          <strong>{scope === 'current' ? 'No Category Groups yet.' : scope === 'archived' ? 'No archived groups.' : 'Trash is empty.'}</strong>
          {scope === 'current' && <p>Create a permanent commercial bucket such as KAIROS, then assign Services to it from the Services tab.</p>}
        </div>
      )}

      {rows !== null && rows.length > 0 && (
        <div class="cz-sp-tier-table-wrap">
          <table class="cz-sp-tier-table cz-manager-relationships">
            <thead><tr>
              <th>Group</th><th>Description</th><th>Connected</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>{rows.map((row) => {
              const busy = busyGroupId === row.group_id;
              const pill = scope === 'current'
                ? groupStatusPill(row)
                : TRAVEL_PILL[row.platform_status as 'archived' | 'trashed'] ?? TRAVEL_PILL.archived;
              return (
                <tr key={row.group_id}>
                  <td class="cz-sp-tier-table__name">
                    {editing?.id === row.group_id ? (
                      <input class="cz-tf-input" value={editing.name} autoFocus aria-label={`Rename ${row.label}`}
                        onInput={(event) => setEditing({ ...editing, name: event.currentTarget.value })} />
                    ) : row.label}
                  </td>
                  <td class="cz-sp-tier-table__muted">
                    {editing?.id === row.group_id ? (
                      <input class="cz-tf-input" value={editing.description} aria-label={`Description of ${row.label}`}
                        onInput={(event) => setEditing({ ...editing, description: event.currentTarget.value })} />
                    ) : (row.description || '—')}
                  </td>
                  <td class="cz-sp-tier-table__muted">{dependentsSummary(row)}</td>
                  <td><span class={`cz-module-status-pill ${pill.cls}`}>{pill.label}</span></td>
                  <td>
                    <div class="cz-manager-group-actions">
                      {editing?.id === row.group_id ? (
                        <>
                          <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm"
                            disabled={busy || !editing.name.trim()} onClick={() => void submitEdit()}>Save</button>
                          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                            disabled={busy} onClick={() => setEditing(null)}>Cancel</button>
                        </>
                      ) : scope === 'current' ? (
                        <>
                          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={busy}
                            onClick={() => setEditing({ id: row.group_id, name: row.label, description: row.description })}>Edit</button>
                          {row.has_draft && (
                            <>
                              <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" disabled={busy}
                                onClick={() => void run(row.group_id, () => settlePackageCategoryGroupOverview(row.group_id))}>Apply changes</button>
                              <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={busy}
                                onClick={() => void run(row.group_id, () => revertPackageCategoryGroupOverview(row.group_id))}>Discard changes</button>
                            </>
                          )}
                          {row.platform_status === 'disabled' && !row.has_draft && row.module_status.overview === 'settled' && (
                            <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" disabled={busy}
                              onClick={() => void run(row.group_id, () => updatePackageCategoryGroupStatus(row.group_id, 'active'))}>Publish</button>
                          )}
                          {row.platform_status === 'disabled' && !row.has_draft && row.module_status.overview !== 'settled' && (
                            <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" disabled={busy}
                              onClick={() => void run(row.group_id, () => settlePackageCategoryGroupOverview(row.group_id))}>Complete setup</button>
                          )}
                          {row.platform_status === 'active' && (
                            <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={busy}
                              onClick={() => void run(row.group_id, () => updatePackageCategoryGroupStatus(row.group_id, 'disabled'))}>Disable</button>
                          )}
                          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={busy}
                            onClick={() => void run(row.group_id, () => updatePackageCategoryGroupStatus(row.group_id, 'archived'))}>Archive</button>
                          <button type="button" class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--sm" disabled={busy}
                            onClick={() => setConfirming({ id: row.group_id, label: row.label, action: 'trash', dependents: dependentsSummary(row) })}>Trash</button>
                        </>
                      ) : (
                        <>
                          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={busy}
                            onClick={() => void run(row.group_id, () => restorePackageCategoryGroup(row.group_id))}>Restore</button>
                          {scope === 'archived' && (
                            <button type="button" class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--sm" disabled={busy}
                              onClick={() => setConfirming({ id: row.group_id, label: row.label, action: 'trash', dependents: dependentsSummary(row) })}>Move to Trash</button>
                          )}
                          {scope === 'trashed' && (
                            <button type="button" class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--sm" disabled={busy}
                              onClick={() => setConfirming({ id: row.group_id, label: row.label, action: 'delete', dependents: dependentsSummary(row) })}>Delete permanently</button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}

      {confirming && (
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
            <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => setConfirming(null)}>Cancel</button>
            <button type="button" class="cz-admin-btn cz-admin-btn--danger" onClick={() => {
              const target = confirming;
              setConfirming(null);
              void run(target.id, () => target.action === 'delete'
                ? permanentDeletePackageCategoryGroup(target.id)
                : updatePackageCategoryGroupStatus(target.id, 'trashed'));
            }}>{confirming.action === 'delete' ? 'Delete permanently' : 'Move to Trash'}</button>
          </div>
        </div></div>
      )}
    </section>
  );
}
