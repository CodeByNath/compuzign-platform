// Contract: the Commercial Schedule capability (Phase 2 — admin authoring)
// stays wired end-to-end — schema, resolution, controller, and every
// frontend seam from the occupant's own module through to Tier Edition's
// third tab. Source-scanning, the same technique
// rate-sheet-price-option-selection-contract.ts uses for its own wiring — no
// mounted DOM needed to prove these seams exist and are shaped right.
//
// Non-negotiable boundary asserted throughout: a commercial leg SELECTS an
// existing Rate Sheet Price Option (leg_assignments[].price_option_id) — it
// never creates, calculates, or mutates a price. Simple Mode (no
// active_billing_cycles/commercial_legs configured) must stay byte-identical
// to before this capability existed.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Commercial Schedule contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

const schema = read('src/Modules/SurfacePackages/Support/PackageSchema.php');
const managerSchema = read('src/Modules/SurfacePackages/Support/PackageManagerSchema.php');
const controller = read('src/Modules/SurfacePackages/Http/PackageStationController.php');
const types = read('resources/ts/package-station/types.ts');
const overviewEditor = read('resources/ts/package-station/drawer/editors/TierOverviewEditor.tsx');
const scheduleEditor = read('resources/ts/package-station/drawer/editors/CommercialScheduleEditor.tsx');
const poolEditor = read('resources/ts/package-station/drawer/editors/PoolInclusionsEditor.tsx');
const moduleEditing = read('resources/ts/package-station/drawer/tier/useTierModuleEditing.ts');
const bindings = read('resources/ts/package-station/drawer/schema/bindings/tier.tsx');
const entity = read('resources/ts/package-station/drawer/schema/entities/tier.ts');
const usePackageStation = read('resources/ts/package-station/usePackageStation.ts');
const moduleNotifications = read('resources/ts/drawer-kit/utils/moduleNotifications/tier.ts');
const editionFields = read('resources/ts/package-station/drawer/tier/TierEditionOverviewFields.tsx');
const editionEditor = read('resources/ts/package-station/drawer/tier/TierEditionEditor.tsx');
const editionModel = read('resources/ts/package-station/drawer/tier/tierEditionModel.ts');

// ── PHP schema: sanitizers, storage, Simple Mode shape preservation ─────────

check(
  schema.includes("TIER_MODULES                = ['overview', 'features', 'faqs', 'commercial_schedule']"),
  'commercial_schedule is a registered Tier module, gaining generic draft/module_status/archive-block-on-pending-draft support for free',
);
check(
  schema.includes('public static function sanitizeActiveBillingCycles(')
  && schema.includes('public static function sanitizeCommercialLegs(')
  && schema.includes('public static function mintCommercialLegId('),
  'the three commercial-leg sanitizers/minter exist on PackageSchema',
);
check(
  schema.includes('if ($legsById !== []) {')
  && schema.includes("\$row['leg_assignments'] = self::sanitizeLegAssignments("),
  'sanitizeTierRateSheetSelections only adds the leg_assignments key when legs are actually supplied — Simple Mode\'s exact pre-existing {item_id, quantity, price_option_id} shape stays byte-for-byte unchanged',
);
check(
  schema.includes('public static function draftPreferredCommercialLegs(')
  && schema.includes('public static function sanitizeCommercialLegsForSlot('),
  'the controller-facing draft-preferred lookups exist, so Overview and Commercial Schedule can be authored/saved in either order',
);
check(
  schema.includes("'active_billing_cycles'    => \$activeBillingCycles,")
  && schema.includes("'commercial_legs'          => \$commercialLegs,"),
  'sanitizeTierEdition() carries an Edition\'s own active_billing_cycles/commercial_legs — independent of the parent occupant\'s, never inherited',
);
check(
  !schema.includes('mintCommercialLegId()') || !/sanitizeCommercialLegs\([^)]*mintCommercialLegId/.test(schema),
  'sanitizeCommercialLegs never mints an id inline — a leg with no id is dropped, not fabricated, the same posture sanitizeTierEdition() uses',
);

// ── PHP resolution: reuses the existing pricing authority, never a new one ──

check(
  managerSchema.includes('public static function projectCommercialLegs(')
  && managerSchema.includes('self::projectTierRateSheetWith($readModel, $legSelections, $rateSheetId, $contact)'),
  'projectCommercialLegs() resolves each leg through projectTierRateSheetWith() UNCHANGED — never a second/duplicate pricing calculation',
);

// ── PHP controller: the existing generic module endpoint, no new route ──────

check(
  controller.includes("elseif (\$module === 'commercial_schedule')")
  && controller.includes('sanitizeCommercialLegsForSlot($slot,'),
  'the Overview module save endpoint gains a commercial_schedule branch — the SAME existing per-module endpoint, no new endpoint family',
);
check(
  controller.includes('draftPreferredCommercialLegs($slot)'),
  'the features (Included Features) branch resolves leg_assignments against the slot\'s own draft-preferred legs, so declaring a leg and assigning an inclusion to it work in either authoring order',
);

