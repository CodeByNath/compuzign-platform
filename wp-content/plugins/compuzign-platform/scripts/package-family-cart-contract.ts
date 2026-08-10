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
    familyTitle: 'KAIROS',
    tierInstanceId: 'ti_kairos',
    tierOccupantId: 'occ_basic',
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
const premium = familyItem({ tierOccupantId: 'occ_premium', tierId: 'premium', tierTitle: 'KAIROS Premium' });
const addon = familyItem({ tierOccupantId: 'occ_backup', tierId: 'standard', tierTitle: 'Backup', isAddon: true });
const otherFamily = familyItem({ familyId: 'pcg_aptos', familyTitle: 'APTOS', tierInstanceId: 'ti_aptos', tierOccupantId: 'occ_aptos' });

check(!('serviceId' in basic), 'a Family line has no fake Service identity');
check(quoteItemKey(basic) === 'family:pcg_kairos:instance:ti_kairos:primary', 'primary identity is the Family-assigned Tier system');
check(quoteItemKey(addon) === 'family:pcg_kairos:instance:ti_kairos:addon:occ_backup', 'add-on identity uses the real occupant');

let cart: CartItem[] = [serviceItem, basic, otherFamily];
cart = upsertFamilyAddonQuoteItem(cart, addon);
cart = replaceFamilyNormalQuoteItem(cart, premium);
check(cart.some((item) => item === serviceItem), 'legacy Service lines coexist untouched');
check(cart.some((item) => item === otherFamily), 'another Family Tier system coexists untouched');
check(cart.some((item) => item === addon), 'switching the primary preserves its add-on');
check(!cart.some((item) => item === basic), 'switching the primary replaces the old occupant snapshot');

cart = removeFamilyAddonQuoteItem(cart, 'pcg_kairos', 'ti_kairos', 'occ_backup');
check(!cart.some((item) => item === addon), 'one Family add-on can be removed independently');
cart = upsertFamilyAddonQuoteItem(cart, addon);
cart = removeFamilyTierSystemQuoteItems(cart, 'pcg_kairos', 'ti_kairos');
check(!cart.some((item) => item === premium || item === addon), 'removing a Family primary removes its associated add-ons');
check(cart.length === 2 && cart.includes(serviceItem) && cart.includes(otherFamily), 'unrelated Service and Family lines survive');

console.log('Package Family cart contract passed.');
