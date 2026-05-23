import { useState } from 'preact/hooks';
import { useCostBuilder } from '@/hooks/useCostBuilder';
import { decodeHtml, formatPrice, formatCycleLabel } from '@/utils/format';
import { getRuntimeConfig } from '@/runtime/config';
import type { ServiceItem, TierId, Tier, CostBuilderResponse } from '@/api/types/cost-builder';
import type { QuoteItem } from '@/components/cost-builder/types';

const INCLUSION_PREVIEW_COUNT = 3;

// ── Service preview (right panel — preview mode) ──────────────────────────────

interface ServicePreviewProps {
  service: ServiceItem;
  tiers: Tier[];
  onAdd: (service: ServiceItem) => void;
  onCancel: () => void;
}

function ServicePreview({ service, tiers, onAdd, onCancel }: ServicePreviewProps) {
  const tierId: TierId = service.meta.popular_tier ?? 'standard';
  const tier = tiers.find((t) => t.id === tierId);
  const tierData = service.pricing.tiers[tierId];
  const inclusions = tierData?.inclusions ?? [];
  const previewInclusions = inclusions.slice(0, INCLUSION_PREVIEW_COUNT);
  const remainingCount = inclusions.length - previewInclusions.length;
  const suffix = formatCycleLabel(service.meta.billing_cycle);

  return (
    <div class="cz-home-configurator__preview">
      <div class="cz-home-configurator__preview-header">
        {service.categories[0] && (
          <span class="cz-home-configurator__preview-eyebrow">
            {decodeHtml(service.categories[0].name)}
          </span>
        )}
        <p class="cz-home-configurator__preview-title">{decodeHtml(service.title)}</p>
      </div>
      <div class="cz-home-configurator__preview-tier">
        <span class="cz-home-configurator__preview-tier-badge">{tier?.title ?? tierId}</span>
        <span class="cz-home-configurator__preview-price">
          {formatPrice(tierData?.price ?? null)}
          {tierData?.price !== null && tierData?.price !== undefined && suffix && (
            <span class="cz-home-configurator__preview-cycle">{' '}{suffix}</span>
          )}
        </span>
      </div>
      {previewInclusions.length > 0 && (
        <ul class="cz-home-configurator__preview-includes">
          {previewInclusions.map((inc) => (
            <li key={inc.id}>{inc.label}</li>
          ))}
          {remainingCount > 0 && (
            <li class="cz-home-configurator__preview-more">+{remainingCount} more included</li>
          )}
        </ul>
      )}
      <div class="cz-home-configurator__preview-actions">
        <button type="button" class="cz-btn cz-btn-primary" onClick={() => onAdd(service)}>
          Add to Quote
        </button>
        <button type="button" class="cz-home-configurator__cancel-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Dashboard (selector + summary panels) ─────────────────────────────────────

interface DashboardProps {
  data: CostBuilderResponse;
  costBuilderUrl: string;
}

function ConfiguratorDashboard({ data, costBuilderUrl }: DashboardProps) {
  const [activeCategorySlug, setActiveCategorySlug] = useState<string | null>(null);
  const [previewServiceId, setPreviewServiceId] = useState<number | null>(null);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);

  const categoryGroup = activeCategorySlug
    ? data.services_by_category.find((g) => g.category_slug === activeCategorySlug)
    : null;
  const services = categoryGroup?.services ?? [];
  const previewService =
    previewServiceId !== null ? services.find((s) => s.id === previewServiceId) ?? null : null;

  const pricedItems = quoteItems.filter((q) => q.price !== null);
  const unpricedCount = quoteItems.length - pricedItems.length;
  const total = pricedItems.reduce((sum, item) => sum + (item.price as number), 0);
  const cycles = [...new Set(pricedItems.map((item) => item.billingCycle.toLowerCase()))];
  const cycleSuffix = cycles.length === 1 ? formatCycleLabel(cycles[0]) : '';

  const handleCategorySelect = (slug: string) => {
    setActiveCategorySlug(slug);
    setPreviewServiceId(null);
  };

  const handleBack = () => {
    setActiveCategorySlug(null);
    setPreviewServiceId(null);
  };

  const handleServiceSelect = (service: ServiceItem) => {
    if (!service.availability.is_available) return;
    setPreviewServiceId(service.id);
  };

  const handleAddToQuote = (service: ServiceItem) => {
    const tierId: TierId = service.meta.popular_tier ?? 'standard';
    const tier = data.tiers.find((t) => t.id === tierId);
    const tierData = service.pricing.tiers[tierId];
    const item: QuoteItem = {
      serviceId: service.id,
      serviceTitle: decodeHtml(service.title),
      tierId,
      tierTitle: tier?.title ?? tierId,
      price: tierData?.price ?? null,
      billingCycle: service.meta.billing_cycle,
      categoryName: decodeHtml(service.categories[0]?.name ?? ''),
      features: tierData?.inclusions?.length
        ? tierData.inclusions.map((inc) => inc.label)
        : (tierData?.features ?? []),
    };
    setQuoteItems((prev) => [...prev.filter((q) => q.serviceId !== service.id), item]);
    setPreviewServiceId(null);
    setActiveCategorySlug(null);
  };

  const handleRemove = (serviceId: number) => {
    setQuoteItems((prev) => prev.filter((q) => q.serviceId !== serviceId));
  };

  return (
    <div class="cz-home-configurator__dashboard">

      {/* ── Selector panel ───────────────────────────────────────── */}
      <div class="cz-home-configurator__selector">
        {activeCategorySlug === null ? (
          <>
            <p class="cz-home-configurator__panel-label">Select a category</p>
            <div class="cz-home-configurator__cat-grid">
              {data.categories.map((cat) => (
                <button
                  key={cat.slug}
                  type="button"
                  class="cz-home-configurator__cat-btn"
                  onClick={() => handleCategorySelect(cat.slug)}
                >
                  {decodeHtml(cat.name)}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              class="cz-home-configurator__back-btn"
              onClick={handleBack}
            >
              ← Back
            </button>
            <p class="cz-home-configurator__panel-label">
              {decodeHtml(categoryGroup?.category_name ?? '')}
            </p>
            <div class="cz-home-configurator__service-list">
              {services.map((svc) => {
                const isAvailable = svc.availability.is_available;
                const isSelected = svc.id === previewServiceId;
                const isInQuote = quoteItems.some((q) => q.serviceId === svc.id);
                return (
                  <button
                    key={svc.id}
                    type="button"
                    class={[
                      'cz-home-configurator__service',
                      isSelected && 'is-active',
                      !isAvailable && 'is-unavailable',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    disabled={!isAvailable}
                    onClick={() => handleServiceSelect(svc)}
                  >
                    <span class="cz-home-configurator__service-name">
                      {decodeHtml(svc.title)}
                    </span>
                    {isInQuote && isAvailable && (
                      <span class="cz-home-configurator__service-tag cz-home-configurator__service-tag--added">
                        Added ✓
                      </span>
                    )}
                    {!isAvailable && (
                      <span class="cz-home-configurator__service-tag cz-home-configurator__service-tag--soon">
                        Coming soon
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Summary panel ────────────────────────────────────────── */}
      <aside class="cz-home-configurator__summary">
        {previewService ? (
          <ServicePreview
            service={previewService}
            tiers={data.tiers}
            onAdd={handleAddToQuote}
            onCancel={() => setPreviewServiceId(null)}
          />
        ) : quoteItems.length > 0 ? (
          <>
            <p class="cz-home-configurator__panel-label">
              Your Quote{' '}
              <span class="cz-home-configurator__quote-count">{quoteItems.length}</span>
            </p>
            <ul class="cz-home-configurator__quote-list">
              {quoteItems.map((item) => (
                <li key={item.serviceId} class="cz-home-configurator__quote-item">
                  <div class="cz-home-configurator__quote-item-info">
                    <span class="cz-home-configurator__quote-item-title">
                      {item.serviceTitle}
                    </span>
                    <span class="cz-home-configurator__quote-item-tier">{item.tierTitle}</span>
                  </div>
                  <div class="cz-home-configurator__quote-item-right">
                    <span class="cz-home-configurator__quote-item-price">
                      {item.price !== null ? formatPrice(item.price) : 'Custom'}
                    </span>
                    <button
                      type="button"
                      class="cz-home-configurator__quote-remove"
                      onClick={() => handleRemove(item.serviceId)}
                      aria-label={`Remove ${item.serviceTitle}`}
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div class="cz-home-configurator__quote-total">
              {pricedItems.length > 0 ? (
                <span>
                  {formatPrice(total)}
                  {cycleSuffix && <span class="cz-home-configurator__quote-cycle">{' '}{cycleSuffix}</span>}
                  {unpricedCount > 0 && ' + custom'}
                </span>
              ) : (
                <span>Custom pricing</span>
              )}
            </div>
            <a href={costBuilderUrl} class="cz-btn cz-btn-primary cz-home-configurator__quote-cta">
              Open Full Cost Builder →
            </a>
          </>
        ) : (
          <p class="cz-home-configurator__empty-msg">
            Select a service to start building your quote.
          </p>
        )}
      </aside>

    </div>
  );
}

// ── Root component ─────────────────────────────────────────────────────────────

export function HomeConfigurator() {
  const { data, loading } = useCostBuilder();
  const config = getRuntimeConfig();
  const costBuilderUrl = config?.costBuilderUrl ?? '/pricing/';

  return (
    <section class="cz-home-configurator">
      <div class="cz-container">
        <div class="cz-home-configurator__inner">

          <div class="cz-home-configurator__content">
            <span class="cz-home-configurator__eyebrow">Cost Builder</span>
            <h2 class="cz-home-configurator__title">
              Build your IT solution before the first call.
            </h2>
            <p class="cz-home-configurator__copy">
              Choose a service category, preview the recommended tier, and start a quote
              from the same live service data used by the full pricing page.
            </p>
            <a href={costBuilderUrl} class="cz-btn cz-btn-secondary cz-home-configurator__cta">
              Open Full Cost Builder
            </a>
          </div>

          {!loading && data ? (
            <ConfiguratorDashboard data={data} costBuilderUrl={costBuilderUrl} />
          ) : (
            <div class="cz-home-configurator__dashboard cz-home-configurator__dashboard--skeleton">
              <div class="cz-home-configurator__selector" />
              <aside class="cz-home-configurator__summary" />
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
