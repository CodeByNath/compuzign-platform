import { useMemo } from 'preact/hooks';
import { useCostBuilder } from '@/hooks/useCostBuilder';
import { getRuntimeConfig } from '@/runtime/config';
import { decodeHtml } from '@/utils/format';
import type { ServiceItem } from '@/api/types/cost-builder';

export function ServicesEditorial() {
  const config         = getRuntimeConfig();
  const costBuilderUrl = config?.costBuilderUrl ?? '/services/';
  const { data, loading } = useCostBuilder();

  // First 4: first available service from first 4 category groups.
  // Next 3: random shuffle from remaining available services.
  const rows = useMemo<{ service: ServiceItem; categorySlug: string }[] | null>(() => {
    if (!data) return null;
    const groups = data.services_by_category;

    const first4: { service: ServiceItem; categorySlug: string }[] = [];
    for (let i = 0; i < Math.min(4, groups.length); i++) {
      const svc = groups[i].services.find((s) => s.availability.is_available)
               ?? groups[i].services[0];
      if (svc) first4.push({ service: svc, categorySlug: groups[i].category_slug });
    }

    const remaining: { service: ServiceItem; categorySlug: string }[] = [];
    for (let i = 4; i < groups.length; i++) {
      for (const svc of groups[i].services) {
        if (svc.availability.is_available) {
          remaining.push({ service: svc, categorySlug: groups[i].category_slug });
        }
      }
    }
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }

    return [...first4, ...remaining.slice(0, 3)];
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
            rows.map(({ service, categorySlug }, idx) => {
              const desc = service.meta.short_description
                ? decodeHtml(service.meta.short_description)
                : decodeHtml(service.excerpt);
              return (
                <a
                  key={service.id}
                  class="cz-home-svc__row"
                  href={costBuilderUrl}
                  data-service={service.slug}
                  onClick={(e) => {
                    e.preventDefault();
                    window.dispatchEvent(
                      new CustomEvent('cz:service-select', {
                        detail: { serviceId: service.id, categorySlug },
                      })
                    );
                    document
                      .querySelector<HTMLElement>('.cz-home-configurator')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  <div class="cz-home-svc__index">{String(idx + 1).padStart(2, '0')}</div>
                  <div class="cz-home-svc__name">{decodeHtml(service.title)}</div>
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
