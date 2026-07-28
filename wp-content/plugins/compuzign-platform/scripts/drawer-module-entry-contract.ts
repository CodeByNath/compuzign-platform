// Contract: the drawer module ENTRY rule — platform-wide, for every drawer that
// presents modules, including every future one.
//
// One cycle, no exceptions:
//
//   the drawer opens on its Overview screen
//     → the module is readable, even when it is empty
//     → the module carries its own status pill from the shared 5-state vocabulary
//     → the pill opens that module's notification panel, which states what is missing
//     → the module offers Edit
//     → only Edit opens the module's inline editor
//
// A drawer may NOT greet the reader with an explanation block above its modules,
// and may NOT open an editor as its entry state — not for an empty record, and
// not for one that does not exist yet. An empty module plus its pill IS the
// guidance; a prose block above it duplicates the pill and drifts from it.
//
// Verified two ways: the real derivations are executed (status, pill, notes), and
// the compositions are read for the wiring those derivations need.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PILL_META } from '../resources/ts/drawer-kit/schema/presentation';
import type { ModuleState } from '../resources/ts/drawer-kit/utils/moduleNotifications';
import {
  evaluateModule,
  packageFamilyCapabilitiesModule,
  packageFamilyOverviewModule,
  packageFamilyRelationshipsModule,
  packageManagerItemModule,
  rateSheetCollectionModule,
  tierFaqsModule,
  tierFeaturesModule,
  tierOverviewModule,
  tierRateSheetAccessModule,
} from '../resources/ts/drawer-kit/utils/moduleNotifications';
import type { ShellSchema } from '../resources/ts/drawer-kit/schema/types';
import {
  categoryOverviewShell,
  categoryServicesShell,
} from '../resources/ts/entity-drawers/schema/bindings/category';
import {
  serviceFaqsShell,
  serviceInclusionsShell,
  serviceOverviewShell,
  servicePackageSummaryShell,
} from '../resources/ts/service-station/drawer/schema/bindings/service';
import {
  packageFamilyCapabilitiesShell,
  packageFamilyOverviewShell,
  packageFamilyRelationshipsShell,
} from '../resources/ts/package-station/drawer/schema/bindings/packageFamily';
import {
  tierFaqsShell,
  tierFeaturesShell,
  tierOverviewShell,
} from '../resources/ts/package-station/drawer/schema/bindings/tier';
import { tierInclusionOverviewShell } from '../resources/ts/package-station/drawer/schema/bindings/tierInclusion';
import { tierRateSheetAccessShell } from '../resources/ts/package-station/drawer/schema/bindings/tierInstance';

