import { useEffect, useMemo, useState } from 'preact/hooks';
import type { CustomerPolicyItem, PackageBuilderFamily, ServiceInclusion } from '@/api/types/cost-builder';
import { resolveComposablePreview } from '@/api/endpoints/package-builder';
import { formatPrice } from '@/utils/format';

// Phase 2B1 — the composable Tier occupant's own minimal customer
// composition surface: quantity-only Add/Remove browsing over Admin-
// authorized inclusions, with a live server-resolved running total. No
// Price Option control, no Leg/commitment/Edition editing, and nothing
// here ever persists into FamilyTierQuoteItem/the cart — this component
// owns its own candidate selection state and nothing else. See
// project-work/2026-09-02-composable-tier-customer-ux.md.
interface ComposableOfferBrowserProps {
  family: PackageBuilderFamily;
  // 'build_your_own' = direct entry with no normal Tier/Edition chosen yet;
  // 'upgrade_your_build' = rendered after a normal Tier/Edition selection.
  // Presentation only — both read the exact same composable_offer/policy.
  context: 'build_your_own' | 'upgrade_your_build';
}

interface BrowseRow {
  item_id: string;
  label: string;
  unitPrice: number | null;
  categories: string[];
  service: string | null;
  policy: CustomerPolicyItem;
}

interface CandidateEntry {
  selected: boolean;
  quantity?: number;
}

const PAGE_SIZE = 6;
type SortMode = 'featured' | 'name';