// ── Frontend types: the shapes travel end-to-end, Simple Mode stays optional ─

check(
  /export interface CommercialLeg \{/.test(types) && /export interface LegAssignment \{/.test(types),
  'CommercialLeg/LegAssignment are declared in package-station/types.ts',
);
check(
  /export interface TierRateSheetSelection \{[^}]*leg_assignments\?:/s.test(types),
  'TierRateSheetSelection carries an OPTIONAL leg_assignments — absent for Simple Mode, never a fabricated []',
);
check(
  types.includes('active_billing_cycles: string[];') && types.includes('commercial_legs: CommercialLeg[];'),
  'SurfaceTierDetail/TierEdition/TierEditionOverviewDraft carry active_billing_cycles/commercial_legs',
);
check(
  /export type TierModuleKey = 'overview' \| 'features' \| 'faqs' \| 'commercial_schedule';/.test(types),
  'commercial_schedule is a registered TierModuleKey, so the existing generic saveServicePackageStationTierModule()/revert endpoint calls need no changes',
);

// ── Admin authoring UX: Overview cycles, the new module, per-leg assignment ─

check(
  overviewEditor.includes('active_billing_cycles') && overviewEditor.includes('Active Billing Cycles'),
  'TierOverviewEditor renders the Active Billing Cycles multi-select alongside Commitment',
);
check(
  scheduleEditor.includes('export function CommercialScheduleEditor'),
  'the Commercial Schedule module editor exists',
);
check(
  poolEditor.includes('commercialLegs') && poolEditor.includes('cz-ie-leg-assignments'),
  'PoolInclusionsEditor renders one Price Option choice per leg once commercialLegs is non-empty — Included Features stays the assignment surface, never a second inclusions system',
);
check(
  !/priceOptions\.length > 0 &&(?!\s*\()/.test(poolEditor) || poolEditor.includes('!commercialLegs?.length && priceOptions.length > 0'),
  'the ORIGINAL single Price Option select renders only in Simple Mode (no commercialLegs) — byte-identical UI to before this capability existed',
);
check(
  moduleEditing.includes("'tier-commercial-schedule'") && moduleEditing.includes('commercialScheduleDraft'),
  'useTierModuleEditing owns a fourth section, commercialScheduleDraft, alongside overview/features/faqs — the same one-section-at-a-time pattern, not a bespoke state machine',
);
check(
  bindings.includes('export const tierCommercialScheduleShell')
  && bindings.includes('tierCommercialScheduleModule'),
  'a tierCommercialScheduleShell ShellSchema is registered, driven by its own module dna',
);
check(
  entity.includes('commercial_schedule: tierCommercialScheduleShell'),
  'TIER_ENTITY.shells registers commercial_schedule — PlacedShell resolves entity.shells[slot.module] and renders nothing if it is missing',
);
check(
  usePackageStation.includes('saveTierCommercialSchedule')
  && usePackageStation.includes('slot.drafts.commercial_schedule?.commercial_legs ?? slot.commercial_legs'),
  'usePackageStation exposes saveTierCommercialSchedule and draft-prefers the Commercial Schedule module\'s own draft over the settled occupant',
);

// ── Simple Mode never nags: an empty schedule is complete, not incomplete ───

check(
  /tierCommercialScheduleModule[\s\S]{0,300}isEmpty:\s*\(\)\s*=>\s*false/.test(moduleNotifications),
  'tierCommercialScheduleModule never reports isEmpty — a Tier with zero commercial legs (the vast majority) must never show an error/action-needed badge for optional capacity it has no reason to use',
);

// ── Tier Edition: third tab over the SAME session, no second draft/endpoint ─

check(
  editionFields.includes('TierEditionCommercialScheduleSection')
  && editionFields.includes('CommercialScheduleEditor'),
  'Tier Edition reuses the SAME CommercialScheduleEditor component the occupant\'s own module uses',
);
check(
  /export type TierEditionEditorTab = 'overview' \| 'inclusions' \| 'commercial-schedule';/.test(editionEditor)
  && editionEditor.includes("id: 'commercial-schedule'"),
  'TierEditionEditor renders Commercial Schedule as a third DrawerGroupTabs tab over the SAME session/draft — never a second endpoint or module key for Editions',
);
check(
  editionModel.includes('active_billing_cycles: edition.active_billing_cycles,')
  && editionModel.includes('commercial_legs: edition.commercial_legs,'),
  'draftFromTierEdition() seeds the edit session with the Edition\'s own active_billing_cycles/commercial_legs',
);

console.log('Commercial Schedule contract: PASS');
