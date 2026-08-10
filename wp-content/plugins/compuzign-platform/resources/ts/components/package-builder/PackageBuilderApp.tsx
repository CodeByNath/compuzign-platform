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

const SUMMARY_ID = 'cz-package-builder-quote-summary';

export function PackageBuilderApp() {
  const { data, loading, error, refetch } = usePackageBuilder();
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);
  const [items, setItems] = useState<CartItem[]>(() => loadCart());

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
      <header class="cz-package-builder__header">
        <p class="cz-cost-builder__eyebrow">Package Family</p>
        <div class="cz-package-builder__selector" role="group" aria-label="Package Family">
          {data.families.map((candidate) => (
            <button
              key={candidate.family_id}
              type="button"
              class={`cz-btn ${candidate.family_id === family.family_id ? 'cz-btn-primary' : 'cz-btn-secondary'}`}
              onClick={() => setActiveFamilyId(candidate.family_id)}
            >{candidate.title}</button>
          ))}
        </div>
        <h2 class="cz-heading-lg">{family.title}</h2>
        {family.description && <p class="cz-copy">{family.description}</p>}
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
          {items.length > 0 && <QuoteSummary items={items} onRemove={removeItem} onClear={() => setItems([])} onOpenReview={() => {}} />}
        </aside>
      </div>
      <MobileQuoteBar items={items} summaryId={SUMMARY_ID} />
    </div>
  );
}
