import {
  quoteItemKey,
  replaceFamilyNormalQuoteItem,
  upsertFamilyAddonQuoteItem,
  removeFamilyAddonQuoteItem,
  removeFamilyTierSystemQuoteItems,
} from '../resources/ts/utils/quote';
import type { CartItem, FamilyTierQuoteItem, QuoteItem } from '../resources/ts/components/cost-builder/types';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Package Family cart contract: ${message}`);
}

function familyItem(partial: Partial<FamilyTierQuoteItem>): FamilyTierQuoteItem {
  return {
    offer_type: 'family_tier',
    familyId: 'pcg_kairos',
    familyPlatformId: 'CZPG-KAIROS01',
    familyTitle: 'KAIROS',
    tierInstanceId: 'ti_kairos',
    tierInstancePlatformId: 'CZTG-KAIROS01',
    tierOccupantId: 'occ_basic',
    tierPlatformId: 'CZT-KAIROS001',
    tierEditionPlatformId: null,
    tierId: 'basic',
    tierTitle: 'KAIROS Basic',
    price: 11,
    billingCycle: 'monthly',
    features: ['Monitoring'],
    isAddon: false,
    minimumTermValue: null,
    minimumTermUnit: null,
    ...partial,
  };
}

const serviceItem: QuoteItem = {
  serviceId: 101, serviceTitle: 'Legacy Service', tierId: 'basic', tierTitle: 'Basic',
  price: 20, billingCycle: 'monthly', categoryName: 'Managed IT', features: [],
  isAddon: false, minimumTermValue: null, minimumTermUnit: null,
};
const basic = familyItem({});
const premium = familyItem({ tierOccupantId: 'occ_premium', tierPlatformId: 'CZT-KAIROS002', tierId: 'premium', tierTitle: 'KAIROS Premium' });
const addon = familyItem({ tierOccupantId: 'occ_backup', tierPlatformId: 'CZTA-KAIROS01', tierId: 'standard', tierTitle: 'Backup', isAddon: true });
const otherFamily = familyItem({ familyId: 'pcg_aptos', familyPlatformId: 'CZPG-APTOS001', familyTitle: 'APTOS', tierInstanceId: 'ti_aptos', tierInstancePlatformId: 'CZTG-APTOS001', tierOccupantId: 'occ_aptos', tierPlatformId: 'CZT-APTOS001' });

check(!('serviceId' in basic), 'a Family line has no fake Service identity');
check(quoteItemKey(basic) === 'family:CZPG-KAIROS01:instance:CZTG-KAIROS01:primary', 'primary identity uses the Family and Tier Instance business identifiers');
check(quoteItemKey(addon) === 'family:CZPG-KAIROS01:instance:CZTG-KAIROS01:addon:CZTA-KAIROS01', 'add-on identity uses its business identifier');

let cart: CartItem[] = [serviceItem, basic, otherFamily];
cart = upsertFamilyAddonQuoteItem(cart, addon);
cart = replaceFamilyNormalQuoteItem(cart, premium);
check(cart.some((item) => item === serviceItem), 'legacy Service lines coexist untouched');
check(cart.some((item) => item === otherFamily), 'another Family Tier system coexists untouched');
check(cart.some((item) => item === addon), 'switching the primary preserves its add-on');
check(!cart.some((item) => item === basic), 'switching the primary replaces the old occupant snapshot');

cart = removeFamilyAddonQuoteItem(cart, 'pcg_kairos', 'ti_kairos', 'CZTA-KAIROS01');
check(!cart.some((item) => item === addon), 'one Family add-on can be removed independently');
cart = upsertFamilyAddonQuoteItem(cart, addon);
cart = removeFamilyTierSystemQuoteItems(cart, 'pcg_kairos', 'ti_kairos');
check(!cart.some((item) => item === premium || item === addon), 'removing a Family primary removes its associated add-ons');
check(cart.length === 2 && cart.includes(serviceItem) && cart.includes(otherFamily), 'unrelated Service and Family lines survive');

console.log('Package Family cart contract passed.');