const root = resolve(import.meta.dirname, '..');

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Drawer module entry contract: ${message}`);
}

function source(path: string): string {
  return readFileSync(resolve(root, path), 'utf8');
}

// ── Every declared shell, so a new one is covered the day it is written ────────

const SHELLS: Array<[string, ShellSchema<any>]> = [
  ['Category Overview', categoryOverviewShell],
  ['Category Services', categoryServicesShell],
  ['Service Overview', serviceOverviewShell],
  ['Service Inclusions', serviceInclusionsShell],
  ['Service Package Summary', servicePackageSummaryShell],
  ['Service FAQs', serviceFaqsShell],
  ['Family Overview', packageFamilyOverviewShell],
  ['Family Relationships', packageFamilyRelationshipsShell],
  ['Family Capabilities', packageFamilyCapabilitiesShell],
  ['Tier Overview', tierOverviewShell],
  ['Tier Features', tierFeaturesShell],
  ['Tier FAQs', tierFaqsShell],
  ['Tier Inclusion Overview', tierInclusionOverviewShell],
  ['Tier System Rate Sheet Access', tierRateSheetAccessShell],
];

// An editable module is always reachable from its readable card, and a card that
// advertises Edit always has an editor behind it. Neither half may exist alone:
// an editor with no Edit action can only be entered by opening it on arrival —
// the exact thing this contract forbids.
for (const [name, shell] of SHELLS) {
  const advertisesEdit = shell.footer.actions.includes('edit');
  if (shell.editor) {
    check(!!shell.actions.edit, `${name} declares an editor, so it must declare an Edit action`);
    check(advertisesEdit, `${name} declares an editor, so Edit must be in its Footer Group`);
  }
  if (advertisesEdit) {
    check(!!shell.editor, `${name} advertises Edit, so it must declare the editor Edit opens`);
  }
}

// ── The entry state of every module a drawer can open empty ───────────────────
// Each must resolve INSIDE the pill vocabulary — reaching Pending through the
// unknown-status fallback is not following the contract, it is missing it — and
// must carry at least one note, because the pill is the only guidance an empty
// module gets.

const EMPTY_TIER_SLOT = { enabled: false, price: null, billing_cycle: null, contact: false };

const ENTRY_STATES: Array<[string, ModuleState]> = [
  [
    'Tier Overview, empty fixed slot',
    evaluateModule(tierOverviewModule, EMPTY_TIER_SLOT, { platformStatus: 'disabled' }),
  ],
  [
    'Included Features, empty fixed slot',
    evaluateModule(tierFeaturesModule, { count: 0 }, {
      platformStatus: 'disabled', parentReady: false, parentLabel: 'Tier Overview',
    }),
  ],
  [
    'Common Questions, empty fixed slot',
    evaluateModule(tierFaqsModule, { count: 0 }, {
      platformStatus: 'disabled', parentReady: false, parentLabel: 'Tier Overview',
    }),
  ],
  [
    // Tier creation (tier-instance:new) renders this exact module in this exact
    // empty state — it mints no bespoke "before registration" shape of its own.
    'Tier Overview, before creation',
    evaluateModule(tierOverviewModule, EMPTY_TIER_SLOT, { platformStatus: 'disabled' }),
  ],
  [
    'Family Overview, before creation',
    evaluateModule(packageFamilyOverviewModule, { name: '', description: '' }, {
      platformStatus: 'disabled', moduleTransition: 'not-configured', platformLabel: 'Package Family',
    }),
  ],
  [
    'Rate Sheets, empty pool',
    evaluateModule(rateSheetCollectionModule, { count: 0 }, {
      platformStatus: 'disabled', platformLabel: 'Rate Sheet',
    }),
  ],
];

for (const [name, state] of ENTRY_STATES) {
  const pill = PILL_META[state.status];
  check(pill !== undefined, `${name} resolves ${state.status}, which is outside the pill vocabulary`);
  check(pill.label === 'Pending', `${name} reads ${pill.label} while empty; an empty module is Pending`);
  check(state.notes.length > 0, `${name} carries no note, so its pill would open nothing`);
}

// ── Disabled is a user action, never a derivation ─────────────────────────────
// A module reads Disabled only from an explicit per-record disable signal — the
// one the drawer footer's enable/disable control writes. It may NEVER infer it
// from a record that has simply never been activated.
//
// This matters most where the record layer cannot tell the two apart. A Package
// Family has no `draft` state (`'active' | 'disabled' | 'archived' | 'trashed'`),
// so a Family created and never activated is stored `disabled` exactly like one
// an operator switched off. Inferring a Disabled pill from that told brand-new
// records they had been turned off, and contradicted the footer offering to
// enable them.

const NEVER_ACTIVATED = { platformStatus: 'disabled', moduleTransition: 'settled' } as const;

const DERIVED: Array<[string, ModuleState]> = [
  [
    'Family Overview',
    evaluateModule(packageFamilyOverviewModule, { name: 'Managed Care', description: 'Care plans.' }, NEVER_ACTIVATED),
  ],
  [
    'Family Relationships',
    evaluateModule(packageFamilyRelationshipsModule, { services: 2, rateSheetRows: 1, tierSelections: 0 }, NEVER_ACTIVATED),
  ],
  [
    'Family Capabilities',
    evaluateModule(packageFamilyCapabilitiesModule, { tier: { enabled: false } }, NEVER_ACTIVATED),
  ],
  [
    'Rate Sheets',
    evaluateModule(rateSheetCollectionModule, { count: 3 }, NEVER_ACTIVATED),
  ],
  [
    'Tier Overview',
    evaluateModule(tierOverviewModule, { enabled: true, price: 25, billing_cycle: 'monthly', contact: false }, NEVER_ACTIVATED),
  ],
];

for (const [name, state] of DERIVED) {
  check(
    state.status !== 'disabled',
    `${name} reads Disabled for a record nobody disabled; Disabled is the footer's action, not a derivation`,
  );
}

