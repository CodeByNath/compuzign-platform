// ModuleState parity harness (Schema architecture S2 — permanent).
//
// Bundles the Station DNA engine (utils/moduleNotifications/, organised by
// domain with an export-preserving barrel) and evaluates every exported ModuleDefinition against
// a fixed fixture matrix. The resulting { status, notes } outputs are written
// to scripts/__snapshots__/module-state.v1.json on first run and compared
// byte-for-byte on every later run — any schema-phase change that alters DNA
// behaviour fails this script.
//
// Usage:  node scripts/module-state-snapshot.mjs            (compare; exit 1 on drift)
//         node scripts/module-state-snapshot.mjs --update   (rewrite baseline)

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require   = createRequire(import.meta.url);
const { build } = require('esbuild'); // vite's own esbuild — no new dependency

const root    = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-module-state-bundle.mjs');
const snapFile = resolve(root, 'scripts/__snapshots__/module-state.v1.json');

mkdirSync(dirname(outFile), { recursive: true });

await build({
  entryPoints: [resolve(root, 'resources/ts/drawer-kit/utils/moduleNotifications/index.ts')],
  bundle: true,
  format: 'esm',
  outfile: outFile,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  alias: { '@': resolve(root, 'resources/ts') },
  logLevel: 'silent',
});

const dna = await import(pathToFileURL(outFile).href);

// ── Fixture matrix ────────────────────────────────────────────────────────────
// Deterministic inputs per ModuleDefinition; contexts cover the engine flow:
// parent gate → empty prompt → problems → lifecycle tail.

const svc = (over = {}) => ({
  title: 'Cloud Backup', excerpt: '', content: 'Managed backup.',
  categories: [{ id: 3, name: 'Storage', slug: 'storage' }],
  ...over,
});
const draft = (over = {}) => ({
  title: 'Cloud Backup', excerpt: '', content: 'Managed backup.', category_ids: [3],
  ...over,
});
const cat = (over = {}) => ({
  name: 'Cloud Solutions', description: 'All cloud services.', slug: 'cloud-solutions',
  ...over,
});

const CTX = {
  activeSettled:   { platformStatus: 'active',   moduleTransition: 'settled' },
  activePending:   { platformStatus: 'active',   moduleTransition: 'pending', hasDraft: true },
  disabledSettled: { platformStatus: 'disabled', moduleTransition: 'settled' },
  notConfigured:   { platformStatus: 'disabled', moduleTransition: 'not-configured' },
  parentBlocked:   { platformStatus: 'active',   parentReady: false, parentLabel: 'Tier Overview' },
  parentReady:     { platformStatus: 'active',   parentReady: true },
  parentReadyOff:  { platformStatus: 'disabled', parentReady: true },
};

// Contexts carrying the entity's own platformLabel, so the baseline records the
// wording each surface really shows in its lifecycle tail rather than the
// engine's 'service' default.
const labelled = (ctx, platformLabel) => ({ ...ctx, platformLabel });

