import { useState, useEffect, useRef } from 'preact/hooks';
import { saveCart, loadCart, clearCart } from '@/utils/cartStorage';
import { useCostBuilder } from '@/hooks/useCostBuilder';
import { Spinner } from '@/components/ui/Spinner';
import { CategoryNav } from './CategoryNav';
import { SubcategoryNav } from './SubcategoryNav';
import { ServiceCard } from './ServiceCard';
import { QuoteSummary } from './QuoteSummary';
import { HeroArea } from './HeroArea';
import { RecommendedBundle } from './RecommendedBundle';
import { PromotionSection } from './PromotionSection';
import { decodeHtml } from '@/utils/format';
import { FaqAccordion } from './FaqAccordion';
import { ComparePlans } from './ComparePlans';
import { MobileQuoteBar } from './MobileQuoteBar';
import { RequestFlowModal } from '@/components/request-flow/RequestFlowModal';
import { replaceNormalQuoteItem, upsertAddonQuoteItem, removeAddonQuoteItem, removeServiceQuoteItems } from '@/utils/quote';
import type { QuoteItem } from './types';
import type { CostBuilderResponse, ServiceItem, TierId } from '@/api/types/cost-builder';

const QUOTE_SUMMARY_ID = 'cz-quote-summary';

export function canSelectServiceOffers(service: Pick<ServiceItem, 'availability'>): boolean {
  return service.availability.is_available;
}

// The one thing that differs between the Service Category and Package Family
// Cost Builder variants: which field groups Services, and what labels the
// group nav. Both are client-side derivations of the SAME response — Family
// mode adds no second pre-grouped backend collection, it groups the already-
// shared Service objects by their own already-resolved `family` reference.
interface CostBuilderGroup {
  id: string;
  label: string;
  services: ServiceItem[];
}

function buildCategoryGroups(data: CostBuilderResponse | null | undefined): CostBuilderGroup[] {
  if (!data) return [];
  return data.services_by_category.map((g) => ({
    id: g.category_slug,
    label: g.category_name,
    services: g.services,
  }));
}

function buildFamilyGroups(data: CostBuilderResponse | null | undefined): CostBuilderGroup[] {
  if (!data) return [];
  // Services can repeat across categories in services_by_category (a Service
  // may carry more than one Service Category); de-dupe by id before bucketing
  // by Family so a Family group never lists the same Service twice.
  const byId = new Map<number, ServiceItem>();
  for (const group of data.services_by_category) {
    for (const svc of group.services) byId.set(svc.id, svc);
  }
  const byFamily = new Map<string, ServiceItem[]>();
  for (const svc of byId.values()) {
    if (!svc.family) continue; // unassigned Services simply don't appear in Family mode
    const bucket = byFamily.get(svc.family.id) ?? [];
    bucket.push(svc);
    byFamily.set(svc.family.id, bucket);
  }
  return data.package_families
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((f) => ({ id: f.id, label: f.label, services: byFamily.get(f.id) ?? [] }))
    .filter((g) => g.services.length > 0); // empty groups excluded, same rule as Category
}

export interface CostBuilderAppProps {
  groupBy?: 'category' | 'family';
}