// The other half of the same rule: an EXPLICIT disable does read Disabled, so the
// pill agrees with the footer instead of hiding what the operator did.
check(
  evaluateModule(tierOverviewModule, { enabled: false, price: 25, billing_cycle: 'monthly', contact: false }, {
    platformStatus: 'active',
  }).status === 'disabled',
  'an explicitly disabled Tier reads Disabled',
);
check(
  evaluateModule(packageManagerItemModule, {
    item_id: 'i1', module_transition: 'settled', disabled: true, missing: false,
  } as never, { platformStatus: 'active' }).status === 'disabled',
  'an explicitly disabled Package Manager item reads Disabled',
);

// A settled/complete record must leave Pending behind, or the pill is decoration.
check(
  PILL_META[evaluateModule(tierOverviewModule, { enabled: true, price: 25, billing_cycle: 'monthly', contact: false }, {
    platformStatus: 'active',
  }).status]?.label === 'Active',
  'a settled Tier (created or otherwise) reads Active, not Pending forever',
);
check(
  PILL_META[evaluateModule(rateSheetCollectionModule, { count: 2 }, { platformStatus: 'active' }).status]?.label
    === 'Active',
  'a stocked Rate Sheet pool reads Active',
);

const validAccessState = evaluateModule(tierRateSheetAccessModule, {
  activeCount: 2,
  allowedActiveCount: 1,
  unresolvedCount: 0,
}, { platformStatus: 'active' });
check(
  validAccessState.status === 'active' && validAccessState.notes.length === 0,
  'valid Rate Sheet access reads Active with no irrelevant parent-lifecycle note',
);
const invalidAccessState = evaluateModule(tierRateSheetAccessModule, {
  activeCount: 2,
  allowedActiveCount: 0,
  unresolvedCount: 1,
}, { platformStatus: 'active' });
check(
  invalidAccessState.status === 'pending-full' && invalidAccessState.notes.length === 2,
  'Rate Sheet access needing review reads Pending and explains both unusable access and unresolved references',
);

// ── The compositions that open these modules ─────────────────────────────────
// Each opens readable and wires the panel its pill needs. `useState(false)` is
// the entry state itself: `useState(true)` here means the drawer opens in its
// editor, which is the defect this contract exists to prevent.

// Tier system creation (tier-instance:new) is not a bespoke registration
// composition — TierCreateContent renders the SAME TIER_ENTITY (Tier Overview /
// Included Features / Common Questions) an existing occupant does, entering its
// one editable module through Edit exactly like every other module-entry
// surface.
const tierCreate = source('resources/ts/package-station/drawer/tier/TierCreateContent.tsx');
const tierCreateHookForEntry = source('resources/ts/package-station/drawer/tier/useTierCreate.ts');
check(
  tierCreateHookForEntry.includes('useState<TierOverviewEditDraft | null>(null)'),
  'Tier creation opens readable — its one editable module starts with no edit session',
);
check(
  tierCreate.includes('openPanel={openPanel}') && tierCreate.includes('onTogglePanel={(module) =>'),
  'Tier creation wires its module\'s notification panel, so the pill can open it',
);
check(
  tierCreate.includes('onCancel: tc.cancelSection'),
  'Tier creation returns Cancel to the readable module rather than closing the drawer',
);

// Package Family creation (the 'new' recordId) is not a bespoke create
// composition either — it is the SAME usePackageFamilyDrawerController /
// PackageFamilyDrawerContent an existing Family uses.
const familyDrawerController = source('resources/ts/package-station/drawer/package-family/usePackageFamilyDrawerController.ts');
check(
  familyDrawerController.includes('const [editing, setEditing] = useState(false)'),
  'Family creation opens readable, never in its editor',
);
const familyDrawerContent = source('resources/ts/package-station/drawer/package-family/PackageFamilyDrawerContent.tsx');
check(
  familyDrawerContent.includes('onTogglePanel={(module) => c.setOpenPanel('),
  'Family creation wires its module\'s notification panel, so the pill can open it',
);
const cancelEditBody = familyDrawerController.slice(
  familyDrawerController.indexOf('const cancelEdit'),
  familyDrawerController.indexOf('const saveOverview'),
);
check(
  cancelEditBody.includes('setEditing(false)'),
  'Family creation returns Cancel to the readable module rather than closing the drawer',
);

