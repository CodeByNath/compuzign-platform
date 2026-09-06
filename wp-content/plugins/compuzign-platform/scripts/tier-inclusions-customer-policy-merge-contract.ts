// Phase 2 contract — project-work/2026-09-06-tier-catalogue-admin-ux-
// consolidation.md. Merges the standalone Customer Selection Rules
// controller's own per-item controls into the existing Build Your Own /
// Tier Catalogue occupant's Tier Inclusions ('features') editing session,
// as a controller/capability — never a fifth module, never a second
// inclusion list. Proves:
//
//   1. patchCustomerPolicyItem()/findCustomerPolicyItem() (the ONE shared
//      mutation/lookup pair) produce identical payload semantics for
//      required/optional/not-offered, default-selected, quantity bounds and
//      featured — real behavior, not string-matching, since these are pure
//      exported functions.
//   2. PoolInclusionsEditor.tsx (the merged row, the ONE remaining consumer
//      now that the standalone Customer Selection Rules drawer is retired —
//      see project-work's Phase 3 correction) imports the shared pair rather
//      than carrying its own duplicated copy.
//   3. PoolInclusionsEditor mounts the merged controls exactly ONCE per
//      selected inclusion item_id (the outer row), never inside
//      InclusionAssignmentCard (which repeats once per Default/Additional
//      Leg assignment) and never once per a Bundle row's own supplied
//      children (those never leave the read-only sub-list at all).
//   4. Ordinary Tier/Add-on occupants never receive the merged controls —
//      useTierModuleEditing.ts's own gate requires isComposableOccupant(...)
//      && the published `enabled` fact (never earlier). A Tier Edition's own
//      Inclusions tab (TierEditionOverviewFields.tsx) reaches the SAME
//      controls only via its own explicit `customerPolicyEligible` prop
//      (Phase 3 correction — TierDrawerContent computes it with the
//      identical isComposableOccupant(...) && enabled formula), never
//      unconditionally.
//   5. A genuine customer_policy save failure is never silently reported as
//      a full Tier Inclusions Save success — useTierModuleEditing.ts only
//      attempts it after a successful Inclusions save, and its own result
//      overwrites `ok` before the shared failure branch runs.

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { findCustomerPolicyItem, patchCustomerPolicyItem } from '../resources/ts/package-station/drawer/editors/customerPolicyFields';
import type { CustomerPolicy } from '../resources/ts/api/types/cost-builder';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Tier Inclusions customer-policy merge contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');

// ── 1. Real payload-semantics proof against the shared pure functions ──────

const empty: CustomerPolicy | null = null;

const required = patchCustomerPolicyItem(empty, 'hosting', { mode: 'required' });
check(required.items.length === 1 && required.items[0].mode === 'required', 'setting a fresh item to required creates one entry with mode: required');
check(required.items[0].default_selected === false && required.items[0].quantity === null && required.items[0].featured === false, 'a freshly-created entry defaults default_selected/quantity/featured exactly as the standalone drawer always has');
check(required.items[0].price_option.mode === 'fixed' && required.items[0].price_option.allowed_price_option_ids === null, 'Price Option authoring stays out of scope — every new entry is permanently {mode: fixed}');

const optional = patchCustomerPolicyItem(required, 'hosting', { mode: 'optional' });
const optionalSelected = patchCustomerPolicyItem(optional, 'hosting', { default_selected: true });
check(optionalSelected.items[0].mode === 'optional' && optionalSelected.items[0].default_selected === true, 'switching to optional then setting default_selected produces both fields on the SAME entry, not a second one');

const notOffered = patchCustomerPolicyItem(optionalSelected, 'hosting', null);
check(notOffered.items.length === 0, 'a null patch ("Not offered") REMOVES the item\'s own entry entirely rather than storing an explicit excluded record — matches PackageSchema::sanitizeCustomerPolicy()\'s own absent-means-excluded default');
check(findCustomerPolicyItem(notOffered, 'hosting') === null, 'findCustomerPolicyItem confirms the removed entry is genuinely gone, not merely mode: excluded');

const withQuantity = patchCustomerPolicyItem(empty, 'seats', { mode: 'optional', quantity: { default: 2, min: 1, max: 10, step: 1 } });
check(withQuantity.items[0].quantity?.default === 2 && withQuantity.items[0].quantity?.max === 10, 'quantity bounds round-trip exactly as authored');
const quantityCleared = patchCustomerPolicyItem(withQuantity, 'seats', { quantity: null });
check(quantityCleared.items[0].quantity === null, 'clearing the configurable-quantity checkbox nulls the bounds, leaving the item itself untouched (still optional)');

const featured = patchCustomerPolicyItem(empty, 'support', { mode: 'required', featured: true });
check(featured.items[0].featured === true, 'featured is an independent flag, settable alongside mode/quantity with no cross-field coupling');

const otherItemUntouched = patchCustomerPolicyItem(featured, 'seats', { mode: 'optional' });
check(otherItemUntouched.items.length === 2 && otherItemUntouched.items.find((i) => i.item_id === 'support')?.featured === true, 'patching one item_id never disturbs another already-authored entry');

// ── 2. No duplicated mutation logic — the merged row imports the shared pair ─

const poolInclusionsEditorSource = readFileSync(resolve(root, 'resources/ts/package-station/drawer/editors/PoolInclusionsEditor.tsx'), 'utf8');