export function ComposableOfferBrowser({ family, context }: ComposableOfferBrowserProps) {
  const offer = family.pricing.composable_offer ?? null;
  const policy = offer?.customer_policy ?? null;

  // Join inclusions (label/price/categories/service — browse metadata) with
  // the customer_policy entry sharing the same item_id (authorization/
  // quantity bounds/featured). An inclusion with no matching policy entry
  // is not offered to the customer at all — the policy is the
  // authorization source of truth, never the inclusions list on its own.
  const rows = useMemo<BrowseRow[]>(() => {
    if (!offer || !policy) return [];
    const inclusionsById = new Map<string, ServiceInclusion>();
    for (const inclusion of offer.inclusions) inclusionsById.set(inclusion.id, inclusion);
    const out: BrowseRow[] = [];
    for (const item of policy.items) {
      const inclusion = inclusionsById.get(item.item_id);
      if (!inclusion) continue;
      out.push({
        item_id: item.item_id,
        label: inclusion.label,
        unitPrice: inclusion.unit_price ?? null,
        categories: inclusion.categories ?? [],
        service: inclusion.service ?? null,
        policy: item,
      });
    }
    return out;
  }, [offer, policy]);

  const rowIdsKey = rows.map((row) => row.item_id).join(',');

  // Candidate selection/quantity — held only here, never persisted. Reseeded
  // from each item's own policy defaults whenever the offer's item set
  // itself changes (Family switch, or the offer's own policy changing).
  const [selection, setSelection] = useState<Record<string, CandidateEntry>>({});
  const [category, setCategory] = useState('');
  const [service, setService] = useState('');
  const [sort, setSort] = useState<SortMode>('featured');
  const [page, setPage] = useState(0);

  useEffect(() => {
    const next: Record<string, CandidateEntry> = {};
    for (const row of rows) {
      next[row.item_id] = {
        selected: row.policy.mode === 'required' ? true : row.policy.default_selected,
        quantity: row.policy.quantity ? row.policy.quantity.default : undefined,
      };
    }
    setSelection(next);
    setCategory('');
    setService('');
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family.family_id, rowIdsKey]);

  const categories = useMemo(
    () => Array.from(new Set(rows.flatMap((row) => row.categories))).sort(),
    [rows],
  );
  const services = useMemo(
    () => Array.from(new Set(
      rows
        .filter((row) => category === '' || row.categories.includes(category))
        .flatMap((row) => (row.service ? [row.service] : [])),
    )).sort(),
    [rows, category],
  );

  // Required items are always included — never a browse/Add-Remove choice
  // of their own, matching the accepted contract ("no selector" for a
  // fixed/required inclusion).
  const filtered = useMemo(() => {
    let list = rows.filter((row) => row.policy.mode === 'optional');
    if (category !== '') list = list.filter((row) => row.categories.includes(category));
    if (service !== '') list = list.filter((row) => row.service === service);
    list = [...list].sort((a, b) => {
      if (sort === 'featured' && a.policy.featured !== b.policy.featured) {
        return a.policy.featured ? -1 : 1;
      }
      return a.label.localeCompare(b.label);
    });
    return list;
  }, [rows, category, service, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE);

  const [preview, setPreview] = useState<{ ok: boolean; total: number | null; message: string | null }>({
    ok: true,
    total: null,
    message: null,
  });
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (rows.length === 0) return;
    const choice: { item_id: string; selected?: boolean; quantity?: number }[] = [];
    for (const row of rows) {
      const entry = selection[row.item_id];
      if (row.policy.mode === 'required') {
        choice.push({ item_id: row.item_id });
        continue;
      }
      if (!entry?.selected) continue;
      const submitted: { item_id: string; selected?: boolean; quantity?: number } = {
        item_id: row.item_id,
        selected: true,
      };
      if (row.policy.quantity) {
        submitted.quantity = entry.quantity ?? row.policy.quantity.default;
      }
      choice.push(submitted);
    }

    let cancelled = false;
    setPreviewLoading(true);
    resolveComposablePreview(family.family_id, choice)
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setPreview({ ok: false, total: null, message: 'This combination is not available right now.' });
          return;
        }
        const total = (result.periods ?? [])
          .flatMap((period) => period.components)
          .reduce((sum, component) => sum + (component.price ?? 0), 0);
        setPreview({ ok: true, total, message: null });
      })
      .catch(() => {
        if (!cancelled) setPreview({ ok: false, total: null, message: 'Could not resolve pricing right now.' });
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => { cancelled = true; };
  }, [family.family_id, rows, selection]);

  if (!offer || !policy || rows.length === 0) return null;

  const heading = context === 'build_your_own' ? 'Build Your Own' : 'Upgrade your build';

  return (
    <section class="cz-package-builder__composable" aria-labelledby="cz-composable-heading">
      <h3 id="cz-composable-heading" class="cz-heading-sm">{heading}</h3>
      <p class="cz-package-builder__composable-subheading">Recommended Upgrades</p>

      <div class="cz-package-builder__composable-filters">
        <label class="cz-package-builder__composable-filter">
          Category
          <input
            list="cz-composable-categories"
            value={category}
            onInput={(event) => {
              setCategory((event.target as HTMLInputElement).value);
              setService('');
              setPage(0);
            }}
            placeholder="All Categories"
          />
          <datalist id="cz-composable-categories">
            {categories.map((option) => <option key={option} value={option} />)}
          </datalist>
        </label>
        <label class="cz-package-builder__composable-filter">
          Service
          <input
            list="cz-composable-services"
            value={service}
            onInput={(event) => {
              setService((event.target as HTMLInputElement).value);
              setPage(0);
            }}
            placeholder="All Services"
          />
          <datalist id="cz-composable-services">
            {services.map((option) => <option key={option} value={option} />)}
          </datalist>
        </label>
        <label class="cz-package-builder__composable-filter">
          Sort
          <select
            value={sort}
            onChange={(event) => setSort((event.target as HTMLSelectElement).value as SortMode)}
          >
            <option value="featured">Featured</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      <ul class="cz-package-builder__composable-grid">
        {pageRows.map((row) => {
          const current = selection[row.item_id];
          const isSelected = current?.selected ?? false;
          return (
            <li key={row.item_id} class="cz-package-builder__composable-card">
              <span class="cz-package-builder__composable-card-label">{row.label}</span>
              {row.unitPrice !== null && (
                <span class="cz-package-builder__composable-card-price">{formatPrice(row.unitPrice)}</span>
              )}
              {row.policy.quantity && isSelected && (
                <input
                  type="number"
                  class="cz-package-builder__composable-card-qty"
                  min={row.policy.quantity.min}
                  max={row.policy.quantity.max}
                  step={row.policy.quantity.step}
                  value={current?.quantity ?? row.policy.quantity.default}
                  aria-label={`${row.label} quantity`}
                  onInput={(event) => {
                    const raw = Number((event.target as HTMLInputElement).value);
                    setSelection((prev) => ({ ...prev, [row.item_id]: { selected: true, quantity: raw } }));
                  }}
                />
              )}
              <button
                type="button"
                class={`cz-btn ${isSelected ? 'cz-btn-secondary' : 'cz-btn-primary'}`}
                onClick={() => setSelection((prev) => ({
                  ...prev,
                  [row.item_id]: {
                    selected: !isSelected,
                    quantity: prev[row.item_id]?.quantity ?? row.policy.quantity?.default,
                  },
                }))}
              >
                {isSelected ? 'Remove' : 'Add'}
              </button>
            </li>
          );
        })}
      </ul>

      <div class="cz-package-builder__composable-pager">
        <button
          type="button"
          class="cz-package-builder__composable-page-btn"
          disabled={clampedPage === 0}
          onClick={() => setPage((current) => Math.max(0, current - 1))}
          aria-label="Previous"
        >‹</button>
        <span>{clampedPage + 1} / {pageCount}</span>
        <button
          type="button"
          class="cz-package-builder__composable-page-btn"
          disabled={clampedPage >= pageCount - 1}
          onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
          aria-label="Next"
        >›</button>
      </div>

      <div class="cz-package-builder__composable-preview" aria-live="polite">
        {previewLoading && <span>Updating…</span>}
        {!previewLoading && preview.ok && preview.total !== null && (
          <span>Extras: {formatPrice(preview.total)}</span>
        )}
        {!previewLoading && !preview.ok && preview.message && (
          <span class="cz-package-builder__composable-preview-error">{preview.message}</span>
        )}
      </div>
    </section>
  );
}
