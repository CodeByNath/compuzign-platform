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
import { replaceNormalQuoteItem, upsertAddonQuoteItem, removeAddonQuoteItem, removeServiceQuoteItems, isFamilyTierQuoteItem, removeFamilyAddonQuoteItem, removeFamilyTierSystemQuoteItems } from '@/utils/quote';
import type { CartItem, QuoteItem } from './types';
import type { ServiceItem, TierId } from '@/api/types/cost-builder';

const QUOTE_SUMMARY_ID = 'cz-quote-summary';

export function canSelectServiceOffers(service: Pick<ServiceItem, 'availability'>): boolean {
  return service.availability.is_available;
}

export function CostBuilderApp() {
  const { data, loading, error, refetch } = useCostBuilder();
  // DEBUG — remove after diagnosis
  if (data) {
    console.log('[CZ CostBuilderApp] raw API tiers:', data.tiers);
    const firstSvc = data.services_by_category?.[0]?.services?.[0];
    if (firstSvc) {
      console.log('[CZ CostBuilderApp] first service pricing.tiers.basic:', firstSvc.pricing?.tiers?.['basic']);
    }
  }

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeServiceId, setActiveServiceId] = useState<number | null>(null);
  const [quoteItems, setQuoteItems] = useState<CartItem[]>(() => loadCart());
  const [isFlowOpen, setIsFlowOpen] = useState(false);
  const urlParamsApplied = useRef(false);

  // On first data load, focus the category/service passed via URL query params.
  // Falls back gracefully: missing service → category only; missing category → default.
  useEffect(() => {
    if (!data || urlParamsApplied.current) return;
    urlParamsApplied.current = true;

    const params = new URLSearchParams(window.location.search);
    const catSlug = params.get('category');
    const svcSlug = params.get('service');

    if (!catSlug) return;

    const group = data.services_by_category.find((g) => g.category_slug === catSlug);
    if (!group) return;

    setActiveCategory(catSlug);

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

  const removeCartItem = (item: CartItem) => {
    if (isFamilyTierQuoteItem(item)) {
      setQuoteItems((current) => item.isAddon
        ? removeFamilyAddonQuoteItem(current, item.familyId, item.tierInstanceId, item.tierPlatformId)
        : removeFamilyTierSystemQuoteItems(current, item.familyId, item.tierInstanceId));
      return;
    }
    removeFromQuote(item.serviceId, item.isAddon ? (item.tierId as TierId) : undefined);
  };

  const handleCategoryChange = (slug: string) => {
    if (!data) return;
    setActiveCategory(slug);
    const group = data.services_by_category.find((g) => g.category_slug === slug);
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

  if (!data || data.categories.length === 0) {
    return (
      <div class="cz-cost-builder cz-cost-builder--empty">
        <p class="cz-muted">No services available at this time.</p>
      </div>
    );
  }

  const currentSlug = activeCategory ?? data.categories[0]?.slug ?? '';
  const categoryGroup = data.services_by_category.find(
    (g) => g.category_slug === currentSlug,
  );
  const services = categoryGroup?.services ?? [];
  const currentServiceId = activeServiceId ?? services[0]?.id ?? null;
  const activeService = services.find((s) => s.id === currentServiceId) ?? services[0] ?? null;
  const allServices = data.services_by_category.flatMap((g) => g.services);
  const hasQuote = quoteItems.length > 0;
  const offersAvailable = activeService !== null && canSelectServiceOffers(activeService);

  const selectedPromoId = activeService
    ? (quoteItems.find((q) => !isFamilyTierQuoteItem(q) && q.serviceId === activeService.id && q.offer_type === 'promotion_tier') as QuoteItem | undefined)?.promotion_id ?? null
    : null;
  const selectedAddonTierIds: TierId[] = activeService
    ? quoteItems
      .filter((q): q is QuoteItem => !isFamilyTierQuoteItem(q) && q.serviceId === activeService.id && q.isAddon)
      .map((q) => q.tierId as TierId)
    : [];

  return (
    <div class={`cz-cost-builder${hasQuote ? ' cz-cost-builder--has-quote' : ''}`}>
      <HeroArea />
      <CategoryNav
        categories={data.categories}
        activeSlug={currentSlug}
        onChange={handleCategoryChange}
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
                selectedTierId={quoteItems.find((q) => !isFamilyTierQuoteItem(q) && q.serviceId === activeService.id && !q.isAddon)?.tierId ?? null}
                selectedAddonTierIds={selectedAddonTierIds}
                onAddToQuote={addToQuote}
                onRemoveFromQuote={removeFromQuote}
              />
              {offersAvailable && (
                <>
                  <RecommendedBundle
                    service={activeService}
                    isInQuote={quoteItems.some((q) => !isFamilyTierQuoteItem(q) && q.serviceId === -(activeService.id))}
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
              onRemove={removeCartItem}
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
