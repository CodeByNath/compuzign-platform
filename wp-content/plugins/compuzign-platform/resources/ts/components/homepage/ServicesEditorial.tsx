import { useMemo } from 'preact/hooks';
import { useCostBuilder } from '@/hooks/useCostBuilder';
import { getRuntimeConfig } from '@/runtime/config';
import { decodeHtml } from '@/utils/format';
import type { ServiceItem } from '@/api/types/cost-builder';

type RowItem =
  | { kind: 'category'; name: string; slug: string; description: string }
  | { kind: 'service'; service: ServiceItem; categorySlug: string };

export function ServicesEditorial() {
  const config         = getRuntimeConfig();
  const costBuilderUrl = config?.costBuilderUrl ?? '/pricing/';
  // Strip trailing slash so we can safely append query params.
  const pricingBase    = costBuilderUrl.replace(/\/$/, '');

  const { data, loading } = useCostBuilder();

  // Categories fill first; remaining slots filled with shuffled individual services.
  const rows = useMemo<RowItem[] | null>(() => {
    if (!data) return null;
    const groups = data.services_by_category;
    const MAX = 7;

    const catRows: RowItem[] = groups.slice(0, MAX).map((group) => {
      const firstSvc =
        group.services.find((s) => s.availability.is_available) ?? group.services[0];
      const description = firstSvc
        ? decodeHtml(firstSvc.meta.short_description || firstSvc.excerpt)
        : '';
      return { kind: 'category', name: group.category_name, slug: group.category_slug, description };
    });

    if (catRows.length >= MAX) return catRows;

    // Pool: all available services across every category, shuffled.
    const pool: RowItem[] = [];
    for (const group of groups) {
      for (const svc of group.services) {
        if (svc.availability.is_available) {
          pool.push({ kind: 'service', service: svc, categorySlug: group.category_slug });
        }
      }
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return [...catRows, ...pool.slice(0, MAX - catRows.length)];
  }, [data]);

  return (
    <section class="cz-home-svc" id="services">
      <div class="cz-container">
        <div class="cz-home-svc__header">
          <div class="cz-home-svc__header-left">
            <span class="cz-eyebrow">Our Services</span>
            <h2 class="cz-heading-xl cz-home-svc__heading">
              Everything your business needs.<br />One partner.
            </h2>
          </div>
          <p class="cz-home-svc__intro">
            From infrastructure and help desk support to cybersecurity,
            cloud migration, disaster recovery and fintech automation,
            CompuZign brings critical IT functions together under one
            accountable team.
          </p>
        </div>

        <div class="cz-home-svc__list">
          {loading || !rows ? (
            [1, 2, 3, 4, 5, 6, 7].map((n) => (
              <div key={n} class="cz-home-svc__row cz-home-svc__row--skel" aria-hidden="true" />
            ))
          ) : (
            rows.map((row, idx) => {
              const href =
                row.kind === 'category'
                  ? `${pricingBase}?category=${row.slug}`
                  : `${pricingBase}?category=${row.categorySlug}&service=${row.service.slug}`;

              const name =
                row.kind === 'category'
                  ? decodeHtml(row.name)
                  : decodeHtml(row.service.title);

              const desc =
                row.kind === 'category'
                  ? row.description
                  : decodeHtml(row.service.meta.short_description || row.service.excerpt);

              const key =
                row.kind === 'category' ? `cat-${row.slug}` : `svc-${row.service.id}`;

              return (
                <a key={key} class="cz-home-svc__row" href={href}>
                  <div class="cz-home-svc__index">{String(idx + 1).padStart(2, '0')}</div>
                  <div class="cz-home-svc__name">{name}</div>
                  <div class="cz-home-svc__desc">{desc}</div>
                  <div class="cz-home-svc__arrow" aria-hidden="true">&rarr;</div>
                </a>
              );
            })
          )}

          <a
            class="cz-home-svc__row cz-home-svc__row--browse"
            href={costBuilderUrl}
          >
            <div class="cz-home-svc__index">
              {rows ? String(rows.length + 1).padStart(2, '0') : '08'}
            </div>
            <div class="cz-home-svc__name">Browse All Services</div>
            <div class="cz-home-svc__desc">
              Explore the full service catalogue and build a transparent estimate in the Cost Builder.
            </div>
            <div class="cz-home-svc__arrow" aria-hidden="true">&rarr;</div>
          </a>
        </div>
      </div>
    </section>
  );
}
