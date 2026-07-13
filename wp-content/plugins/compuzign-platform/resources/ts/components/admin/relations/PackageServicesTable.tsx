import { useEffect, useState } from 'preact/hooks';
import { fetchAdminCatalog } from '@/api/endpoints/admin';
import type { PackageCategoryGroupItem, PackageSourceRelationship, StationSummary } from '@/api/types/admin';
import { PRESENTATION_PILL } from '../schema/presentation';
import { packageServiceCategoryGroup } from './providers/package';

// Package Manager Services table (Services sub-tab, Details section).
//
// Lists every catalog Service with its Service-owned identity (title,
// Service Categories, pool counts) beside its Package-owned commercial
// assignment. The Package Category Group dropdown is the connect-and-assign
// gesture: picking a group for an unconnected Service creates the source
// relationship in the provider draft and assigns it in one step; the manager
// Save footer persists it. Service content is never copied here.

interface Props {
  sources: PackageSourceRelationship[];
  categoryGroups: PackageCategoryGroupItem[];
  hostServiceId: number;
  onAssign: (serviceId: number, categoryGroupId: string | null) => void;
  onOpenService: (summary: StationSummary, edit: boolean) => void;
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

export function PackageServicesTable({ sources, categoryGroups, hostServiceId, onAssign, onOpenService }: Props) {
  const [services, setServices] = useState<StationSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [categoryGroupFilter, setCategoryGroupFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    fetchAdminCatalog()
      .then((catalog) => { if (!cancelled) setServices(catalog.stations); })
      .catch((error) => { if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Could not load Services.'); });
    return () => { cancelled = true; };
  }, []);

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
        ) : <div class="cz-sp-tier-table-wrap cz-manager-services-table-wrap">
          <table class="cz-sp-tier-table cz-manager-relationships cz-manager-services-table">
            <thead><tr>
              <th>Service</th><th>Service Category</th><th>Category Group</th>
              <th>Inclusions</th><th>FAQs</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>{visibleServices.map((summary) => {
              const assignment = packageServiceCategoryGroup({ sources }, summary.id);
              const connected = assignment !== undefined
                || (sources.length === 0 && hostServiceId > 0 && summary.id === hostServiceId);
              const currentGroupId = assignment ?? null;
              const staleAssignment = currentGroupId !== null
                && !assignableGroups.some((group) => group.group_id === currentGroupId);
              return (
                <tr key={summary.id}>
                  <td class="cz-sp-tier-table__name">{summary.title}</td>
                  <td class="cz-sp-tier-table__muted">
                    {summary.categories.length > 0 ? summary.categories.map((category) => category.name).join(', ') : '—'}
                  </td>
                  <td>
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
                  </td>
                  <td>{summary.inclusion_count ?? 0}</td>
                  <td>{summary.faq_count ?? 0}</td>
                  <td>
                    {serviceStatusPill(summary)}
                    <small class="cz-sp-tier-table__muted"> {connected ? 'Connected' : 'Not connected'}</small>
                  </td>
                  <td>
                    <div class="cz-manager-group-actions">
                      <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                        onClick={() => onOpenService(summary, false)}>View</button>
                      <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm"
                        onClick={() => onOpenService(summary, true)}>Edit</button>
                    </div>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>}
        </>
      )}
    </section>
  );
}
