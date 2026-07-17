import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import {
  permanentDeletePackageFamily,
  updatePackageFamilyStatus,
} from '@/api/endpoints/admin';
import type { PackageFamilyItem, PackageSourceRelationship } from '@/api/types/admin';
import {
  PackageFamilyConfirmDialog,
  currentGroupLifecycleOperations,
  dependentsSummary,
  groupStatusPill,
} from './PackageFamiliesSection';
import type { GroupConfirmState } from './PackageFamiliesSection';

// Family Card strip (Phase 2 — family-first workspace scope).
//
// Presents the Package Category Groups (KAIROS, APTOS, OMNIA, …) already
// loaded by DynamicStationManager as selectable scope cards; selecting one
// establishes the workspace `selectedFamilyId`. "All Groups" and
// "Ungrouped" stay first-class scopes so unassigned sources never disappear
// behind a mandatory family selection. Lifecycle split actions reuse the
// shared operations exported by PackageFamiliesSection — no second
// lifecycle implementation. Metrics come from the saved read model
// (`dependents`), not the working draft.

export type WorkspaceGroupScope = 'all' | 'unassigned' | string;

function serviceAssignmentCounts(sources: readonly PackageSourceRelationship[]): { total: number; unassigned: number } {
  let total = 0;
  let unassigned = 0;
  for (const source of sources) {
    if (source.provider_key !== 'service' || source.entity_type !== 'service') continue;
    total += 1;
    if ((source.category_group_id ?? null) === null) unassigned += 1;
  }
  return { total, unassigned };
}

export function PackageFamilyCards({ groups, sources, selected, onSelect, busy, onLifecycleAction, onManageGroups }: {
  groups: readonly PackageFamilyItem[];
  sources: readonly PackageSourceRelationship[];
  selected: WorkspaceGroupScope;
  onSelect: (scope: WorkspaceGroupScope) => void;
  // A lifecycle mutation ran (or failed); the host reloads its group registry.
  busy: boolean;
  onLifecycleAction: (groupId: string, operation: () => Promise<unknown>) => void;
  // Hand off to the existing lifecycle station (Services > Connections) for
  // create/edit — the strip owns no editor.
  onManageGroups: (group?: PackageFamilyItem) => void;
}) {
  const [openActions, setOpenActions] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<GroupConfirmState | null>(null);

  useEffect(() => {
    if (openActions === null) return undefined;
    const close = () => setOpenActions(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openActions]);

  const counts = serviceAssignmentCounts(sources);
  const card = (scope: WorkspaceGroupScope, body: ComponentChildren, utility = false) => (
    <div
      class={`cz-family-card${utility ? ' cz-family-card--utility' : ' cz-family-card--primary'}${selected === scope ? ' is-selected' : ''}`}
      role="radio"
      aria-checked={selected === scope}
      tabIndex={0}
      onClick={() => onSelect(scope)}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(scope); } }}
      key={scope}
    >
      {body}
    </div>
  );

  return (
    <section class="cz-family-strip" aria-label="Category Group scope">
      <div class="cz-family-strip__utilities" role="radiogroup" aria-label="Utility scopes">
        {card('all', <>
          <strong class="cz-family-card__name">All Groups</strong>
          <span class="cz-family-card__meta">{counts.total} connected {counts.total === 1 ? 'Service' : 'Services'}</span>
        </>, true)}
        {card('unassigned', <>
          <strong class="cz-family-card__name">Ungrouped</strong>
          <span class="cz-family-card__meta">{counts.unassigned} connected {counts.unassigned === 1 ? 'Service' : 'Services'}</span>
        </>, true)}
      </div>
      <div class="cz-family-strip__cards" role="radiogroup" aria-label="Workspace scope">
        {groups.map((group) => {
          const pill = groupStatusPill(group);
          return card(group.group_id, <>
            <div class="cz-family-card__head">
              <div class="cz-family-card__identity">
                <span class="cz-family-card__monogram" aria-hidden="true">{group.label.trim().charAt(0).toUpperCase() || 'G'}</span>
                <div>
                  <strong class="cz-family-card__name">{group.label}</strong>
                  <span class="cz-family-card__kind">Service family</span>
                </div>
              </div>
              <span class={`cz-module-status-pill ${pill.cls}`}>{pill.label}</span>
            </div>
            {group.description && <p class="cz-family-card__description">{group.description}</p>}
            <dl class="cz-family-card__metrics">
              <div><dt>Services</dt><dd>{group.dependents.services}</dd></div>
              <div><dt>Rate Sheet rows</dt><dd>{group.dependents.rate_sheet_rows}</dd></div>
              <div><dt>Tier selections</dt><dd>{group.dependents.tier_selections}</dd></div>
            </dl>
            <div class="cz-manager-split-action cz-family-card__actions" onClick={(event) => event.stopPropagation()}>
              <div class="cz-manager-split-action__control">
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm cz-manager-split-action__primary"
                  disabled={busy} onClick={() => onManageGroups(group)}>Edit</button>
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm cz-manager-split-action__toggle"
                  disabled={busy} aria-label={`More actions for ${group.label}`} aria-expanded={openActions === group.group_id}
                  onClick={(event) => { event.stopPropagation(); setOpenActions(openActions === group.group_id ? null : group.group_id); }}>▾</button>
              </div>
              {openActions === group.group_id && (
                <div class="cz-manager-split-action__menu" onClick={(event) => event.stopPropagation()}>
                  {currentGroupLifecycleOperations(group).map((operation) => (
                    <button type="button" key={operation.id} class={operation.danger ? 'is-danger' : undefined}
                      onClick={() => {
                        setOpenActions(null);
                        if (operation.kind === 'confirm-trash') setConfirming({ id: group.group_id, label: group.label, action: 'trash', dependents: dependentsSummary(group) });
                        else if (operation.operation) onLifecycleAction(group.group_id, operation.operation);
                      }}>{operation.label}</button>
                  ))}
                </div>
              )}
            </div>
          </>);
        })}
      </div>
      {confirming && (
        <PackageFamilyConfirmDialog
          confirming={confirming}
          onCancel={() => setConfirming(null)}
          onConfirm={(target) => {
            setConfirming(null);
            onLifecycleAction(target.id, () => target.action === 'delete'
              ? permanentDeletePackageFamily(target.id)
              : updatePackageFamilyStatus(target.id, 'trashed'));
          }}
        />
      )}
    </section>
  );
}
