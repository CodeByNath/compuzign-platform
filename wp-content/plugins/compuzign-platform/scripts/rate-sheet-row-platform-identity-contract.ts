import { readFileSync } from 'node:fs';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Rate Sheet row Platform identity contract: ${message}`);
  console.log(`  ok — ${message}`);
}

const controller = readFileSync(new URL('../src/Modules/SurfacePackages/Http/PackageStationController.php', import.meta.url), 'utf8');
const repository = readFileSync(new URL('../src/Modules/SurfacePackages/Repositories/PackageRepository.php', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../src/PlatformIdentifier/TemporaryMigrationController.php', import.meta.url), 'utf8');
const adapters = readFileSync(new URL('../src/Modules/SurfacePackages/PlatformIdentifier/PackagePlatformIdentifierAdapters.php', import.meta.url), 'utf8');
const notice = readFileSync(new URL('../resources/ts/admin-station/shell/PlatformIdentifierMigrationNotice.tsx', import.meta.url), 'utf8');

check(controller.includes("'/admin/rate-sheet-items/(?P<platform_id>CZPRCI[A-Z0-9]+)'"), 'canonical authenticated CZPRCI read route is registered');
check(controller.includes("$oldItems[$sheetId . \"\\0\" . $itemId]"), 'stored row identity is indexed by rate_sheet_id + item_id');
check(controller.includes("$manager['rate_sheets'][$sheetIndex]['items'][$itemIndex]['cz_platform_id'] = $reservation->platformId()"), 'a newly persisted row receives its reserved scalar before the atomic save');
check(controller.includes("$this->identityAdapters->rateSheetItem(), PackagePlatformNativeReference::rateSheetItem($sheetId, $itemId)"), 'row removal and sheet deletion schedule the exact child row tombstone');
check(!controller.includes('PackagePlatformNativeReference::rateSheetItem($sheetId, $groupId'), 'group_id never participates in row identity or tombstones');
check(repository.includes("PackagePlatformNativeReference::rateSheetItem($sheetId, $itemId)"), 'legacy enumeration emits bounded qualified row references');
check(migration.includes('PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM'), 'temporary migration retains an independent CZPRCI scope');
check(adapters.includes("PACKAGE_RATE_CARD, 'sheet'"), 'Rate Sheet migration adapter passes explicit sheet scope');
check(adapters.includes("PACKAGE_RATE_CARD_GROUP, 'group'"), 'Rate Sheet Group migration adapter passes explicit group scope');
check(adapters.includes("PACKAGE_RATE_CARD_ITEM, 'item'"), 'Rate Sheet Item migration adapter passes explicit item scope');
check(!adapters.includes('$context =') && !adapters.includes('rateSheetAdapter(PlatformIdentifierPolicy::PACKAGE_RATE_CARD, false)'), 'no Rate Sheet adapter derives or passes a null assignment scope');
check(!notice.includes('reason.message') && notice.includes('Review the server log for details.'), 'Admin notice keeps stack diagnostics out of the frontend');

console.log('\nRate Sheet row Platform identity orchestration checks passed.');
