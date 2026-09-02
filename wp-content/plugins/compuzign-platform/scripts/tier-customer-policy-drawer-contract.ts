// Correction-round contract — the composable occupant's Customer Selection
// Rules controller as a STANDALONE drawer, not a fifth module of the shared
// Tier drawer/entity (see docs/code-map/tier-composable-occupant-admin-
// customer-policy.md for the full architecture and why the earlier round
// was rejected). Proves, against real exported production code:
//
//   1. TIER_ENTITY (the shared Tier drawer's manifest) carries no
//      customer_policy shell/module — the normal Tier/Add-on drawer is
//      byte-behaviorally unchanged, and its own module count stays at four
//      (tier-system-drawer-contract.ts locks the count itself).
//   2. The composable occupant's own Customer Options card action is
//      gated on `enabled` (published), not a bare occupant_id existence
//      check — present once eligible, absent otherwise, and this gate is
//      applied only to the composable card, never a normal one.
//   3. The standalone drawer's own routing token round-trips and is a
//      genuine sibling of `tier`/`tier-inclusion` (own record-id prefix,
//      own registered drawer key).
//   4. The standalone entity manifest references only the composable
//      occupant's own existing inclusions — no second catalogue/list
//      authority (source-scan of the controller's own rate sheet wiring,
//      same precedent composable-occupant-workspace-contract.ts §5/§6 use
//      for wiring facts a pure function cannot express).
//   5. Save/reopen — drafts.customer_policy's null vs {value:null} unwrap —
//      stays proven by tier-customer-policy-draft-contract.ts, untouched by
//      this round; this file does not duplicate it.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TIER_ENTITY } from '../resources/ts/package-station/drawer/schema/entities/tier';
import { toTierOccupantCard, withComposableCustomerOptionsAction } from '../resources/ts/package-station/surface/tierSurface/tierOccupantCard';
import {
  encodeTierCustomerPolicyDrawerRecordId,
  decodeTierCustomerPolicyDrawerRecordId,
} from '../resources/ts/package-station/drawer/customerPolicy/tierCustomerPolicyDrawerTypes';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Tier customer policy drawer contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');

// ── 1. The shared Tier drawer/entity carries no customer_policy module ─────

check(!('customer_policy' in TIER_ENTITY.shells), 'TIER_ENTITY.shells no longer registers a customer_policy shell — Customer Selection Rules is not a module of the shared Tier drawer/entity');
check(!TIER_ENTITY.placements.drawer?.details.some((slot) => slot.module === 'customer_policy'), "TIER_ENTITY's own Details placement list never names customer_policy");

const tierDrawerContentSource = readFileSync(resolve(root, 'resources/ts/package-station/drawer/tier/TierDrawerContent.tsx'), 'utf8');
check(!tierDrawerContentSource.includes('customer_policy') && !tierDrawerContentSource.includes('customerPolicy'), 'TierDrawerContent.tsx (the shared multi-module Tier screen) carries no customer_policy/customerPolicy reference at all — the earlier round\'s conditional PlacedShell and editing-session branch are fully removed');

// ── 2. The composable card's Customer Options action is gated on `enabled`,
//    never a bare occupant_id existence check, and never leaks onto a
//    normal Tier/Add-on card ───────────────────────────────────────────────

const normalTierCard = toTierOccupantCard({ occupantId: 'occ_basic', slotId: 'basic', view: null, platformStatus: 'disabled' });
check(!normalTierCard.actions.some((a) => a.id === 'customer-options'), 'a normal Tier card never carries the Customer Options action, even before withComposableCustomerOptionsAction is considered');

const composableCardPending = toTierOccupantCard({ occupantId: 'occ_composable', slotId: 'tier_composable', view: null, platformStatus: 'disabled', isSubordinate: true });
const gatedIneligible = withComposableCustomerOptionsAction(composableCardPending, false);
check(gatedIneligible.actions.length === composableCardPending.actions.length, 'an ineligible (not yet published) composable occupant\'s card gains no Customer Options action');
check(!gatedIneligible.actions.some((a) => a.id === 'customer-options'), 'Customer Options is absent from an ineligible composable card');

const gatedEligible = withComposableCustomerOptionsAction(composableCardPending, true);
check(gatedEligible.actions.some((a) => a.id === 'customer-options'), 'Customer Options appears once the composable occupant is genuinely published (eligible: true)');
check(gatedEligible.actions.length === composableCardPending.actions.length + 1, 'Customer Options is additive — View/Edit are unchanged');

const workspaceHookSource = readFileSync(resolve(root, 'resources/ts/package-station/surface/packageTierWorkspace/usePackageTierWorkspace.ts'), 'utf8');
check(workspaceHookSource.includes('withComposableCustomerOptionsAction(') && workspaceHookSource.includes('composableView?.detail.enabled === true'), 'the workspace hook gates the composable card\'s Customer Options action on detail.enabled (platform_status === \'active\'), not occupant_id truthiness');

// ── 3. The standalone drawer's own routing token is a genuine sibling ──────

const encoded = encodeTierCustomerPolicyDrawerRecordId('ti_kairos');
check(encoded === 'tier-customer-policy:ti_kairos', 'the routing token carries only the instance id — one composable occupant per instance, no slot/occupant id needed');
check(decodeTierCustomerPolicyDrawerRecordId(encoded)?.instanceId === 'ti_kairos', 'the routing token round-trips');
check(decodeTierCustomerPolicyDrawerRecordId('tier-inclusion:ti_kairos:basic:item_1') === null, 'a foreign drawer\'s own token is rejected, not misread');
check(decodeTierCustomerPolicyDrawerRecordId('tier-customer-policy:') === null, 'an empty instance id is rejected');

const registerSource = readFileSync(resolve(root, 'resources/ts/package-station/register.ts'), 'utf8');
check(registerSource.includes("key: 'tier-customer-policy'"), 'the standalone drawer is registered under its own key, a sibling of \'tier\'/\'tier-inclusion\', not a variant of either');
check(registerSource.includes('TierCustomerPolicyDrawerHost'), 'the registered key mounts its own host, not TierDrawerHost');

const bindingSource = readFileSync(resolve(root, 'resources/ts/admin-station/register.ts'), 'utf8');
check(bindingSource.includes("id: 'customer-options', target: 'drawer', mode: 'view', drawerTemplateKey: 'tier-customer-policy'"), "the tier-workspace surface's own action intent routes 'customer-options' to the standalone drawer key, never the base 'tier' binding");

// ── 4. No second inclusion catalogue/list authority ─────────────────────────

const controllerSource = readFileSync(resolve(root, 'resources/ts/package-station/drawer/customerPolicy/useTierCustomerPolicyDrawerController.ts'), 'utf8');
check(controllerSource.includes('buildRateSheetCatalogue(pkg.service, detail.rate_sheet_id, detail.rate_sheet_selections)'), 'the standalone controller resolves rows through the occupant\'s OWN rate_sheet_id/rate_sheet_selections via the shared pure buildRateSheetCatalogue — the same builder the shared Tier drawer\'s Features module reads, not a second lookup');
check(controllerSource.includes("pkg.tierView(COMPOSABLE_TIER_ID)"), 'the controller reads the composable occupant through the same sentinel-routed usePackageStation.tierView every other composable consumer uses');

console.log('Tier customer policy drawer contract: PASS');
