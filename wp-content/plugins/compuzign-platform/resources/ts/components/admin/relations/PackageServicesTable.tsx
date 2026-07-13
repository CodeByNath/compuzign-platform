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

export function PackageServicesTable({ sources, categoryGroups, hostServiceId, onAssign, onOpenService }: Props) {
  const [services, setServices] = useState<StationSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  return (
    <section class="cz-manager-section" aria-labelledby="manager-package-services">
      <h4 id="manager-package-services">Services</h4>
      <p class="cz-manager-section__description">
        All catalogue Services and their Package Category Group assignment. Selecting a group connects
        the Service to this Package commercially; the Service and its Service Categories stay owned by
        the Service Catalogue.
      </p>
      {services === null && !loadError && <p class="cz-sp-tier-table__muted">Loading Services…</p>}
      {loadError && <div class="cz-admin-error-msg" role="alert">{loadError}</div>}
      {services !== null && services.length === 0 && (
        <div class="cz-manager-empty"><strong>No Services in the catalogue yet.</strong></div>
      )}
      {services !== null && services.length > 0 && (
        <div class="cz-sp-tier-table-wrap">
          <table class="cz-sp-tier-table cz-manager-relationships">
            <thead><tr>
              <th>Service</th><th>Service Category</th><th>Package Category Group</th>
              <th>Inclusions</th><th>FAQs</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>{services.map((summary) => {
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
                    <select class="cz-tf-select" aria-label={`Package Category Group for ${summary.title}`}
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
        </div>
      )}
    </section>
  );
}
