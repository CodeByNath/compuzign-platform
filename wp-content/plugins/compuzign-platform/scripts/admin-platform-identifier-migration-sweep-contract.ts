import { readFileSync } from 'node:fs';

// Live-audit correction (project-work/2026-09-06-composable-upgrade-platform-
// identification.md, "Blocking omission — Nath's existing Admin Station
// assignment button"): TIER_UPGRADE/TIER_EDITION_UPGRADE were correctly added
// to the BACKEND TemporaryMigrationController::ENTITY_TYPES, but the Admin
// Station's one-time sweep button (PlatformIdentifierMigrationNotice.tsx) has
// its own separately-hardcoded ENTITY_TYPES array — a scope missing from that
// list means the backend never reports complete (it's genuinely incomplete)
// while the button's own dry-run/assign loop never touches it either, so the
// rollout can never finish through the UI. This contract derives the
// backend's own authoritative scope list straight from source (never
// hand-copied) and proves the frontend sweep is an EXACT match — catching
// this whole class of omission automatically for any future scope, not just
// this one.

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Admin Platform Identifier migration sweep contract: ${message}`);
  console.log(`  ok — ${message}`);
}

const root = new URL('../', import.meta.url);
const migrationControllerSource = readFileSync(new URL('src/PlatformIdentifier/TemporaryMigrationController.php', root), 'utf8');
const policySource = readFileSync(new URL('src/PlatformIdentifier/PlatformIdentifierPolicy.php', root), 'utf8');
const noticeSource = readFileSync(new URL('resources/ts/admin-station/shell/PlatformIdentifierMigrationNotice.tsx', root), 'utf8');
const apiSource = readFileSync(new URL('resources/ts/admin-station/api/platformIdentifiers.ts', root), 'utf8');

// ── Derive the backend's own authoritative scope list ────────────────────────

const entityTypesBlockMatch = migrationControllerSource.match(/private const ENTITY_TYPES = \[([\s\S]*?)\];/);
check(entityTypesBlockMatch !== null, 'TemporaryMigrationController::ENTITY_TYPES is found as a parseable array literal');
const constantNames = [...entityTypesBlockMatch![1].matchAll(/PlatformIdentifierPolicy::([A-Z_]+)/g)].map((m) => m[1]);
check(constantNames.length >= 9, 'ENTITY_TYPES lists at least the nine scopes already proven before this round');

const constantValueByName = new Map<string, string>();
for (const m of policySource.matchAll(/public const ([A-Z_]+)\s*=\s*'([a-z_]+)';/g)) {
  constantValueByName.set(m[1], m[2]);
}
const backendScopes = constantNames.map((name) => {
  const value = constantValueByName.get(name);
  check(value !== undefined, `PlatformIdentifierPolicy::${name} (referenced by ENTITY_TYPES) resolves to a real string constant`);
  return value!;
});
const backendScopeSet = new Set(backendScopes);
check(backendScopeSet.has('tier_upgrade') && backendScopeSet.has('tier_edition_upgrade'), 'the backend migration engine\'s own scope list includes both new Composable Upgrade scopes');

// ── Derive the Admin Station sweep's own scope list ──────────────────────────

const noticeArrayMatch = noticeSource.match(/const ENTITY_TYPES: EntityType\[\] = \[([\s\S]*?)\];/);
check(noticeArrayMatch !== null, 'PlatformIdentifierMigrationNotice.tsx\'s own ENTITY_TYPES sweep array is found as a parseable literal');
const noticeScopes = [...noticeArrayMatch![1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
const noticeScopeSet = new Set(noticeScopes);

// ── The load-bearing assertion: exact match, both directions ────────────────

const missingFromNotice = backendScopes.filter((scope) => !noticeScopeSet.has(scope));
const extraInNotice = noticeScopes.filter((scope) => !backendScopeSet.has(scope));
check(missingFromNotice.length === 0, `the Admin Station sweep includes every backend scope (missing: ${missingFromNotice.join(', ') || 'none'}) — this is exactly the omission the live audit caught for tier_upgrade/tier_edition_upgrade`);
check(extraInNotice.length === 0, `the Admin Station sweep never references a scope the backend engine doesn't itself support (extra: ${extraInNotice.join(', ') || 'none'})`);
check(noticeScopes.length === new Set(noticeScopes).size, 'the sweep array lists each scope exactly once — no duplicate dry-run/assign work');

// ── The TS union type must also carry both new scopes (compile-time guard —
//    a scope missing here would make the .ts file itself fail to typecheck
//    the moment it's added to ENTITY_TYPES, catching this even earlier). ────

check(apiSource.includes("| 'tier_upgrade'") && apiSource.includes("| 'tier_edition_upgrade'"), 'PlatformIdentifierEntityType\'s own union type lists both new scopes — the notice\'s ENTITY_TYPES array could not compile otherwise');

// ── This module still mints nothing — same invariant every other contract
//    over this file already relies on. ──────────────────────────────────────
check(!noticeSource.includes('reason.message') && noticeSource.includes('Review the server log for details.'), 'the Admin notice still keeps stack diagnostics out of the frontend');

console.log('\nAdmin Platform Identifier migration sweep contract passed.');
