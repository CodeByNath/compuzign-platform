import { useEffect, useState } from 'preact/hooks';
import { fetchAdminCatalog } from '@/api/endpoints/admin';
import type { PackageCategoryGroupItem, PackageSourceRelationship, StationSummary } from '@/api/types/admin';
import { PRESENTATION_PILL } from '../schema/presentation';
import { packageServiceCategoryGroup } from './providers/package';

// Package Manager Services collection (Services sub-tab, Details section).
//
// Lists every catalog Service with its Service-owned identity beside its
// Package-owned commercial assignment. Service Category remains available as a
// filter, but is intentionally omitted from each row. The Package Category
// Group dropdown is the connect-and-assign gesture: picking a group for an
// unconnected Service creates the source relationship in the provider draft and
// assigns it in one step; the manager Save footer persists it. Service content
// is never copied here.

interface Props {
  sources: PackageSourceRelationship[];
  categoryGroups: PackageCategoryGroupItem[];
  hostServiceId: number;
  onAssign: (serviceId: number, categoryGroupId: string | null) => void;
  onOpenService: (summary: StationSummary, edit: boolean) => void;
  // Optional controlled Category Group filter (Phase 2 workspace scope).
  // When supplied, the table's existing dropdown reads and writes the
  // workspace scope instead of local state — one filtering mechanism.
  categoryGroupFilter?: string;
  onCategoryGroupFilterChange?: (value: string) => void;
}

function serviceStatusPill(summary: StationSummary) {
  const pill = summary.platform_status === 'active'
    ? (summary.has_drafts ? { cls: PRESENTATION_PILL.active.cls, label: 'Active · changes pending' } : PRESENTATION_PILL.active)
    : summary.module_status.overview !== 'settled'
      ? PRESENTATION_PILL.pending
      : PRESENTATION_PILL.disabled;
  return <span class={`cz-module-status-pill ${pill.cls}`}>{pill.label}</span>;
}

function serviceStatusKey(summary: StationSummary): 'active' | 'pending' | 'disabled' {
  if (summary.platform_status === 'active') return 'active';
  return summary.module_status.overview !== 'settled' ? 'pending' : 'disabled';
}

