export type PricingIssueCode =
  | 'unresolved_item'
  | 'unavailable_item'
  | 'invalid_option'
  | 'invalid_quantity'
  | 'missing_price';

export interface PricingIssue {
  code: PricingIssueCode;
  item_id: string;
  path: string;
}

export interface PricingRateSheetItem {
  item_id: string;
  unit_price: number | null;
  available: boolean;
  options: readonly string[];
}

export interface TierPricingSelection {
  item_id: string;
  quantity: number;
  option_selections: readonly string[];
}

export interface TierPricingLine {
  item_id: string;
  quantity: number;
  option_selections: string[];
  resolved: boolean;
  available: boolean;
  options_valid: boolean;
  quantity_valid: boolean;
  price_present: boolean;
  unit_price: number | null;
  line_total: number | null;
  issues: PricingIssue[];
}

export interface TierPricingResult {
  mode: 'catalogue' | 'contact';
  total: number | null;
  resolved_subtotal: number;
  complete: boolean;
  unresolved: PricingIssue[];
  lines: TierPricingLine[];
}

export function evaluateTierPricing(
  rateSheetItems: readonly PricingRateSheetItem[],
  selections: readonly TierPricingSelection[],
  contact = false,
): TierPricingResult {
  const items = new Map<string, { index: number; item: PricingRateSheetItem }>();
  rateSheetItems.forEach((item, index) => {
    if (item.item_id.trim() && !items.has(item.item_id.trim())) items.set(item.item_id.trim(), { index, item });
  });

  let resolvedSubtotal = 0;
  const unresolved: PricingIssue[] = [];
  const lines = selections.map((selection, selectionIndex): TierPricingLine => {
    const itemId = selection.item_id.trim();
    const entry = items.get(itemId);
    const resolved = entry !== undefined;
    const available = resolved && entry.item.available;
    const options = [...selection.option_selections].map((option) => option.trim());
    const optionsValid = resolved && options.every((option) => entry.item.options.includes(option));
    const quantityValid = Number.isInteger(selection.quantity) && selection.quantity >= 1;
    const price = resolved ? entry.item.unit_price : null;
    const pricePresent = resolved && typeof price === 'number' && Number.isFinite(price) && price >= 0;
    const issues: PricingIssue[] = [];
    if (!resolved) {
      issues.push({ code: 'unresolved_item', item_id: itemId, path: `selections.${selectionIndex}.item_id` });
    } else {
      if (!available) issues.push({ code: 'unavailable_item', item_id: itemId, path: `rate_sheet.items.${entry.index}.available` });
      if (!optionsValid) issues.push({ code: 'invalid_option', item_id: itemId, path: `selections.${selectionIndex}.option_selections` });
    }
    if (!quantityValid) issues.push({ code: 'invalid_quantity', item_id: itemId, path: `selections.${selectionIndex}.quantity` });
    if (resolved && !pricePresent) issues.push({ code: 'missing_price', item_id: itemId, path: `rate_sheet.items.${entry.index}.unit_price` });
    const valid = resolved && available && optionsValid && quantityValid && pricePresent;
    const lineTotal = valid ? price * selection.quantity : null;
    if (lineTotal !== null) resolvedSubtotal += lineTotal;
    unresolved.push(...issues);
    return {
      item_id: itemId, quantity: selection.quantity, option_selections: options,
      resolved, available, options_valid: optionsValid, quantity_valid: quantityValid,
      price_present: pricePresent, unit_price: pricePresent ? price : null,
      line_total: lineTotal, issues,
    };
  });
  const complete = unresolved.length === 0;
  return {
    mode: contact ? 'contact' : 'catalogue',
    total: !contact && complete ? resolvedSubtotal : null,
    resolved_subtotal: resolvedSubtotal,
    complete, unresolved, lines,
  };
}
