import type { PackageCategoryGroupItem, PackageSourceRelationship } from '@/api/types/admin';

// Rate Sheet source filtering (Package Manager, Settings sub-tab).
//
// Filters the catalogue rows by their provenance — Package Category Group
// (via the supplying Service's source assignment), Service Category, Service,
// Inclusion Group (Rate Sheet group), availability, and label search — while
// every row keeps its real Service / Category / Inclusion Group identity.
// Pure projection filtering: nothing here mutates the Rate Sheet.

export interface RateSheetFilterState {
  categoryGroup: string;  // 'all' | 'unassigned' | group_id
  serviceCategory: string; // 'all' | category name
  service: string;         // 'all' | service id (string)
  inclusionGroup: string;  // 'all' | 'ungrouped' | rate-sheet group id
  status: string;          // 'all' | 'available' | 'unavailable'
  search: string;
}

export const RATE_SHEET_FILTER_DEFAULTS: RateSheetFilterState = {
  categoryGroup: 'all', serviceCategory: 'all', service: 'all',
  inclusionGroup: 'all', status: 'all', search: '',
};

export interface RateSheetFilterRow {
  optionLabel: string;
  groupId: string | null;
  sourceAvailable: boolean;
  serviceId?: number | null;
  serviceTitle?: string | null;
  serviceCategories?: readonly string[];
}

function assignmentByServiceId(sources: readonly PackageSourceRelationship[]): Map<number, string | null> {
  const map = new Map<number, string | null>();
  for (const source of sources) {
    if (source.provider_key === 'service' && source.entity_type === 'service') {
      map.set(Number(source.entity_id), source.category_group_id ?? null);
    }
  }
  return map;
}

export function filterRateSheetItems<Row extends RateSheetFilterRow>(
  items: readonly Row[],
  sources: readonly PackageSourceRelationship[],
  filters: RateSheetFilterState,
): Row[] {
  const assignments = assignmentByServiceId(sources);
  const search = filters.search.trim().toLowerCase();
  return items.filter((item) => {
    if (filters.categoryGroup !== 'all') {
      const assigned = item.serviceId != null ? assignments.get(item.serviceId) ?? null : null;
      if (filters.categoryGroup === 'unassigned' ? assigned !== null : assigned !== filters.categoryGroup) return false;
    }
    if (filters.serviceCategory !== 'all'
      && !(item.serviceCategories ?? []).includes(filters.serviceCategory)) return false;
    if (filters.service !== 'all' && String(item.serviceId ?? '') !== filters.service) return false;
    if (filters.inclusionGroup !== 'all') {
      if (filters.inclusionGroup === 'ungrouped' ? item.groupId !== null : item.groupId !== filters.inclusionGroup) return false;
    }
    if (filters.status === 'available' && !item.sourceAvailable) return false;
    if (filters.status === 'unavailable' && item.sourceAvailable) return false;
    if (search !== '' && !item.optionLabel.toLowerCase().includes(search)) return false;
    return true;
  });
}

export function PackageRateSheetFilters({ items, sources, categoryGroups, rateGroups, value, onChange }: {
  items: readonly RateSheetFilterRow[];
  sources: readonly PackageSourceRelationship[];
  categoryGroups: readonly PackageCategoryGroupItem[];
  rateGroups: readonly { id: string; label: string }[];
  value: RateSheetFilterState;
  onChange: (next: RateSheetFilterState) => void;
}) {
  const services = new Map<number, string>();
  const categories = new Set<string>();
  for (const item of items) {
    if (item.serviceId != null) services.set(item.serviceId, item.serviceTitle ?? `Service ${item.serviceId}`);
    for (const category of item.serviceCategories ?? []) categories.add(category);
  }

  const select = (
    key: keyof RateSheetFilterState,
    label: string,
    options: readonly { id: string; label: string }[],
  ) => (
    <label class="cz-tf-field"><span>{label}</span>
      <select class="cz-tf-select" aria-label={`Filter by ${label}`} value={value[key]}
        onChange={(event) => onChange({ ...value, [key]: event.currentTarget.value })}>
        <option value="all">All</option>
        {options.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
      </select>
    </label>
  );

  return (
    <div class="cz-manager-filters cz-manager-rate-sheet__filters" role="group" aria-label="Rate Sheet filters">
      {select('categoryGroup', 'Package Category Group', [
        { id: 'unassigned', label: 'Unassigned' },
        ...categoryGroups.map((group) => ({ id: group.group_id, label: group.label })),
      ])}
      {select('serviceCategory', 'Service Category', [...categories].sort().map((name) => ({ id: name, label: name })))}
      {select('service', 'Service', [...services.entries()]
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([id, title]) => ({ id: String(id), label: title })))}
      {select('inclusionGroup', 'Inclusion Group', [
        { id: 'ungrouped', label: 'Ungrouped' },
        ...rateGroups.map((group) => ({ id: group.id, label: group.label })),
      ])}
      {select('status', 'Status', [
        { id: 'available', label: 'Available' },
        { id: 'unavailable', label: 'Unavailable' },
      ])}
      <label class="cz-tf-field"><span>Search</span>
        <input class="cz-tf-input" type="search" placeholder="Search supplied content…" value={value.search}
          onInput={(event) => onChange({ ...value, search: event.currentTarget.value })} />
      </label>
    </div>
  );
}
