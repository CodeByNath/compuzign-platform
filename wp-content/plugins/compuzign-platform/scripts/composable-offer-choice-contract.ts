// Contract: buildComposableChoice() (ComposableOfferBrowser.tsx) — Phase
// 2B1 correction round. The auditor found that Remove was broken for an
// optional item whose policy default_selected is true: the component
// omitted every unselected optional row from the submitted choice
// entirely, and PackageManagerSchema::resolveCustomerComposableSelection()
// treats an ABSENT optional row as "use the policy's own default_selected"
// — not "not selected". So clicking Remove on a default_selected:true item
// simply caused the server to select it again.
//
// This locks the fix: EVERY optional row is always present in the
// submitted choice with an EXPLICIT selected:true/false, so an absent-row
// fallback to the policy default can never fire regardless of what a
// customer has toggled. A required row is always present too, with no
// 'selected' key at all (the resolver always treats required as selected
// regardless of what — if anything — is submitted for it).

import { buildComposableChoice } from '../resources/ts/components/package-builder/ComposableOfferBrowser';
import type { BrowseRow, CandidateEntry } from '../resources/ts/components/package-builder/ComposableOfferBrowser';
import type { CustomerPolicyItem } from '../resources/ts/api/types/cost-builder';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Composable offer choice contract: ${message}`);
}

function policyItem(overrides: Partial<CustomerPolicyItem>): CustomerPolicyItem {
  return {
    item_id: 'x',
    mode: 'optional',
    default_selected: false,
    quantity: null,
    price_option: { mode: 'fixed', allowed_price_option_ids: null, default_price_option_id: null },
    featured: false,
    ...overrides,
  };
}

function row(overrides: Partial<CustomerPolicyItem>, rowOverrides: Partial<BrowseRow> = {}): BrowseRow {
  const policy = policyItem(overrides);
  return {
    item_id: policy.item_id,
    label: policy.item_id,
    unitPrice: 10,
    categories: [],
    service: null,
    policy,
    ...rowOverrides,
  };
}

// ── 1. Required row: always present, no 'selected' key at all ──────────────

const requiredRow = row({ item_id: 'hosting', mode: 'required' });
const requiredChoice = buildComposableChoice([requiredRow], {});
check(requiredChoice.length === 1, 'a required row is always submitted');
check(requiredChoice[0].item_id === 'hosting', 'submitted with its own item_id');
check(!('selected' in requiredChoice[0]), "a required row never carries a 'selected' key — the resolver always treats it as selected regardless");

// ── 2. THE BUG: an optional default_selected:true item, currently OFF ──────
//    (customer clicked Remove) — the fix must submit an EXPLICIT
//    selected:false, never omit the row.

const defaultOnRow = row({ item_id: 'premium_support', mode: 'optional', default_selected: true });
const removedSelection: Record<string, CandidateEntry> = { premium_support: { selected: false } };
const removedChoice = buildComposableChoice([defaultOnRow], removedSelection);
check(removedChoice.length === 1, 'the row is still present in the submitted choice — never omitted just because it is currently off');
check(removedChoice[0].item_id === 'premium_support', 'correct item_id');
check(removedChoice[0].selected === false, "an EXPLICIT selected:false is submitted — omitting the row would fall back to the policy's own default_selected:true server-side, silently re-selecting it");

// ── 3. Same item, currently ON (customer clicked Add back) ─────────────────

const addedSelection: Record<string, CandidateEntry> = { premium_support: { selected: true } };
const addedChoice = buildComposableChoice([defaultOnRow], addedSelection);
check(addedChoice[0].selected === true, 'an explicit selected:true is submitted once the customer re-adds it');

// ── 4. Round-trip: Add then Remove must differ, proving the toggle actually
//    changes what is submitted (guards against a fix that hardcodes true) ──

check(
  addedChoice[0].selected !== removedChoice[0].selected,
  'Add and Remove submit different explicit selected values for the exact same item — the toggle round-trips',
);

// ── 5. Optional item with NO local selection entry yet (fresh mount, before
//    the seeding effect has run) falls back to "not selected", never
//    silently to the policy default — buildComposableChoice() itself must
//    not reintroduce the omission bug via a different code path ──────────

const freshChoice = buildComposableChoice([defaultOnRow], {});
check(freshChoice[0].selected === false, 'with no selection entry at all, the row still submits an explicit selected:false, never an omission');

// ── 6. Configurable quantity only travels when the row is selected ─────────

const qtyRow = row({ item_id: 'extra_seats', mode: 'optional', default_selected: false, quantity: { default: 2, min: 1, max: 10, step: 1 } });
const qtySelectedOff = buildComposableChoice([qtyRow], { extra_seats: { selected: false, quantity: 5 } });
check(!('quantity' in qtySelectedOff[0]), 'quantity is not submitted for a row that is currently off, even if a stale quantity value lingers in local state');
const qtySelectedOn = buildComposableChoice([qtyRow], { extra_seats: { selected: true, quantity: 5 } });
check(qtySelectedOn[0].quantity === 5, 'quantity is submitted once the row is selected');

console.log('Composable offer choice contract: PASS');
