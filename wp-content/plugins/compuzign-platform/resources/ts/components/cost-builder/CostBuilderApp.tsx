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
import { FaqAccordion } from './FaqAccordion';
import { ComparePlans } from './ComparePlans';
import { MobileQuoteBar } from './MobileQuoteBar';
import { RequestFlowModal } from '@/components/request-flow/RequestFlowModal';
import type { QuoteItem } from './types';

const QUOTE_SUMMARY_ID = 'cz-quote-summary';

export function CostBuilderApp() {
  const { data, loading, error, refetch } = useCostBuilder();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeServiceId, setActiveServiceId] = useState<number | null>(null);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>(() => loadCart());
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

  const addToQuote = (item: QuoteItem) => {
    setQuoteItems((prev) => [
      ...prev.filter((q) => q.serviceId !== item.serviceId),
      item,
    ]);
  };

  const removeFromQuote = (serviceId: number) => {
    setQuoteItems((prev) => prev.filter((q) => q.serviceId !== serviceId));
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
                selectedTierId={quoteItems.find((q) => q.serviceId === activeService.id)?.tierId ?? null}
                onAddToQuote={addToQuote}
                onRemoveFromQuote={removeFromQuote}
              />
              <RecommendedBundle
                service={activeService}
                isInQuote={quoteItems.some((q) => q.serviceId === -(activeService.id))}
                onAdd={addToQuote}
                onRemove={removeFromQuote}
              />
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
