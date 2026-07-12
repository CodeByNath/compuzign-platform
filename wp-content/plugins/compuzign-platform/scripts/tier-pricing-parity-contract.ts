import fixture from '../tests/fixtures/tier-pricing-parity.json';
import { evaluateTierPricing } from '../resources/ts/modules/packages/evaluateTierPricing';
import type { PricingRateSheetItem, TierPricingSelection } from '../resources/ts/modules/packages/evaluateTierPricing';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`TypeScript Tier pricing parity: ${message}`);
}

for (const testCase of fixture.cases) {
  const result = evaluateTierPricing(
    fixture.rate_sheet_items as PricingRateSheetItem[],
    testCase.selections as TierPricingSelection[],
    testCase.contact,
  );
  const actual = {
    total: result.total,
    resolved_subtotal: result.resolved_subtotal,
    complete: result.complete,
    issues: result.unresolved,
  };
  check(JSON.stringify(actual) === JSON.stringify(testCase.expected), `${testCase.name} differs from its neutral fixture`);
  check(result.total === null || result.complete, `${testCase.name} violates total => complete`);
  check(result.complete || result.total === null, `${testCase.name} violates incomplete => null total`);
  check(result.mode !== 'contact' || result.total === null, `${testCase.name} exposes a contact total`);
  check(result.mode !== 'catalogue' || !result.complete || result.total === result.resolved_subtotal, `${testCase.name} catalogue total differs from subtotal`);
}

console.log('TypeScript Tier pricing parity fixtures passed.');
