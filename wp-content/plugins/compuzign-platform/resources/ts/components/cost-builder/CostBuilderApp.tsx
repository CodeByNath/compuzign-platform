import { useState } from 'preact/hooks';
import { useCostBuilder } from '@/hooks/useCostBuilder';
import { getRuntimeConfig } from '@/runtime/config';
import { Spinner } from '@/components/ui/Spinner';
import { CategoryNav } from './CategoryNav';
import { SubcategoryNav } from './SubcategoryNav';
import { ServiceCard } from './ServiceCard';
import { QuoteSummary } from './QuoteSummary';
import { HeroArea } from './HeroArea';
import { RecommendedBundle } from './RecommendedBundle';
import { PdfModal } from './PdfModal';
import { FaqAccordion } from './FaqAccordion';
import { ComparePlans } from './ComparePlans';
import type { QuoteItem } from './types';

export function CostBuilderApp() {
  const { data, loading, error } = useCostBuilder();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeServiceId, setActiveServiceId] = useState<number | null>(null);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

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
        <p class="cz-muted">Unable to load services. Please try again later.</p>
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
  const config = getRuntimeConfig();
  const hasQuote = quoteItems.length > 0;

  return (
    <div class="cz-cost-builder">
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
      <div class={hasQuote ? 'cz-layout-sidebar cz-cost-builder__body' : 'cz-cost-builder__body'}>
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
        {hasQuote && (
          <aside class="cz-cost-builder__sidebar">
            <QuoteSummary
              items={quoteItems}
              contactUrl={config?.contactUrl}
              onRemove={removeFromQuote}
              onClear={() => setQuoteItems([])}
              onOpenPdfModal={() => setIsPdfModalOpen(true)}
            />
          </aside>
        )}
      </div>
      <ComparePlans />
      <FaqAccordion />
      <PdfModal
        isOpen={isPdfModalOpen}
        items={quoteItems}
        onClose={() => setIsPdfModalOpen(false)}
      />
    </div>
  );
}
