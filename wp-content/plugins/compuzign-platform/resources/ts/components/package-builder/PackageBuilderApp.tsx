import { useCallback, useEffect, useState } from 'preact/hooks';
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
  upsertFamilyComposableQuoteItem,
  removeFamilyAddonQuoteItem,
  removeFamilyComposableQuoteItem,
  removeFamilyTierSystemQuoteItems,
  removeAddonQuoteItem,
  removeServiceQuoteItems,
  resolveQuoteItemRole,
} from '@/utils/quote';
import type { CartItem, FamilyTierQuoteItem } from '@/components/cost-builder/types';
import type { TierId } from '@/api/types/cost-builder';
import { FamilyTierAdapter } from './FamilyTierAdapter';
import { QuoteDetailsOverlay } from './QuoteDetailsOverlay';
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
  // Phase 8D: the quote-details overlay's own target identity — null means
  // closed, 'cart' means opened at the cart level (Total Commitment tab),
  // a FamilyTierQuoteItem means opened directly on that item's own plan
  // tab. Owned here (not inside QuoteSummary/FamilyTierAdapter) because
  // resolving an arbitrary quoted item's Plan Details requires the FULL
  // families list (data.families) — a cart item can belong to a Family
  // other than whichever one FamilyTierAdapter currently has open.
  const [quoteDetailsTarget, setQuoteDetailsTarget] = useState<FamilyTierQuoteItem | 'cart' | null>(null);

  useEffect(() => {
    if (items.length === 0) clearCart();
    else saveCart(items);
  }, [items]);

  // Resolved here, unconditionally, before the loading/error/empty guards
  // below — the Rules of Hooks forbid calling useCallback only on some
  // renders, and `data` does not exist yet during the loading/error states.
  // Byte-identical resolution to the `family` derivation after the guards
  // (re-derived there too, since a null family cannot drive the JSX below).
  const selectedFamily = data
    ? data.families.find((candidate) => candidate.family_id === activeFamilyId) ?? data.families[0] ?? null
    : null;
  const familyKey = selectedFamily?.family_id ?? '';
  const tierInstanceKey = selectedFamily?.tier_instance_id ?? '';

  // Quote/cart connection phase correction: these must be reference-stable
  // across a render that only changed `items` (e.g. because ONE of them
  // just ran), not redefined as a new closure every render. Without this,
  // ComposableOfferBrowser.tsx's own preview effect — which depends on
  // onCommit/onRemoveFromQuote precisely so it can react to a genuinely new
  // callback (Family switch) — saw a new identity after every single
  // commit, re-ran, resolved the SAME successful preview again, and
  // committed again: an unbounded 400ms preview/commit feedback loop. Deps
  // are the Family's own identity strings (not the full family object,
  // which is recreated every `usePackageBuilder()` fetch) so a real Family
  // switch still produces a fresh callback, matching the addressed cart.
  const add = useCallback((item: FamilyTierQuoteItem) => setItems((current) => item.isAddon
    ? upsertFamilyAddonQuoteItem(current, item)
    : replaceFamilyNormalQuoteItem(current, item)), []);
  const removePrimary = useCallback(
    () => setItems((current) => removeFamilyTierSystemQuoteItems(current, familyKey, tierInstanceKey)),
    [familyKey, tierInstanceKey],
  );
  const removeAddon = useCallback(
    (tierPlatformId: string) => setItems((current) => removeFamilyAddonQuoteItem(current, familyKey, tierInstanceKey, tierPlatformId)),
    [familyKey, tierInstanceKey],
  );
  const addComposable = useCallback(
    (item: FamilyTierQuoteItem) => setItems((current) => upsertFamilyComposableQuoteItem(current, item)),
    [],
  );
  const removeComposable = useCallback(
    () => setItems((current) => removeFamilyComposableQuoteItem(current, familyKey, tierInstanceKey)),
    [familyKey, tierInstanceKey],
  );
  const removeItem = useCallback((item: CartItem) => setItems((current) => {
    if (isFamilyTierQuoteItem(item)) {
      const role = resolveQuoteItemRole(item);
      if (role === 'addon') return removeFamilyAddonQuoteItem(current, item.familyId, item.tierInstanceId, item.tierPlatformId);
      if (role === 'composable') return removeFamilyComposableQuoteItem(current, item.familyId, item.tierInstanceId);
      return removeFamilyTierSystemQuoteItems(current, item.familyId, item.tierInstanceId);
    }
    return item.isAddon
      ? removeAddonQuoteItem(current, item.serviceId, item.tierId)
      : removeServiceQuoteItems(current, item.serviceId);
  }), []);

  if (loading) return <div class="cz-cost-builder cz-cost-builder--loading"><Spinner label="Loading packages…" /></div>;
  if (error) return (
    <div class="cz-cost-builder cz-cost-builder--error">
      <p class="cz-muted">Unable to load packages. Please try again.</p>
      <button type="button" class="cz-btn cz-btn-secondary" onClick={refetch}>Retry</button>
    </div>
  );
  if (!data || data.families.length === 0) return <div class="cz-cost-builder cz-cost-builder--empty"><p class="cz-muted">No packages available at this time.</p></div>;

  const family = selectedFamily ?? data.families[0];
  const familyItems = items.filter(
    (item): item is FamilyTierQuoteItem => isFamilyTierQuoteItem(item)
      && item.familyId === family.family_id
      && item.tierInstanceId === family.tier_instance_id,
  );
  const primary = familyItems.find((item) => resolveQuoteItemRole(item) === 'primary') ?? null;
  // Phase 8E: the full quoted add-on items, not just their tierIds — an
  // add-on's exact quoted identity (Tier + Edition) is what the focused
  // shell's own exactness check needs, the same as the primary's own
  // tierEditionPlatformId below.
  const addonItems = familyItems.filter((item) => resolveQuoteItemRole(item) === 'addon');
  // Quote/cart connection phase: the one aggregate composable line for this
  // Family+Instance, if any — never the primary, never an Add-on (see
  // resolveQuoteItemRole()).
  const composableItem = familyItems.find((item) => resolveQuoteItemRole(item) === 'composable') ?? null;

  return (
    <div class={`cz-cost-builder cz-package-builder${items.length ? ' cz-cost-builder--has-quote' : ''}`}>
      <section class="cz-package-builder__hero" aria-labelledby="cz-package-builder-title">
        <h1 id="cz-package-builder-title" class="cz-heading-lg">Plans &amp; pricing</h1>
        <div class="cz-package-builder__features" aria-label="Plan benefits">
          <span><FeatureIcon kind="guarantee" />30-day money-back guarantee</span>
          <span><FeatureIcon kind="support" />24/7 support</span>
          <span><FeatureIcon kind="cancel" />Cancel anytime</span>
        </div>
        {/* Only ever swaps which Family's data FamilyTierAdapter reads —
            it deliberately does nothing else. FamilyTierAdapter is a
            sibling of this whole hero section, so it never renders inside
            this component's own branches; it owns clearing its own
            focused-Tier/Edition/Plan-Details state in response, keyed on
            family.family_id, rather than this button trying to reach into
            a sibling's internal state. */}
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
        <h2 class="cz-heading-md">{family.title}</h2>
        {family.description && <p class="cz-copy cz-package-builder__family-description">{family.description}</p>}
        {family.included_categories.length > 0 && (
          <div class="cz-package-builder__inclusions">
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
            <FamilyTierAdapter
              family={family}
              tiers={data.tiers}
              selectedTierId={primary?.tierId as TierId | null}
              selectedTierEditionPlatformId={primary?.tierEditionPlatformId ?? null}
              selectedAddonItems={addonItems}
              onAdd={add}
              onRemovePrimary={removePrimary}
              onRemoveAddon={removeAddon}
              selectedComposableItem={composableItem}
              onComposableCommit={addComposable}
              onComposableRemove={removeComposable}
              selectedPrimaryItem={primary}
            />
          </Card>
        </main>
        <aside class="cz-cost-builder__sidebar" id={SUMMARY_ID}>
          {items.length > 0 && (
            <QuoteSummary
              items={items}
              onRemove={removeItem}
              onClear={() => setItems([])}
              onOpenReview={() => setIsFlowOpen(true)}
              onOpenDetails={(item) => setQuoteDetailsTarget(item ?? 'cart')}
            />
          )}
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
      {quoteDetailsTarget && (
        <QuoteDetailsOverlay
          items={items}
          families={data.families}
          tiers={data.tiers}
          initialTarget={quoteDetailsTarget}
          onClose={() => setQuoteDetailsTarget(null)}
        />
      )}
    </div>
  );
}
