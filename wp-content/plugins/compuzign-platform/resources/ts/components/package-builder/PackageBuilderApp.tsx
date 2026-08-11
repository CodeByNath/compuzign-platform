import { useEffect, useState } from 'preact/hooks';
import { usePackageBuilder } from '@/hooks/usePackageBuilder';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { QuoteSummary } from '@/components/cost-builder/QuoteSummary';
import { MobileQuoteBar } from '@/components/cost-builder/MobileQuoteBar';
import { loadCart, saveCart, clearCart } from '@/utils/cartStorage';
import {
  isFamilyTierQuoteItem,
  replaceFamilyNormalQuoteItem,
  upsertFamilyAddonQuoteItem,
  removeFamilyAddonQuoteItem,
  removeFamilyTierSystemQuoteItems,
  removeAddonQuoteItem,
  removeServiceQuoteItems,
} from '@/utils/quote';
import type { CartItem, FamilyTierQuoteItem } from '@/components/cost-builder/types';
import type { TierId } from '@/api/types/cost-builder';
import { FamilyTierAdapter } from './FamilyTierAdapter';
import { RequestFlowModal } from '@/components/request-flow/RequestFlowModal';

const SUMMARY_ID = 'cz-package-builder-quote-summary';

function FeatureIcon({ kind }: { kind: 'guarantee' | 'support' | 'cancel' }) {
  const path = kind === 'guarantee'
    ? <path d="M12 2.75 4.5 5.6v5.55c0 4.6 3.2 8.9 7.5 10.1 4.3-1.2 7.5-5.5 7.5-10.1V5.6L12 2.75Zm-3.2 9.1 2.05 2.05 4.35-4.55" />
    : kind === 'support'
      ? <path d="M4.25 13v-1a7.75 7.75 0 0 1 15.5 0v1M4.25 13v3.25c0 .83.67 1.5 1.5 1.5H7V13H4.25Zm15.5 0v3.25c0 .83-.67 1.5-1.5 1.5H17V13h2.75ZM17 17.75c-.65 2-2.3 3-5 3" />
      : <path d="M18.25 8.25V4.5m0 0H14.5m3.75 0-3.1 3.1a6.25 6.25 0 1 0 1.35 6.85" />;
  return <svg class="cz-package-builder__feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{path}</svg>;
}

function CategoryIcon() {
  return (
    <svg class="cz-package-builder__category-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.75 3.5h4.5c.69 0 1.25.56 1.25 1.25v4.5c0 .69-.56 1.25-1.25 1.25h-4.5A1.25 1.25 0 0 1 3.5 9.25v-4.5c0-.69.56-1.25 1.25-1.25Zm10 0h4.5c.69 0 1.25.56 1.25 1.25v4.5c0 .69-.56 1.25-1.25 1.25h-4.5a1.25 1.25 0 0 1-1.25-1.25v-4.5c0-.69.56-1.25 1.25-1.25Zm-10 10h4.5c.69 0 1.25.56 1.25 1.25v4.5c0 .69-.56 1.25-1.25 1.25h-4.5a1.25 1.25 0 0 1-1.25-1.25v-4.5c0-.69.56-1.25 1.25-1.25Zm10 0h4.5c.69 0 1.25.56 1.25 1.25v4.5c0 .69-.56 1.25-1.25 1.25h-4.5a1.25 1.25 0 0 1-1.25-1.25v-4.5c0-.69.56-1.25 1.25-1.25Z" />
    </svg>
  );
}

