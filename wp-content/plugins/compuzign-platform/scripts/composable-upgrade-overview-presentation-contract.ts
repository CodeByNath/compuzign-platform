// Live-validation correction (project-work/2026-09-06-composable-upgrade-
// platform-identification.md, "live validation exposed missing admin
// Overview dual-ID presentation"): CZTU/CZTEU were correctly minted and
// stored, but Tier Overview / Edition Overview never rendered them —
// buildTierDetail()/buildTierEditionDetail() never carried the field, and
// the shell schemas never declared a row for it. This exercises the REAL
// exported shell schemas (tierOverviewShell/tierEditionOverviewShell) — the
// same `when`/`bind` functions the drawer renders through — against
// constructed data, proving:
//  1. an ordinary Tier/Add-on/Edition (no Upgrade id) never shows the row;
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
  if (!condition) throw new Error(`Composable Upgrade Overview presentation contract: ${message}`);
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
  platformId: 'CZT7K3M9A', addonPlatformId: '', upgradePlatformId: '',
  tierEditionsCount: 1,
};

const upgradeRow = findRow<TierOverviewShellData>(tierOverviewShell, 'upgrade-platform-id');
check(upgradeRow.when !== undefined, 'the Upgrade Platform ID row is conditionally shown, never unconditional');
check(upgradeRow.when!(baseTierData) === false, 'an ordinary Tier with no CZTU hides the Upgrade Platform ID row');

const composableTierData: TierOverviewShellData = { ...baseTierData, upgradePlatformId: 'CZTU4H8P2' };
check(upgradeRow.when!(composableTierData) === true, 'a composable occupant with a minted CZTU shows the Upgrade Platform ID row');
check((upgradeRow.bind(composableTierData) as { value: string }).value === 'CZTU4H8P2', 'the row binds to the exact CZTU value');

const platformIdRow = findRow<TierOverviewShellData>(tierOverviewShell, 'platform-id');
const boundEcosystemId = platformIdRow.bind(composableTierData) as { value: string };
check(boundEcosystemId.value === 'CZT7K3M9A', 'the occupant\'s own ecosystem Tier Platform ID (CZT) still renders unchanged alongside the additional CZTU row — dual identity, neither replacing the other');

// Ordinary Add-on occupant (is_addon: true, no Upgrade id) — the pre-existing
// addon-platform-id row's own behavior must be completely unaffected.
const addonData: TierOverviewShellData = { ...baseTierData, isAddon: true, addonPlatformId: 'CZTAQ2R7X' };
const addonRow = findRow<TierOverviewShellData>(tierOverviewShell, 'addon-platform-id');
check(addonRow.when!(addonData) === true, 'an ordinary Add-on occupant still shows its own Add-on Platform ID row, unaffected by this change');
check(upgradeRow.when!(addonData) === false, 'an ordinary Add-on occupant with no CZTU still hides the Upgrade Platform ID row — Add-on and Upgrade are independent, coexisting capabilities');

// ── Edition Overview ─────────────────────────────────────────────────────────

const baseEditionData: TierEditionOverviewShellData = {
  title: 'Annual', adminDescription: '', price: 480, contact: false,
  editionPlatformId: 'CZTEB3N6K', editionUpgradePlatformId: '',
};

const editionUpgradeRow = findRow<TierEditionOverviewShellData>(tierEditionOverviewShell, 'edition-upgrade-platform-id');
check(editionUpgradeRow.when !== undefined, 'the Edition Upgrade Platform ID row is conditionally shown, never unconditional');
check(editionUpgradeRow.when!(baseEditionData) === false, 'an ordinary Edition with no CZTEU hides the Upgrade Platform ID row');

const composableEditionData: TierEditionOverviewShellData = { ...baseEditionData, editionUpgradePlatformId: 'CZTEU9W4L' };
check(editionUpgradeRow.when!(composableEditionData) === true, 'a composable Edition with a minted CZTEU shows the Upgrade Platform ID row');

const editionPlatformIdRow = findRow<TierEditionOverviewShellData>(tierEditionOverviewShell, 'edition-platform-id');
const boundEditionEcosystemId = editionPlatformIdRow.bind(composableEditionData) as { value: string };
check(boundEditionEcosystemId.value === 'CZTEB3N6K', 'the Edition\'s own ecosystem CZTE still renders unchanged alongside the additional CZTEU row — dual identity, neither replacing the other');

// ── Source wiring: the detail-model builders actually carry the backend
//    field into the shell data object (the exact thing that was missing). ───

const tierDetailModel = readFileSync(new URL('../resources/ts/package-station/drawer/tier/tierDetailModel.ts', import.meta.url), 'utf8');
check(tierDetailModel.includes('upgradePlatformId: detail.upgrade_platform_id'), 'buildTierDetail() carries detail.upgrade_platform_id into the Tier Overview shell data');

const tierEditionDetailModel = readFileSync(new URL('../resources/ts/package-station/drawer/tier/tierEditionDetailModel.ts', import.meta.url), 'utf8');
check(tierEditionDetailModel.includes('editionUpgradePlatformId: edition.edition_upgrade_platform_id'), 'buildTierEditionDetail() carries edition.edition_upgrade_platform_id into the Edition Overview shell data');

// ── Backend/frontend type parity — both new output-only fields exist on the
//    frontend contracts with the exact backend field name. ─────────────────

const types = readFileSync(new URL('../resources/ts/package-station/types.ts', import.meta.url), 'utf8');
check(types.includes('upgrade_platform_id: string'), 'SurfaceTierDetail carries upgrade_platform_id: string');
check(types.includes('edition_upgrade_platform_id: string'), 'TierEdition carries edition_upgrade_platform_id: string');

console.log('\nComposable Upgrade Overview presentation contract passed.');