const instanceSettings = source('resources/ts/package-station/drawer/tier/TierInstanceSettingsContent.tsx');
check(
  instanceSettings.includes('useState<TierRateSheetAccessDraft | null>(null)')
    && instanceSettings.includes("handlers: { edit: () => setDraft(")
    && instanceSettings.includes('onCancel: () => setDraft(null)'),
  'Tier-system Rate Sheet access opens readable, enters through Edit, and Cancel returns readable',
);
check(
  instanceSettings.includes("platformStatus: 'active'")
    && !instanceSettings.includes('platformStatus: record.status'),
  'the access module uses its own resolved-policy context rather than inheriting Tier-instance lifecycle notes',
);
check(
  instanceSettings.includes('bridge.setFooter(editing ? null : (')
    && instanceSettings.includes('<EntityActionFooter'),
  'the instance drawer withdraws its Close footer while InlineEditorShell owns Save and Cancel',
);
const accessEditor = source('resources/ts/package-station/drawer/editors/TierRateSheetAccessEditor.tsx');
for (const forbidden of ['InlineEditorShell', 'EntityActionFooter', 'cz-drawer-actions', 'updateInstance', 'api.']) {
  check(!accessEditor.includes(forbidden), `the Rate Sheet access field editor owns no ${forbidden}`);
}

// The Rate Sheet collection renders through ReadBlock rather than a shell, so it
// must pass the same three things explicitly.
const rateSheetTool = source('resources/ts/package-station/presentation/rate-sheet-tool/RateSheetTool.tsx');
check(
  rateSheetTool.includes('rateSheetCollectionModule') && rateSheetTool.includes('evaluateModule('),
  'the Rate Sheets module resolves its status through the shared module engine',
);
check(
  rateSheetTool.includes('onTogglePanel:') && rateSheetTool.includes('notes:'),
  'the Rate Sheets module passes its notes and panel toggle to ReadBlock',
);

// No launcher may open a drawer straight into its editor. Creation intents are
// ordinary `view` opens; the module's Edit does the rest.
const adminRegister = source('resources/ts/admin-station/register.ts');
check(
  adminRegister.includes("{ id: 'create-rate-sheet', target: 'drawer', mode: 'view', drawerTemplateKey: 'rate-sheet' }"),
  'Create Rate Sheet opens the Rate Sheet drawer readable, not in its editor',
);

// The Family create surface renders the Family's OWN module — literally
// PACKAGE_FAMILY_ENTITY, the same entity an existing Family's drawer uses — so
// the two can never drift: no second hand-authored copy of those fields, and
// no bare stage screens standing in for the module.
const familyRecordForEntry = source('resources/ts/package-station/surface/packageFamily/usePackageFamilyRecord.ts');
check(
  familyRecordForEntry.includes("recordId === 'new'") && familyRecordForEntry.includes('NEW_PACKAGE_FAMILY_SEED'),
  'Package Family creation resolves the stable \'new\' recordId to a local empty record, not a second entity',
);
for (const [name, source_] of [
  ['usePackageFamilyRecord', familyRecordForEntry],
  ['usePackageFamilyDrawerController', familyDrawerController],
] as const) {
  check(
    !source_.includes('cz-tf-input') && !source_.includes('cz-tf-textarea'),
    `${name} hand-authors no field markup of its own`,
  );
  check(
    !source_.includes('Package Family saved'),
    `${name} reports the save through the settled module, not a stage screen`,
  );
}

// The empty fixed slot that this rule was first derived from keeps its entry
// behaviour. `package-tier-workspace` owns that surface in detail; this is the
// platform-wide half of the same rule.
const tierDrawerHost = source('resources/ts/package-station/surface/tierSurface/TierDrawerHost.tsx');
check(
  tierDrawerHost.includes("slotTarget === null ? 'tier-overview' : undefined"),
  'an empty Tier slot opens readable, whichever mode dispatched it',
);
const tierDrawer = source('resources/ts/package-station/drawer/tier/TierDrawerContent.tsx');
check(
  !tierDrawer.includes('cz-tier-drawer-setup'),
  'the Tier drawer presents no explanation block above its modules',
);

console.log(`Drawer module entry contract passed: ${SHELLS.length} shells, ${ENTRY_STATES.length} entry states.`);
