// Live-validation correction (project-work/2026-09-06-composable-catalogue-
// platform-identification.md, "live validation exposed missing admin
// Overview dual-ID presentation"): CZTC/CZTEC were correctly minted and
// stored, but Tier Overview / Edition Overview never rendered them —
// buildTierDetail()/buildTierEditionDetail() never carried the field, and
// the shell schemas never declared a row for it. This exercises the REAL
// exported shell schemas (tierOverviewShell/tierEditionOverviewShell) — the
// same `when`/`bind` functions the drawer renders through — against
// constructed data, proving:
//  1. an ordinary Tier/Add-on/Edition (no Catalogue id) never shows the row;
//  2. a composable occupant/Edition that HAS one shows it, correctly
//     valued, alongside its own unchanged ecosystem id (dual identity,
//     neither replacing the other);
// plus a source-wiring check that the two detail-model builders actually
// carry the backend field into the shell data object at all (the exact
// thing that was missing).

import { readFileSync } from 'node:fs';
import { tierOverviewShell } from '../resources/ts/package-station/drawer/schema/bindings/tier';
import type { TierOverviewShellData } from '../resources/ts/package-station/drawer/schema/bindings/tier';
import { tierEditionOverviewShell } from '../resources/ts/package-station/drawer/schema/bindings/tierEdition';
import type { TierEditionOverviewShellData } from '../resources/ts/package-station/drawer/schema/bindings/tierEdition';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Composable Catalogue Overview presentation contract: ${message}`);
  console.log(`  ok — ${message}`);
}

function findRow<T>(shell: { content: { id: string; when?: (d: T) => boolean; bind: (d: T) => unknown }[] }, id: string) {
  const row = shell.content.find((r) => r.id === id);
  if (!row) throw new Error(`row '${id}' not found on shell`);
  return row;
}

// ── Tier Overview ────────────────────────────────────────────────────────────

const baseTierData: TierOverviewShellData = {
  label: 'Starter', idealFor: 'Small teams', audienceGroups: [],
  tierName: 'Starter', contact: false, price: 49, isAddon: false, popular: false,
  platformId: 'CZT7K3M9A', addonPlatformId: '', cataloguePlatformId: '',
  tierEditionsCount: 1,
};

const catalogueRow = findRow<TierOverviewShellData>(tierOverviewShell, 'catalogue-platform-id');
check(catalogueRow.when !== undefined, 'the Catalogue Platform ID row is conditionally shown, never unconditional');
check(catalogueRow.when!(baseTierData) === false, 'an ordinary Tier with no CZTC hides the Catalogue Platform ID row');

const composableTierData: TierOverviewShellData = { ...baseTierData, cataloguePlatformId: 'CZTC4H8P2' };
check(catalogueRow.when!(composableTierData) === true, 'a composable occupant with a minted CZTC shows the Catalogue Platform ID row');
check((catalogueRow.bind(composableTierData) as { value: string }).value === 'CZTC4H8P2', 'the row binds to the exact CZTC value');

const platformIdRow = findRow<TierOverviewShellData>(tierOverviewShell, 'platform-id');
const boundEcosystemId = platformIdRow.bind(composableTierData) as { value: string };
check(boundEcosystemId.value === 'CZT7K3M9A', 'the occupant\'s own ecosystem Tier Platform ID (CZT) still renders unchanged alongside the additional CZTC row — dual identity, neither replacing the other');

// Ordinary Add-on occupant (is_addon: true, no Catalogue id) — the pre-existing
// addon-platform-id row's own behavior must be completely unaffected.
const addonData: TierOverviewShellData = { ...baseTierData, isAddon: true, addonPlatformId: 'CZTAQ2R7X' };
const addonRow = findRow<TierOverviewShellData>(tierOverviewShell, 'addon-platform-id');
check(addonRow.when!(addonData) === true, 'an ordinary Add-on occupant still shows its own Add-on Platform ID row, unaffected by this change');
check(catalogueRow.when!(addonData) === false, 'an ordinary Add-on occupant with no CZTC still hides the Catalogue Platform ID row — Add-on and Catalogue are independent, coexisting capabilities');

// ── Edition Overview ─────────────────────────────────────────────────────────

const baseEditionData: TierEditionOverviewShellData = {
  title: 'Annual', adminDescription: '', price: 480, contact: false,
  editionPlatformId: 'CZTEB3N6K', editionCataloguePlatformId: '',
};

const editionCatalogueRow = findRow<TierEditionOverviewShellData>(tierEditionOverviewShell, 'edition-catalogue-platform-id');
check(editionCatalogueRow.when !== undefined, 'the Edition Catalogue Platform ID row is conditionally shown, never unconditional');
check(editionCatalogueRow.when!(baseEditionData) === false, 'an ordinary Edition with no CZTEC hides the Catalogue Platform ID row');

const composableEditionData: TierEditionOverviewShellData = { ...baseEditionData, editionCataloguePlatformId: 'CZTEC9W4L' };
check(editionCatalogueRow.when!(composableEditionData) === true, 'a composable Edition with a minted CZTEC shows the Catalogue Platform ID row');

const editionPlatformIdRow = findRow<TierEditionOverviewShellData>(tierEditionOverviewShell, 'edition-platform-id');
const boundEditionEcosystemId = editionPlatformIdRow.bind(composableEditionData) as { value: string };
check(boundEditionEcosystemId.value === 'CZTEB3N6K', 'the Edition\'s own ecosystem CZTE still renders unchanged alongside the additional CZTEC row — dual identity, neither replacing the other');

// ── Source wiring: the detail-model builders actually carry the backend
//    field into the shell data object (the exact thing that was missing). ───

const tierDetailModel = readFileSync(new URL('../resources/ts/package-station/drawer/tier/tierDetailModel.ts', import.meta.url), 'utf8');
check(tierDetailModel.includes('cataloguePlatformId: detail.catalogue_platform_id'), 'buildTierDetail() carries detail.catalogue_platform_id into the Tier Overview shell data');

const tierEditionDetailModel = readFileSync(new URL('../resources/ts/package-station/drawer/tier/tierEditionDetailModel.ts', import.meta.url), 'utf8');
check(tierEditionDetailModel.includes('editionCataloguePlatformId: edition.edition_catalogue_platform_id'), 'buildTierEditionDetail() carries edition.edition_catalogue_platform_id into the Edition Overview shell data');

// ── Backend/frontend type parity — both new output-only fields exist on the
//    frontend contracts with the exact backend field name. ─────────────────

const types = readFileSync(new URL('../resources/ts/package-station/types.ts', import.meta.url), 'utf8');
check(types.includes('catalogue_platform_id: string'), 'SurfaceTierDetail carries catalogue_platform_id: string');
check(types.includes('edition_catalogue_platform_id: string'), 'TierEdition carries edition_catalogue_platform_id: string');

console.log('\nComposable Catalogue Overview presentation contract passed.');
