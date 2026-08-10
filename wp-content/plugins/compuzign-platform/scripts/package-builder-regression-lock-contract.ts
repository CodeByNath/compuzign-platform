import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { quoteItemKey, replaceNormalQuoteItem } from '../resources/ts/utils/quote';
import type { QuoteItem } from '../resources/ts/components/cost-builder/types';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Package builder regression lock: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const moduleSource = readFileSync(resolve(root, 'src/Modules/CostBuilder/CostBuilderModule.php'), 'utf8');
const entrySource = readFileSync(resolve(root, 'resources/ts/modules/cost-builder.ts'), 'utf8');
const templateSource = readFileSync(resolve(root, 'app/modules/cost-builder/templates/cost-builder.php'), 'utf8');

check(
  moduleSource.includes("add_shortcode('compuzign_cost_builder', [$this, 'renderShortcode'])"),
  'the established shortcode remains registered through its existing renderer',
);
check(
  entrySource.includes("{ type: 'shortcode', mountId: 'compuzign-cost-builder' }"),
  'the established frontend entry keeps its mount condition',
);
check(
  templateSource.trim() === '<div id="compuzign-cost-builder" class="cz-container"></div>',
  'the established shortcode template remains exact',
);

const legacyItem: QuoteItem = {
  serviceId: 101,
  serviceTitle: 'KAIROS Service',
  tierId: 'standard',
  tierTitle: 'Standard',
  price: 49,
  billingCycle: 'monthly',
  categoryName: 'Managed IT',
  features: ['Monitoring'],
  isAddon: false,
  minimumTermValue: null,
  minimumTermUnit: null,
};
const expectedKeys = [
  'billingCycle',
  'categoryName',
  'features',
  'isAddon',
  'minimumTermUnit',
  'minimumTermValue',
  'price',
  'serviceId',
  'serviceTitle',
  'tierId',
  'tierTitle',
];

check(
  JSON.stringify(Object.keys(legacyItem).sort()) === JSON.stringify(expectedKeys),
  'the legacy Service-rooted QuoteItem serialized field set is locked',
);
check(quoteItemKey(legacyItem) === '101:primary', 'the legacy primary cart key is locked');
check(
  replaceNormalQuoteItem([{ ...legacyItem, tierId: 'basic' }], legacyItem)[0] === legacyItem,
  'the legacy one-primary-selection-per-Service replacement rule is locked',
);

console.log('Package builder regression lock passed.');
