import { useId, useMemo, useState } from 'preact/hooks';
import type { ComponentType } from 'preact';
import type { TemplateKitProps } from '@/station-manager/registry/templateKits';
import { PILL_META } from '@/drawer-kit/schema/presentation';
import { StationStatusPill } from '@/admin-station/presentation/StationStatusPill';
import {
  ArchiveBoxIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  SearchIcon,
  ServicesIcon,
  ViewIcon,
} from '@/admin-station/shell/icons';
import {
  packageFamilyOptions,
  serviceMatchesCategory,
  serviceMatchesPackageFamily,
} from './model';
import type { ServiceCatalogueItem } from './types';

type StatusFilter = 'all' | 'active' | 'pending' | 'disabled';
type SortOrder = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

interface Option {
  value: string;
  label: string;
}

interface StatCardProps {
  label: string;
  value: number;
  tone:  'accent' | 'active' | 'pending' | 'inactive';
  icon:  ComponentType<{ class?: string }>;
}

const PAGE_SIZES = [10, 25, 50];

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all',      label: 'All statuses' },
  { value: 'active',   label: PILL_META.active.label },
  { value: 'pending',  label: PILL_META['pending-full'].label },
  { value: 'disabled', label: PILL_META.disabled.label },
];

function StatCard({ label, value, tone, icon: Icon }: StatCardProps) {
  return (
    <article class="cz-service-stat" role="listitem">
      <span class="cz-service-stat__copy">
        <strong class="cz-service-stat__value">{value}</strong>
        <span class="cz-service-stat__label">{label}</span>
      </span>
      <span class={`cz-service-stat__icon cz-service-stat__icon--${tone}`} aria-hidden="true">
        <Icon />
      </span>
    </article>
  );
}

function isPending(item: ServiceCatalogueItem): boolean {
  return item.presentationStatus === 'pending-dim' || item.presentationStatus === 'pending-full';
}

function sortItems(items: ServiceCatalogueItem[], order: SortOrder): ServiceCatalogueItem[] {
  return [...items].sort((a, b) => {
    if (order === 'name-asc') return a.name.localeCompare(b.name);
    if (order === 'name-desc') return b.name.localeCompare(a.name);

    const aParsed = a.createdAt ? Date.parse(a.createdAt) : Number.NaN;
    const bParsed = b.createdAt ? Date.parse(b.createdAt) : Number.NaN;
    const aCreated = Number.isFinite(aParsed) ? aParsed : a.id;
    const bCreated = Number.isFinite(bParsed) ? bParsed : b.id;
    return order === 'newest' ? bCreated - aCreated : aCreated - bCreated;
  });
}

function pageNumbers(current: number, total: number): number[] {
  const count = Math.min(total, 5);
  const start = Math.max(1, Math.min(current - 2, total - count + 1));
  return Array.from({ length: count }, (_, index) => start + index);
}

function categoryOptions(items: ServiceCatalogueItem[]): Option[] {
  const categories = new Map<string, string>();
  items.forEach((item) => item.categories.forEach((category) => categories.set(category.slug, category.name)));
  return [...categories].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
}