check(
  poolInclusionsEditorSource.includes("from './customerPolicyFields'") && poolInclusionsEditorSource.includes('patchCustomerPolicyItem') && poolInclusionsEditorSource.includes('findCustomerPolicyItem'),
  'the merged row (PoolInclusionsEditor.tsx) imports the shared patch/find pair — one mutation-logic authority, not a local copy',
);
check(
  !existsSync(resolve(root, 'resources/ts/package-station/drawer/editors/CustomerPolicyEditor.tsx')),
  'the standalone Customer Selection Rules drawer\'s own editor (CustomerPolicyEditor.tsx) is genuinely retired (Phase 3 correction) — its former "rollback/parity surface" purpose is exhausted, not a live second consumer of customerPolicyFields.tsx',
);

// ── 3. Mounted once per selected inclusion item_id, never per Leg
//    assignment, never per Bundle child ────────────────────────────────────

const mergedBlockOccurrences = poolInclusionsEditorSource.match(/<CustomerPolicyItemFields/g) ?? [];
check(mergedBlockOccurrences.length === 1, 'CustomerPolicyItemFields is referenced exactly once in PoolInclusionsEditor.tsx source — mounted from the outer per-row map body, not duplicated per Leg assignment');

const inclusionAssignmentCardBody = poolInclusionsEditorSource.slice(
  poolInclusionsEditorSource.indexOf('function InclusionAssignmentCard'),
  poolInclusionsEditorSource.indexOf('// Pool-referencing Included Features editor'),
);
check(!inclusionAssignmentCardBody.includes('CustomerPolicyItemFields'), 'InclusionAssignmentCard (the component repeated once per Default/Additional Leg assignment) never references CustomerPolicyItemFields itself');

const suppliedContentBlock = poolInclusionsEditorSource.slice(
  poolInclusionsEditorSource.indexOf('{suppliedContent && ('),
  poolInclusionsEditorSource.indexOf('{customerPolicy !== undefined'),
);
check(suppliedContentBlock.includes('cz-ie-sub-item') && !suppliedContentBlock.includes('CustomerPolicyItemFields'), 'the Bundle-backed row\'s own supplied-content sub-list never grows a per-child customer-policy control — a Bundle\'s children are never independently addressable in customer_policy at all');
check(
  poolInclusionsEditorSource.includes('customerPolicy !== undefined && row.resolved'),
  'the merged block gates on the SAME row.resolved filter CustomerPolicyEditor.tsx has always used, so an unresolved Rate Sheet item is never offered customer-policy authoring either',
);

// ── 4. Ordinary Tier/Add-on never receives the controls; a Tier Edition
//    reaches them only through its own explicit eligibility prop ──────────

const useTierModuleEditingSource = readFileSync(resolve(root, 'resources/ts/package-station/drawer/tier/useTierModuleEditing.ts'), 'utf8');
check(
  useTierModuleEditingSource.includes('isComposableOccupant(editingTierId) && d.enabled'),
  'the occupant\'s own merged draft is seeded ONLY when the occupant is composable AND already published (d.enabled)',
);

const tierDrawerContentSource = readFileSync(resolve(root, 'resources/ts/package-station/drawer/tier/TierDrawerContent.tsx'), 'utf8');
check(
  tierDrawerContentSource.includes('customerPolicyEligible={isComposableOccupant(c.editingTierId) && detail.enabled}'),
  'TierDrawerContent computes the Edition switcher\'s customerPolicyEligible with the IDENTICAL isComposableOccupant(...) && enabled formula the occupant\'s own gate uses — never a looser or separate rule',
);

const tierEditionOverviewFieldsSource = readFileSync(resolve(root, 'resources/ts/package-station/drawer/tier/TierEditionOverviewFields.tsx'), 'utf8');
check(
  tierEditionOverviewFieldsSource.includes('customerPolicy={customerPolicyEligible ? (draft.customer_policy ?? null) : undefined}'),
  'Tier Edition\'s own PoolInclusionsEditor call site passes customerPolicy only when customerPolicyEligible is true — undefined (no merged controls rendered) for every non-composable Tier\'s own Edition and for a not-yet-published composable occupant',
);

// ── 5. A customer_policy save failure is never falsely reported as success ─

const saveSectionBody = useTierModuleEditingSource.slice(
  useTierModuleEditingSource.indexOf('const saveSection = async'),
  useTierModuleEditingSource.indexOf('// Return every section to the readable state'),
);
check(
  /if \(ok && customerPolicyDraft !== undefined\) \{\s*const policyResult = await pkg\.saveTierCustomerPolicy\(editingTierId, customerPolicyDraft\);\s*ok = !!policyResult\?\.success;/.test(saveSectionBody),
  'the customer_policy save only runs after a successful Inclusions save (ok gate), and its own result overwrites ok — a failure here fails the whole Save exactly like the tier-overview branch\'s own saveTierOverview-then-setPopularTier chain',
);
check(
  saveSectionBody.lastIndexOf('if (!ok) { setSaveErr(') > saveSectionBody.indexOf('pkg.saveTierCustomerPolicy('),
  'the shared "if (!ok) fail" check runs AFTER the customer_policy save attempt, so a genuine policy-save failure is reported as a failed Save rather than silently swallowed',
);

console.log('Tier Inclusions customer-policy merge contract: PASS');