const cases = [
  ['overview.complete.active',    dna.overviewModule, { service: svc() },                                        CTX.activeSettled],
  ['overview.complete.pending',   dna.overviewModule, { service: svc(), draft: draft() },                        CTX.activePending],
  ['overview.incomplete',         dna.overviewModule, { service: svc({ title: '', content: '' }) },              CTX.activeSettled],
  ['overview.draft.incomplete',   dna.overviewModule, { service: svc(), draft: draft({ category_ids: [] }) },    CTX.activePending],
  ['overview.notconfigured',      dna.overviewModule, { service: svc({ title: '', content: '', categories: [] }) }, CTX.notConfigured],

  // inclusions/faqs have no resolveStatus, so their snapshot status is always the
  // evaluateModule default ('pending-dim'); the notes are the meaningful signal.
  // UI presentation status for these modules is resolved by the caller.
  ['inclusions.empty',            dna.inclusionsModule, [],                                                      CTX.activeSettled],
  ['inclusions.unlabelled',       dna.inclusionsModule, [{ id: 'a', label: '' }, { id: 'b', label: 'SSL' }],     CTX.activeSettled],
  ['inclusions.complete.draft',   dna.inclusionsModule, [{ id: 'a', label: 'SSL' }],                             CTX.activePending],
  ['inclusions.complete.offline', dna.inclusionsModule, [{ id: 'a', label: 'SSL' }],                             CTX.disabledSettled],

  ['faqs.empty',                  dna.faqsModule, [],                                                            CTX.activeSettled],
  ['faqs.gaps',                   dna.faqsModule, [{ id: 'f1', question: '', answer: 'Yes' }, { id: 'f2', question: 'How?', answer: '' }], CTX.activeSettled],
  ['faqs.complete',               dna.faqsModule, [{ id: 'f1', question: 'How?', answer: 'Easily.' }],           CTX.activeSettled],

  ['package.null',                dna.packageModule, null,                                                       CTX.activeSettled],
  ['package.unconfigured',        dna.packageModule, { platform_status: 'active', tiers: { basic: { configured: false } } }, CTX.activeSettled],
  ['package.configured',          dna.packageModule, { platform_status: 'active', tiers: { basic: { configured: true } } },  CTX.activeSettled],

  ['tier.undefined',              dna.tierModule, undefined,                                                     CTX.activeSettled],
  ['tier.partial',                dna.tierModule, { enabled: true, price: 10, billing_cycle: null, contact: false }, CTX.activeSettled],
  ['tier.disabled',               dna.tierModule, { enabled: false, price: 10, billing_cycle: 'monthly', contact: false }, CTX.activeSettled],
  ['tier.complete',               dna.tierModule, { enabled: true, price: 10, billing_cycle: 'monthly', contact: false },  CTX.activeSettled],

  ['tierOverview.empty',          dna.tierOverviewModule, undefined,                                             CTX.activeSettled],
  ['tierOverview.complete',       dna.tierOverviewModule, { enabled: true, price: 25, billing_cycle: 'monthly', contact: false }, CTX.activeSettled],

  ['tierFeatures.blocked',        dna.tierFeaturesModule, { count: 3 },                                          CTX.parentBlocked],
  ['tierFeatures.empty',          dna.tierFeaturesModule, { count: 0 },                                          CTX.parentReady],
  ['tierFeatures.active',         dna.tierFeaturesModule, { count: 3 },                                          CTX.parentReady],
  ['tierFeatures.offline',        dna.tierFeaturesModule, { count: 3 },                                          CTX.parentReadyOff],

  ['tierFaqs.blocked',            dna.tierFaqsModule, { count: 2 },                                              CTX.parentBlocked],
  ['tierFaqs.active',             dna.tierFaqsModule, { count: 2 },                                              CTX.parentReady],

  ['promoOverview.undefined',     dna.promotionOverviewModule, undefined,                                        CTX.activeSettled],
  ['promoOverview.unnamed',       dna.promotionOverviewModule, { name: '', price: null, billing_label: '' },     CTX.activeSettled],
  ['promoOverview.billing',       dna.promotionOverviewModule, { name: 'Summer', price: 9, billing_label: '' },  CTX.activeSettled],
  ['promoOverview.pending',       dna.promotionOverviewModule, { name: 'Summer', price: 9, billing_label: '/mo' }, CTX.activePending],
  ['promoOverview.active',        dna.promotionOverviewModule, { name: 'Summer', price: 9, billing_label: '/mo' }, CTX.activeSettled],

  // ── Category modules (S6) ──────────────────────────────────────────────────
  // categoryOverviewModule — the canonical 5-state resolution (blueprint D4).
  ['categoryOverview.complete.active',   dna.categoryOverviewModule, cat(),                              CTX.activeSettled],
  ['categoryOverview.complete.pending',  dna.categoryOverviewModule, cat(),                              CTX.activePending],
  ['categoryOverview.incomplete',        dna.categoryOverviewModule, cat({ description: '' }),           CTX.activeSettled],
  ['categoryOverview.notconfigured',     dna.categoryOverviewModule, cat({ name: '', description: '' }), CTX.notConfigured],
  ['categoryOverview.platformInactive',  dna.categoryOverviewModule, cat(),                              CTX.disabledSettled],
  ['categoryServices.empty',             dna.categoryServicesModule, { total: 0, active: 0, disabled: 0 }, CTX.activeSettled],
  ['categoryServices.offline',           dna.categoryServicesModule, { total: 2, active: 1, disabled: 1 }, CTX.disabledSettled],
  ['categoryGroupOverview.complete',     dna.serviceCategoryGroupOverviewModule, { name: 'Cloud', description: 'All cloud.' }, CTX.activeSettled],
  ['categoryGroupOverview.unnamed',      dna.serviceCategoryGroupOverviewModule, { name: '', description: '' }, CTX.notConfigured],

  // ── Package Family modules ────────────────────────────────────────────────
  // A module never infers Disabled. A Family has no `draft` state, so a
  // never-activated Family is stored `disabled` exactly like one an operator
  // switched off; both read Pending here, and the record footer owns the
  // enable/disable action. `*.neverActivated` is the case that regression-guards
  // it.
  ['familyOverview.complete.active',      dna.packageFamilyOverviewModule, { name: 'Managed Care', description: 'Care plans.' }, labelled(CTX.activeSettled, 'Package Family')],
  ['familyOverview.complete.pending',     dna.packageFamilyOverviewModule, { name: 'Managed Care', description: '' }, labelled(CTX.activePending, 'Package Family')],
  ['familyOverview.neverActivated',       dna.packageFamilyOverviewModule, { name: 'Managed Care', description: '' }, labelled(CTX.disabledSettled, 'Package Family')],
  ['familyOverview.unnamed',              dna.packageFamilyOverviewModule, { name: '', description: '' },  labelled(CTX.notConfigured, 'Package Family')],
  ['familyRelationships.empty',           dna.packageFamilyRelationshipsModule, { services: 0, rateSheetRows: 0, tierSelections: 0 }, labelled(CTX.activeSettled, 'Package Family')],
  ['familyRelationships.neverActivated',  dna.packageFamilyRelationshipsModule, { services: 2, rateSheetRows: 1, tierSelections: 0 }, labelled(CTX.disabledSettled, 'Package Family')],
  ['familyCapabilities.none',             dna.packageFamilyCapabilitiesModule, { tier: { enabled: false } }, labelled(CTX.activeSettled, 'Package Family')],
  ['familyCapabilities.neverActivated',   dna.packageFamilyCapabilitiesModule, { tier: { enabled: false } }, labelled(CTX.disabledSettled, 'Package Family')],

  // ── Package Manager modules ───────────────────────────────────────────────
  // packageManagerItemModule reads an EXPLICIT `disabled` flag, so it does read
  // Disabled — the other half of the same rule.
  ['managerItem.disabled',        dna.packageManagerItemModule, { item_id: 'i1', module_transition: 'settled', disabled: true,  missing: false }, CTX.activeSettled],
  ['managerItem.active',          dna.packageManagerItemModule, { item_id: 'i1', module_transition: 'settled', disabled: false, missing: false }, CTX.activeSettled],
  ['managerItem.missing',         dna.packageManagerItemModule, { item_id: 'i1', module_transition: 'settled', disabled: false, missing: true },  CTX.activeSettled],
  ['managerSummary.empty',        dna.packageManagerSummaryModule, [],                                       CTX.activeSettled],
  ['managerSummary.mixed',        dna.packageManagerSummaryModule, [
    { item_id: 'i1', module_transition: 'settled', disabled: true,  missing: false },
    { item_id: 'i2', module_transition: 'pending', disabled: false, missing: false },
  ], CTX.activeSettled],

  // ── Rate Sheet pool ───────────────────────────────────────────────────────
  ['rateSheets.empty',            dna.rateSheetCollectionModule, { count: 0 },                              labelled(CTX.disabledSettled, 'Rate Sheet')],
  ['rateSheets.stocked',          dna.rateSheetCollectionModule, { count: 3 },                              labelled(CTX.activeSettled, 'Rate Sheet')],
  ['rateSheets.offline',          dna.rateSheetCollectionModule, { count: 3 },                              labelled(CTX.disabledSettled, 'Rate Sheet')],

  // ── Tier System overview and inclusion ────────────────────────────────────
  ['tierSystemOverview.untitled',  dna.tierSystemOverviewModule, { titled: false },                          labelled(CTX.notConfigured, 'Tier system')],
  ['tierSystemOverview.titled',    dna.tierSystemOverviewModule, { titled: true },                           labelled(CTX.disabledSettled, 'Tier system')],
  ['tierSystemOverview.published', dna.tierSystemOverviewModule, { titled: true },                           labelled(CTX.activeSettled, 'Tier system')],
  ['tierInclusion.resolved',      dna.tierInclusionModule, { resolved: true },                              CTX.activeSettled],
  ['tierInclusion.unresolved',    dna.tierInclusionModule, { resolved: false },                             CTX.activeSettled],
  ['tierInclusionConn.configured',   dna.tierInclusionConnectionModule, { configured: true },               CTX.activeSettled],
  ['tierInclusionConn.unconfigured', dna.tierInclusionConnectionModule, { configured: false },              CTX.activeSettled],
  ['tierRateSheetAccess.active',      dna.tierRateSheetAccessModule, { activeCount: 2, allowedActiveCount: 2, unresolvedCount: 0 }, CTX.activeSettled],
  ['tierRateSheetAccess.noActive',    dna.tierRateSheetAccessModule, { activeCount: 0, allowedActiveCount: 0, unresolvedCount: 0 }, CTX.activeSettled],
  ['tierRateSheetAccess.unresolved',  dna.tierRateSheetAccessModule, { activeCount: 2, allowedActiveCount: 1, unresolvedCount: 1 }, CTX.activeSettled],
];

const snapshot = {};
for (const [name, def, data, ctx] of cases) {
  snapshot[name] = dna.evaluateModule(def, data, ctx);
}
const serialized = JSON.stringify(snapshot, null, 2) + '\n';

if (process.argv.includes('--update') || !existsSync(snapFile)) {
  mkdirSync(dirname(snapFile), { recursive: true });
  writeFileSync(snapFile, serialized);
  console.log(`ModuleState snapshot written: ${snapFile} (${cases.length} cases)`);
} else {
  const previous = readFileSync(snapFile, 'utf8');
  if (previous === serialized) {
    console.log(`ModuleState parity OK — ${cases.length} cases byte-identical.`);
  } else {
    console.error('ModuleState DRIFT DETECTED — DNA behaviour changed. Diff the snapshot:');
    console.error(snapFile);
    process.exit(1);
  }
}