export function PackageServicesTable({ sources, categoryGroups, hostServiceId, onAssign, onOpenService, categoryGroupFilter: controlledGroupFilter, onCategoryGroupFilterChange }: Props) {
  const [services, setServices] = useState<StationSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [localGroupFilter, setLocalGroupFilter] = useState('all');
  const categoryGroupFilter = controlledGroupFilter ?? localGroupFilter;
  const setCategoryGroupFilter = onCategoryGroupFilterChange ?? setLocalGroupFilter;
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openActions, setOpenActions] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminCatalog()
      .then((catalog) => { if (!cancelled) setServices(catalog.stations); })
      .catch((error) => { if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Could not load Services.'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (openActions === null) return undefined;
    const close = () => setOpenActions(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openActions]);

  // Assignable buckets: live groups only. Binned groups keep their existing
  // assignments (rows still display them) but accept no new members.
  const assignableGroups = categoryGroups.filter((group) => (
    group.platform_status === 'active' || group.platform_status === 'disabled'
  ));
  const groupLabels = new Map(categoryGroups.map((group) => [group.group_id, group.label]));
  const categories = [...new Set((services ?? []).flatMap((service) => service.categories.map((category) => category.name)))]
    .sort((left, right) => left.localeCompare(right));
  const visibleServices = (services ?? []).filter((summary) => {
    const assignment = packageServiceCategoryGroup({ sources }, summary.id) ?? null;
    if (categoryGroupFilter !== 'all'
      && (categoryGroupFilter === 'unassigned' ? assignment !== null : assignment !== categoryGroupFilter)) return false;
    if (categoryFilter !== 'all' && !summary.categories.some((category) => category.name === categoryFilter)) return false;
    if (statusFilter !== 'all' && serviceStatusKey(summary) !== statusFilter) return false;
    return true;
  });

  return (
    <section class="cz-manager-section cz-manager-section--content-only" aria-label="Services">
      <div class="cz-manager-section__title"><div><h3>Your Services</h3><p>Service-owned catalogue content with Package-owned family assignment.</p></div></div>
      {services === null && !loadError && <p class="cz-sp-tier-table__muted">Loading Services…</p>}
      {loadError && <div class="cz-admin-error-msg" role="alert">{loadError}</div>}
      {services !== null && services.length === 0 && (
        <div class="cz-manager-empty"><strong>No Services in the catalogue yet.</strong></div>
      )}
      {services !== null && services.length > 0 && (
        <>
        <div class="cz-manager-select-filters cz-manager-services-filters" role="group" aria-label="Service filters">
          <label class="cz-tf-field"><span>Category Group</span>
            <select class="cz-tf-select" value={categoryGroupFilter} onChange={(event) => setCategoryGroupFilter(event.currentTarget.value)}>
              <option value="all">All Category Groups</option>
              <option value="unassigned">Unassigned</option>
              {categoryGroups.map((group) => <option value={group.group_id} key={group.group_id}>{group.label}</option>)}
            </select>
          </label>
          <label class="cz-tf-field"><span>Category</span>
            <select class="cz-tf-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.currentTarget.value)}>
              <option value="all">All Categories</option>
              {categories.map((category) => <option value={category} key={category}>{category}</option>)}
            </select>
          </label>
          <label class="cz-tf-field"><span>Status</span>
            <select class="cz-tf-select" value={statusFilter} onChange={(event) => setStatusFilter(event.currentTarget.value)}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="disabled">Disabled</option>
            </select>
          </label>
        </div>
        {visibleServices.length === 0 ? (
          <div class="cz-manager-empty"><strong>No Services match the current filters.</strong></div>
        ) : <div class="cz-manager-collection cz-manager-collection--services" role="table" aria-label="Services">
          <div class="cz-manager-collection__header" role="row">
            <span role="columnheader">Service</span>
            <span role="columnheader">Category Group</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Action</span>
          </div>
          <div class="cz-manager-collection__body" role="rowgroup">{visibleServices.map((summary) => {
              const assignment = packageServiceCategoryGroup({ sources }, summary.id);
              const connected = assignment !== undefined
                || (sources.length === 0 && hostServiceId > 0 && summary.id === hostServiceId);
              const currentGroupId = assignment ?? null;
              const staleAssignment = currentGroupId !== null
                && !assignableGroups.some((group) => group.group_id === currentGroupId);
              return (
                <div class="cz-manager-collection__row" role="row" key={summary.id}>
                  <div class="cz-manager-collection__cell cz-manager-collection__identity" role="cell" data-label="Service">
                    <strong>{summary.title}</strong>
                  </div>
                  <div class="cz-manager-collection__cell" role="cell" data-label="Category Group">
                    <select class="cz-tf-select" aria-label={`Category Group for ${summary.title}`}
                      value={currentGroupId ?? ''}
                      onChange={(event) => onAssign(summary.id, event.currentTarget.value || null)}>
                      <option value="">Unassigned</option>
                      {assignableGroups.map((group) => (
                        <option value={group.group_id} key={group.group_id}>{group.label}</option>
                      ))}
                      {staleAssignment && (
                        <option value={currentGroupId}>{groupLabels.get(currentGroupId) ?? currentGroupId} (binned)</option>
                      )}
                    </select>
                  </div>
                  <div class="cz-manager-collection__cell cz-manager-collection__status" role="cell" data-label="Status">
                    {serviceStatusPill(summary)}
                    <small>{connected ? 'Connected' : 'Not connected'}</small>
                  </div>
                  <div class="cz-manager-collection__cell cz-manager-collection__action" role="cell" data-label="Action">
                    <div class="cz-manager-split-action">
                      <div class="cz-manager-split-action__control">
                        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm cz-manager-split-action__primary"
                          onClick={() => { setOpenActions(null); onOpenService(summary, false); }}>View</button>
                        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm cz-manager-split-action__toggle"
                          aria-label={`More actions for ${summary.title}`} aria-expanded={openActions === summary.id}
                          onClick={(event) => { event.stopPropagation(); setOpenActions(openActions === summary.id ? null : summary.id); }}>▾</button>
                      </div>
                      {openActions === summary.id && (
                        <div class="cz-manager-split-action__menu" onClick={(event) => event.stopPropagation()}>
                          <button type="button" onClick={() => { setOpenActions(null); onOpenService(summary, true); }}>Edit</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}</div>
        </div>}
        </>
      )}
    </section>
  );
}