export function PackageBuilderApp() {
  const { data, loading, error, refetch } = usePackageBuilder();
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);
  const [items, setItems] = useState<CartItem[]>(() => loadCart());
  const [isFlowOpen, setIsFlowOpen] = useState(false);

  useEffect(() => {
    if (items.length === 0) clearCart();
    else saveCart(items);
  }, [items]);

  if (loading) return <div class="cz-cost-builder cz-cost-builder--loading"><Spinner label="Loading packages…" /></div>;
  if (error) return (
    <div class="cz-cost-builder cz-cost-builder--error">
      <p class="cz-muted">Unable to load packages. Please try again.</p>
      <button type="button" class="cz-btn cz-btn-secondary" onClick={refetch}>Retry</button>
    </div>
  );
  if (!data || data.families.length === 0) return <div class="cz-cost-builder cz-cost-builder--empty"><p class="cz-muted">No packages available at this time.</p></div>;

  const familyId = activeFamilyId ?? data.families[0].family_id;
  const family = data.families.find((candidate) => candidate.family_id === familyId) ?? data.families[0];
  const familyItems = items.filter(
    (item): item is FamilyTierQuoteItem => isFamilyTierQuoteItem(item)
      && item.familyId === family.family_id
      && item.tierInstanceId === family.tier_instance_id,
  );
  const primary = familyItems.find((item) => !item.isAddon) ?? null;
  const addonIds = familyItems.filter((item) => item.isAddon).map((item) => item.tierId);

  const add = (item: FamilyTierQuoteItem) => setItems((current) => item.isAddon
    ? upsertFamilyAddonQuoteItem(current, item)
    : replaceFamilyNormalQuoteItem(current, item));
  const removePrimary = () => setItems((current) => removeFamilyTierSystemQuoteItems(current, family.family_id, family.tier_instance_id));
  const removeAddon = (tierPlatformId: string) => setItems((current) => removeFamilyAddonQuoteItem(current, family.family_id, family.tier_instance_id, tierPlatformId));
  const removeItem = (item: CartItem) => setItems((current) => {
    if (isFamilyTierQuoteItem(item)) {
      return item.isAddon
        ? removeFamilyAddonQuoteItem(current, item.familyId, item.tierInstanceId, item.tierPlatformId)
        : removeFamilyTierSystemQuoteItems(current, item.familyId, item.tierInstanceId);
    }
    return item.isAddon
      ? removeAddonQuoteItem(current, item.serviceId, item.tierId)
      : removeServiceQuoteItems(current, item.serviceId);
  });

  return (
    <div class={`cz-cost-builder cz-package-builder${items.length ? ' cz-cost-builder--has-quote' : ''}`}>
      <section class="cz-package-builder__hero" aria-labelledby="cz-package-builder-title">
        <h1 id="cz-package-builder-title">Plans &amp; pricing</h1>
        <div class="cz-package-builder__features" aria-label="Plan benefits">
          <span><FeatureIcon kind="guarantee" />30-day money-back guarantee</span>
          <span><FeatureIcon kind="support" />24/7 support</span>
          <span><FeatureIcon kind="cancel" />Cancel anytime</span>
        </div>
        <div class="cz-package-builder__selector" role="tablist" aria-label="Package Families">
          {data.families.map((candidate) => (
            <button
              key={candidate.family_id}
              type="button"
              role="tab"
              aria-selected={candidate.family_id === family.family_id}
              class={`cz-btn ${candidate.family_id === family.family_id ? 'cz-btn-primary' : 'cz-btn-secondary'}`}
              onClick={() => setActiveFamilyId(candidate.family_id)}
            >{candidate.title}</button>
          ))}
        </div>
      </section>
      <header class="cz-package-builder__header">
        <h2 class="cz-heading-lg">{family.title}</h2>
        {family.description && <p class="cz-copy">{family.description}</p>}
        {family.included_categories.length > 0 && (
          <div class="cz-package-builder__inclusions">
            <strong>All plans include:</strong>
            <span class="cz-package-builder__category-list">
              {family.included_categories.map((category) => (
                <span key={category} class="cz-package-builder__category"><CategoryIcon />{category}</span>
              ))}
            </span>
          </div>
        )}
      </header>
      <div class="cz-layout-sidebar cz-cost-builder__body">
        <main class="cz-cost-builder__main">
          <Card class="cz-cost-builder__card">
            <h3 class="cz-heading-sm">Available tiers / plans</h3>
            <FamilyTierAdapter
              family={family}
              tiers={data.tiers}
              selectedTierId={primary?.tierId as TierId | null}
              selectedAddonTierIds={addonIds as TierId[]}
              onAdd={add}
              onRemovePrimary={removePrimary}
              onRemoveAddon={removeAddon}
            />
          </Card>
        </main>
        <aside class="cz-cost-builder__sidebar" id={SUMMARY_ID}>
          {items.length > 0 && <QuoteSummary items={items} onRemove={removeItem} onClear={() => setItems([])} onOpenReview={() => setIsFlowOpen(true)} />}
        </aside>
      </div>
      <MobileQuoteBar items={items} summaryId={SUMMARY_ID} />
      <RequestFlowModal
        isOpen={isFlowOpen}
        context={{ type: 'quote_cart', items, services: [] }}
        onClose={() => setIsFlowOpen(false)}
        onSubmitSuccess={() => {
          clearCart();
          setItems([]);
        }}
      />
    </div>
  );
}
