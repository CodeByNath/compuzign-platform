import { useState } from 'preact/hooks';
import type { PackageFamilyItem, PackageSourceRelationship } from '@/api/types/admin';
import type { ServiceSummary } from '@/admin-station/stations/service';
import { PRESENTATION_PILL } from '@/drawer-kit/schema/presentation';
import { packageServiceFamily } from './providers/package';

// Package Manager Services collection (Services sub-tab, Details section).
//
// Lists the host-delivered catalogue without issuing a second request. Service
// identity/category/status stay read-first beside health aggregated from the
// shared relationship projection. Package-owned family assignment is displayed
// as secondary context and edited only through the focused manager drawer.

interface Props {
  services: readonly ServiceSummary[];
  sources: PackageSourceRelationship[];
  packageFamilies: PackageFamilyItem[];
  hostServiceId: number;
  onOpenService: (summary: ServiceSummary, edit: boolean) => void;
  onManageAssignment: (summary: ServiceSummary, familyId: string | null) => void;
  connectionSummaryByServiceId: ReadonlyMap<number, { count: number; attention: number }>;
  // Controlled by the family scope cards; the collection does not fork that
  // filtering mechanism or expose a second assignment control.
  familyFilter?: string;
}

function serviceStatusPill(summary: ServiceSummary) {
  const pill = summary.platform_status === 'active'
    ? (summary.has_drafts ? { cls: PRESENTATION_PILL.active.cls, label: 'Active · changes pending' } : PRESENTATION_PILL.active)
    : summary.module_status.overview !== 'settled'
      ? PRESENTATION_PILL.pending
      : PRESENTATION_PILL.disabled;
  return <span class={`cz-module-status-pill ${pill.cls}`}>{pill.label}</span>;
}

function serviceStatusKey(summary: ServiceSummary): 'active' | 'pending' | 'disabled' {
  if (summary.platform_status === 'active') return 'active';
  return summary.module_status.overview !== 'settled' ? 'pending' : 'disabled';
}

export function PackageServicesTable({ services, sources, packageFamilies, hostServiceId, onOpenService, onManageAssignment, connectionSummaryByServiceId, familyFilter = 'all' }: Props) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Assignable buckets: live groups only. Binned groups keep their existing
  // assignments (rows still display them) but accept no new members.
  const assignableGroups = packageFamilies.filter((group) => (
    group.platform_status === 'active' || group.platform_status === 'disabled'
  ));
  const groupLabels = new Map(packageFamilies.map((group) => [group.group_id, group.label]));
  const categories = [...new Set(services.flatMap((service) => service.categories.map((category) => category.name)))]
    .sort((left, right) => left.localeCompare(right));
  const query = search.trim().toLocaleLowerCase();
  const visibleServices = services.filter((summary) => {
    const assignment = packageServiceFamily({ sources }, summary.id) ?? null;
    if (familyFilter !== 'all'
      && (familyFilter === 'unassigned' ? assignment !== null : assignment !== familyFilter)) return false;
    if (categoryFilter !== 'all' && !summary.categories.some((category) => category.name === categoryFilter)) return false;
    if (statusFilter !== 'all' && serviceStatusKey(summary) !== statusFilter) return false;
    if (query && ![summary.title, summary.slug, ...summary.categories.map((category) => category.name)].some((value) => value.toLocaleLowerCase().includes(query))) return false;
    return true;
  });

  return (
    <section class="cz-manager-section cz-manager-section--content-only" aria-label="Services">
      <div class="cz-manager-section__title"><div><h3>Your Services</h3><p>Service-owned catalogue content with Package-owned family assignment.</p></div></div>
      {services.length === 0 && (
        <div class="cz-manager-empty"><strong>No Services in the catalogue yet.</strong></div>
      )}
      {services.length > 0 && (
        <>
        <div class="cz-manager-services-toolbar" role="group" aria-label="Service filters">
          <label class="cz-manager-search"><span class="screen-reader-text">Search Services</span><input class="cz-tf-input" type="search" value={search} placeholder="Search Services…" onInput={(event) => setSearch(event.currentTarget.value)} /></label>
          <label class="cz-manager-compact-filter"><span>Category</span>
            <select class="cz-tf-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.currentTarget.value)}>
              <option value="all">All Categories</option>
              {categories.map((category) => <option value={category} key={category}>{category}</option>)}
            </select>
          </label>
          <label class="cz-manager-compact-filter"><span>Status</span>
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
            <span role="columnheader">Category</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Connection health</span>
            <span role="columnheader">Action</span>
          </div>
          <div class="cz-manager-collection__body" role="rowgroup">{visibleServices.map((summary) => {
              const assignment = packageServiceFamily({ sources }, summary.id);
              const connected = assignment !== undefined
                || (sources.length === 0 && hostServiceId > 0 && summary.id === hostServiceId);
              const currentGroupId = assignment ?? null;
              const staleAssignment = currentGroupId !== null
                && !assignableGroups.some((group) => group.group_id === currentGroupId);
              const familyLabel = currentGroupId === null ? 'Ungrouped' : groupLabels.get(currentGroupId) ?? currentGroupId;
              const connectionSummary = connectionSummaryByServiceId.get(summary.id);
              const connectionHealth = !connected ? 'Not connected' : !connectionSummary?.count ? 'No source items' : connectionSummary.attention > 0 ? 'Needs attention' : 'Healthy';
              return (
                <div class="cz-manager-collection__row" role="row" key={summary.id}>
                  <div class="cz-manager-collection__cell cz-manager-collection__identity" role="cell" data-label="Service">
                    <span class="cz-manager-service-identity"><span class="cz-manager-service-identity__icon" aria-hidden="true">{summary.title.trim().charAt(0).toUpperCase() || 'S'}</span><span><strong>{summary.title}</strong><small>{familyLabel}</small></span></span>
                  </div>
                  <div class="cz-manager-collection__cell" role="cell" data-label="Category">
                    <span class="cz-manager-category-list">{summary.categories.length > 0 ? summary.categories.map((category) => category.name).join(', ') : 'Uncategorised'}</span>
                  </div>
                  <div class="cz-manager-collection__cell cz-manager-collection__status" role="cell" data-label="Status">
                    {serviceStatusPill(summary)}
                    <small>{summary.has_drafts ? 'Draft changes pending' : summary.module_status.overview === 'settled' ? 'Overview settled' : 'Overview pending'}</small>
                  </div>
                  <div class="cz-manager-collection__cell cz-manager-collection__health" role="cell" data-label="Connection health">
                    <span class={`cz-manager-health${connectionHealth === 'Healthy' ? ' is-healthy' : connectionHealth === 'Needs attention' ? ' is-attention' : ''}`}><span aria-hidden="true" />{connectionHealth}</span>
                    <small>{connectionSummary?.count ?? 0} connection{connectionSummary?.count === 1 ? '' : 's'}</small>
                  </div>
                  <div class="cz-manager-collection__cell cz-manager-collection__action" role="cell" data-label="Action">
                    <div class="cz-manager-row-actions">
                      <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => onOpenService(summary, false)}>View</button>
                      <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => onOpenService(summary, true)}>Edit</button>
                      <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => onManageAssignment(summary, currentGroupId)}>{staleAssignment ? 'Reassign' : 'Family'}</button>
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