export function ServiceCatalogue({ items, loading, error, onIntent }: TemplateKitProps) {
  const services = items as ServiceCatalogueItem[];
  const current = useMemo(() => services.filter((item) => item.scope === 'current'), [services]);
  const titleId = useId();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [category, setCategory] = useState('all');
  const [family, setFamily] = useState('all');
  const [sort, setSort] = useState<SortOrder>('newest');
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [requestedPage, setRequestedPage] = useState(1);

  const categories = useMemo(() => categoryOptions(current), [current]);
  const families = useMemo(() => packageFamilyOptions(current), [current]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const matches = current.filter((item) => {
      const matchesQuery = !needle || [
        item.name,
        item.description,
        item.slug,
        ...item.categories.map((entry) => entry.name),
        ...item.packageFamilies.map((entry) => entry.name),
      ].some((value) => value.toLocaleLowerCase().includes(needle));
      const matchesStatus = status === 'all'
        || (status === 'active' && item.presentationStatus === 'active')
        || (status === 'disabled' && item.presentationStatus === 'disabled')
        || (status === 'pending' && isPending(item));
      const matchesCategory = serviceMatchesCategory(item, category);
      const matchesFamily = serviceMatchesPackageFamily(item, family);
      return matchesQuery && matchesStatus && matchesCategory && matchesFamily;
    });
    return sortItems(matches, sort);
  }, [current, query, status, category, family, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const firstResult = filtered.length === 0 ? 0 : ((page - 1) * pageSize) + 1;
  const lastResult = Math.min(page * pageSize, filtered.length);
  const hasFilters = Boolean(query || status !== 'all' || category !== 'all' || family !== 'all');

  const resetFilters = () => {
    setQuery('');
    setStatus('all');
    setCategory('all');
    setFamily('all');
    setRequestedPage(1);
  };

  if (loading) return <p class="cz-station-empty" aria-busy="true">Loading Service Catalogue…</p>;
  if (error) return <p class="cz-station-empty" role="alert">{error}</p>;

  return (
    <section class="cz-service-catalogue" aria-labelledby={titleId}>
      <h2 id={titleId} class="cz-station-visually-hidden">Service Catalogue</h2>

      <div class="cz-service-stats" role="list" aria-label="Service overview">
        <StatCard
          label="Total Services"
          value={services.length}
          tone="accent"
          icon={ServicesIcon}
        />
        <StatCard
          label="Active Services"
          value={current.filter((item) => item.platformStatus === 'active').length}
          tone="active"
          icon={CheckCircleIcon}
        />
        <StatCard
          label="Draft Services"
          value={current.filter(isPending).length}
          tone="pending"
          icon={PencilSquareIcon}
        />
        <StatCard
          label="Archived Services"
          value={services.filter((item) => item.scope === 'archived').length}
          tone="inactive"
          icon={ArchiveBoxIcon}
        />
      </div>

      <div class="cz-service-catalogue__toolbar" role="search" aria-label="Filter services">
        <label class="cz-tf-control cz-service-catalogue__search">
          <span class="cz-station-visually-hidden">Search services</span>
          <SearchIcon />
          <input
            type="search"
            class="cz-tf-control__inner"
            value={query}
            placeholder="Search services…"
            onInput={(event) => { setQuery(event.currentTarget.value); setRequestedPage(1); }}
          />
        </label>

        <select class="cz-tf-control cz-tf-select" aria-label="Filter by status" value={status}
          onChange={(event) => { setStatus(event.currentTarget.value as StatusFilter); setRequestedPage(1); }}>
          {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>

        <select class="cz-tf-control cz-tf-select" aria-label="Filter by category" value={category}
          onChange={(event) => { setCategory(event.currentTarget.value); setRequestedPage(1); }}>
          <option value="all">All categories</option>
          {categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>

        <select class="cz-tf-control cz-tf-select" aria-label="Filter by Family Group" value={family}
          onChange={(event) => { setFamily(event.currentTarget.value); setRequestedPage(1); }}>
          <option value="all">All families</option>
          {families.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>

        <select class="cz-tf-control cz-tf-select cz-service-catalogue__sort" aria-label="Sort services" value={sort}
          onChange={(event) => { setSort(event.currentTarget.value as SortOrder); setRequestedPage(1); }}>
          <option value="newest">Sort by: Newest</option>
          <option value="oldest">Sort by: Oldest</option>
          <option value="name-asc">Sort by: Name A–Z</option>
          <option value="name-desc">Sort by: Name Z–A</option>
        </select>

        <button type="button" class="cz-service-catalogue__reset" onClick={resetFilters} disabled={!hasFilters}>
          Reset
        </button>
      </div>

      <div class="cz-service-catalogue__table-wrap">
        <table class="cz-service-catalogue__table">
          <caption class="cz-station-visually-hidden">Current Services</caption>
          <thead>
            <tr>
              <th>Service</th>
              <th>Category</th>
              <th>Family Group</th>
              <th>Inclusions</th>
              <th>FAQs</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td class="cz-service-catalogue__empty" colSpan={7}>No services match these filters.</td></tr>
            ) : visible.map((service) => (
              <tr key={service.id}>
                <td data-label="Service">
                  <span class="cz-service-row__identity">
                    <span class="cz-service-row__icon" aria-hidden="true"><ServicesIcon /></span>
                    <span class="cz-service-row__copy">
                      <strong>{service.name}</strong>
                      <span>{service.description || 'No service summary yet.'}</span>
                    </span>
                  </span>
                </td>
                <td data-label="Category">{service.categories.map((entry) => entry.name).join(', ') || 'Uncategorised'}</td>
                <td data-label="Family Group">
                  {service.packageFamilies.length > 0 ? (
                    <span class="cz-service-row__families">
                      {service.packageFamilies.map((packageFamily) => (
                        <span key={packageFamily.id} class="cz-service-row__family">{packageFamily.name}</span>
                      ))}
                    </span>
                  ) : 'Unassigned'}
                </td>
                <td data-label="Inclusions" class="cz-service-row__count">{service.inclusionCount}</td>
                <td data-label="FAQs" class="cz-service-row__count">{service.faqCount}</td>
                <td data-label="Status">
                  {service.presentationStatus && <StationStatusPill status={service.presentationStatus} />}
                </td>
                <td data-label="Action">
                  <button type="button" class="cz-service-row__action" onClick={() => onIntent(service.id, 'view')}>
                    <ViewIcon /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer class="cz-service-catalogue__pagination">
        <span>Showing {firstResult}–{lastResult} of {filtered.length} services</span>
        <span class="cz-service-catalogue__page-controls">
          <select class="cz-tf-control cz-tf-select" aria-label="Services per page" value={pageSize}
            onChange={(event) => { setPageSize(Number(event.currentTarget.value)); setRequestedPage(1); }}>
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size} per page</option>)}
          </select>
          <button type="button" aria-label="Previous page" disabled={page === 1}
            onClick={() => setRequestedPage(Math.max(1, page - 1))}>‹</button>
          {pageNumbers(page, totalPages).map((pageNumber) => (
            <button key={pageNumber} type="button" class={pageNumber === page ? 'is-active' : undefined}
              aria-current={pageNumber === page ? 'page' : undefined}
              onClick={() => setRequestedPage(pageNumber)}>{pageNumber}</button>
          ))}
          <button type="button" aria-label="Next page" disabled={page === totalPages}
            onClick={() => setRequestedPage(Math.min(totalPages, page + 1))}>›</button>
        </span>
      </footer>
    </section>
  );
}