export function CostBuilderApp({ groupBy = 'category' }: CostBuilderAppProps = {}) {
  const { data, loading, error, refetch } = useCostBuilder();
  // DEBUG — remove after diagnosis
  if (data) {
    console.log('[CZ CostBuilderApp] raw API tiers:', data.tiers);
    const firstSvc = data.services_by_category?.[0]?.services?.[0];
    if (firstSvc) {
      console.log('[CZ CostBuilderApp] first service pricing.tiers.basic:', firstSvc.pricing?.tiers?.['basic']);
    }
  }

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeServiceId, setActiveServiceId] = useState<number | null>(null);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>(() => loadCart());
  const [isFlowOpen, setIsFlowOpen] = useState(false);
  const urlParamsApplied = useRef(false);

  const groups = groupBy === 'family' ? buildFamilyGroups(data) : buildCategoryGroups(data);
  const groupUrlParam = groupBy === 'family' ? 'family' : 'category';

  // On first data load, focus the group/service passed via URL query params.
  // Falls back gracefully: missing service → group only; missing group → default.
  useEffect(() => {
    if (!data || urlParamsApplied.current) return;
    urlParamsApplied.current = true;

    const params = new URLSearchParams(window.location.search);
    const groupSlug = params.get(groupUrlParam);
    const svcSlug = params.get('service');

    if (!groupSlug) return;

    const group = groups.find((g) => g.id === groupSlug);
    if (!group) return;

    setActiveGroupId(groupSlug);

    if (svcSlug) {
      const svc = group.services.find((s) => s.slug === svcSlug);
      if (svc) setActiveServiceId(svc.id);
    }
  }, [data]);

  useEffect(() => {
    if (quoteItems.length === 0) {
      clearCart();
    } else {
      saveCart(quoteItems);
    }
  }, [quoteItems]);

  // A normal Tier, a promotion, or the legacy bundle each replace only the
  // one existing non-add-on line for that Service; a Tier add-on upserts
  // independently by serviceId + tierId. See utils/quote.ts for the full
  // cart-identity rationale.
  const addToQuote = (item: QuoteItem) => {
    setQuoteItems((prev) => (item.isAddon ? upsertAddonQuoteItem(prev, item) : replaceNormalQuoteItem(prev, item)));
  };

  // Called with just a serviceId, this removes the whole Service (its normal
  // selection and every add-on selected alongside it) — the existing
  // behaviour, and also the correct behaviour for deselecting the normal
  // Tier outright, since an add-on has nothing to attach to once its normal
  // Tier is gone. Called with an addonTierId too, it removes exactly that one
  // add-on and leaves everything else in the quote untouched.
  const removeFromQuote = (serviceId: number, addonTierId?: TierId) => {
    setQuoteItems((prev) => (addonTierId !== undefined
      ? removeAddonQuoteItem(prev, serviceId, addonTierId)
      : removeServiceQuoteItems(prev, serviceId)));
  };

  const handleGroupChange = (id: string) => {
    if (!data) return;
    setActiveGroupId(id);
    const group = groups.find((g) => g.id === id);
    setActiveServiceId(group?.services[0]?.id ?? null);
  };

  if (loading) {
    return (
      <div class="cz-cost-builder cz-cost-builder--loading">
        <Spinner label="Loading services…" />
      </div>
    );
  }

  if (error) {
    return (
      <div class="cz-cost-builder cz-cost-builder--error">
        <div class="cz-cost-builder__error-content">
          <p class="cz-muted">Unable to load services. Please try again.</p>
          <button type="button" class="cz-btn cz-btn-secondary" onClick={refetch}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || groups.length === 0) {
    return (
      <div class="cz-cost-builder cz-cost-builder--empty">
        <p class="cz-muted">No services available at this time.</p>
      </div>
    );
  }

  const currentGroupId = activeGroupId ?? groups[0]?.id ?? '';
  const currentGroup = groups.find((g) => g.id === currentGroupId);
  const services = currentGroup?.services ?? [];
  const currentServiceId = activeServiceId ?? services[0]?.id ?? null;
  const activeService = services.find((s) => s.id === currentServiceId) ?? services[0] ?? null;
  const allServices = data.services_by_category.flatMap((g) => g.services);
  const hasQuote = quoteItems.length > 0;
  const offersAvailable = activeService !== null && canSelectServiceOffers(activeService);

  const selectedPromoId = activeService
    ? (quoteItems.find((q) => q.serviceId === activeService.id && q.offer_type === 'promotion_tier')?.promotion_id ?? null)
    : null;
  const selectedAddonTierIds: TierId[] = activeService
    ? quoteItems
      .filter((q) => q.serviceId === activeService.id && q.isAddon)
      .map((q) => q.tierId as TierId)
    : [];

  return (
    <div class={`cz-cost-builder${hasQuote ? ' cz-cost-builder--has-quote' : ''}`}>
      <HeroArea />
      <CategoryNav
        categories={groups.map((g) => ({ slug: g.id, name: g.label }))}
        activeSlug={currentGroupId}
        onChange={handleGroupChange}
      />
      <SubcategoryNav
        services={services}
        activeId={currentServiceId}
        onChange={setActiveServiceId}
      />
      <div class="cz-layout-sidebar cz-cost-builder__body">
        <div class="cz-cost-builder__main">
          {activeService ? (
            <>
              <ServiceCard
                service={activeService}
                tiers={data.tiers}
                selectedTierId={quoteItems.find((q) => q.serviceId === activeService.id && !q.isAddon)?.tierId ?? null}
                selectedAddonTierIds={selectedAddonTierIds}
                onAddToQuote={addToQuote}
                onRemoveFromQuote={removeFromQuote}
              />
              {offersAvailable && (
                <>
                  <RecommendedBundle
                    service={activeService}
                    isInQuote={quoteItems.some((q) => q.serviceId === -(activeService.id))}
                    onAdd={addToQuote}
                    onRemove={removeFromQuote}
                  />
                  {(activeService.promotion_tiers?.length ?? 0) > 0 && (
                    <PromotionSection
                      promotions={activeService.promotion_tiers}
                      serviceId={activeService.id}
                      serviceTitle={decodeHtml(activeService.title)}
                      categoryName={decodeHtml(activeService.categories[0]?.name ?? '')}
                      selectedPromoId={selectedPromoId}
                      onAdd={addToQuote}
                      onRemove={removeFromQuote}
                    />
                  )}
                </>
              )}
            </>
          ) : (
            <p class="cz-muted cz-cost-builder__empty">No services in this category.</p>
          )}
        </div>
        {/* Aside is always in the DOM; CSS drives column width via --has-quote on root */}
        <aside class="cz-cost-builder__sidebar" id={QUOTE_SUMMARY_ID}>
          {hasQuote && (
            <QuoteSummary
              items={quoteItems}
              onRemove={removeFromQuote}
              onClear={() => setQuoteItems([])}
              onOpenReview={() => setIsFlowOpen(true)}
            />
          )}
        </aside>
      </div>
      <ComparePlans service={activeService} tiers={data.tiers} />
      <FaqAccordion faqs={activeService?.faqs ?? []} />
      <MobileQuoteBar items={quoteItems} summaryId={QUOTE_SUMMARY_ID} />
      <RequestFlowModal
        isOpen={isFlowOpen}
        context={{ type: 'quote_cart', items: quoteItems, services: allServices }}
        onClose={() => setIsFlowOpen(false)}
        onSubmitSuccess={() => {
          clearCart();
          setQuoteItems([]);
        }}
      />
    </div>
  );
}
