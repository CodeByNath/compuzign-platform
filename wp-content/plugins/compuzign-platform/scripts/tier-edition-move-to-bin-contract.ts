// Contract: the atomic admin-intent "Move Edition to Bin" command stays
// wired end to end — a SEPARATE, additive route/method from the narrow
// "already archived/trashed only" bin relocation (which this contract also
// proves is byte-untouched), composing only existing PackageSchema
// primitives, persisting exactly once, and reached from the frontend
// exclusively through useTierEditions.moveToBin.
//
// There is no WP_REST_Request harness in this repository's PHP test suite
// (see tests/tier-edition-move-to-bin.php's own header comment), so the
// controller's route registration and its single-persist structure are
// proven here by source-scanning, the same technique
// tier-edition-admin-contract.ts already uses for this controller.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Move Edition to Bin (atomic) contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
function source(path: string): string {
  return readFileSync(resolve(root, path), 'utf8');
}

const controller = source('src/Modules/SurfacePackages/Http/PackageStationController.php');
const packageSchema = source('src/Modules/SurfacePackages/Support/PackageSchema.php');
const api = source('resources/ts/package-station/api.ts');
const hook = source('resources/ts/package-station/surface/tierSurface/useTierEditions.ts');
const menu = source('resources/ts/package-station/drawer/tier/tierLifecycleMenu.ts');

// ── Route: a SEPARATE, additive route — the narrow one is untouched ────────

check(
  controller.includes("/tiers/(?P<tier>[a-z]+)/editions/(?P<edition>edt_[a-z0-9]+)/move-to-bin'")
    && controller.includes("'methods' => 'POST', 'callback' => [\$this, 'moveTierEditionToBinCommand']"),
  'a POST .../editions/{edition}/move-to-bin route is registered, targeting moveTierEditionToBinCommand',
);
check(
  controller.includes("/tiers/(?P<tier>[a-z]+)/editions/(?P<edition>edt_[a-z0-9]+)/bin'")
    && controller.includes("'methods' => 'POST', 'callback' => [\$this, 'moveTierEditionToBinEndpoint']"),
  'the narrow POST .../editions/{edition}/bin route (already archived/trashed only) remains registered, byte-identical, targeting moveTierEditionToBinEndpoint — this command did not repurpose it',
);

// ── Controller method: composes existing PackageSchema primitives only ─────

const commandMatch = controller.match(
  /public function moveTierEditionToBinCommand\(\\WP_REST_Request \$request\): \\WP_REST_Response\s*\{[\s\S]*?\n    \}/,
);
check(commandMatch !== null, 'moveTierEditionToBinCommand is defined with the standard controller method signature');
const commandBody = commandMatch![0];

check(
  commandBody.includes('$engine::isBinned(') && commandBody.includes('$PS::applyTierEditionStatus(') && commandBody.includes('$engine::STATUS_TRASHED'),
  'the command checks isBinned() and, when false, transitions to Trashed through the EXISTING PackageSchema::applyTierEditionStatus — the same permissive engine transition the /status endpoint already uses, not a new lifecycle rule',
);
check(
  commandBody.includes('$PS::moveTierEditionToBin('),
  'the command relocates through the EXISTING PackageSchema::moveTierEditionToBin — the same narrow primitive the low-level endpoint uses, not a duplicate',
);
check(
  (packageSchema.match(/function\s+moveTierEditionToBin\(/g) ?? []).length === 1,
  'PackageSchema still defines exactly ONE moveTierEditionToBin() function — the composition lives ONLY in the controller, no second/renamed PackageSchema primitive was added',
);
check(
  !packageSchema.includes('moveTierEditionToBinCommand'),
  'PackageSchema itself has no knowledge of the "Command" composition — that vocabulary belongs to the controller layer only',
);

// ── Exactly one persist call, and only after both steps succeed ────────────

const persistCalls = commandBody.match(/\$this->persistTierInstance\(/g) ?? [];
check(persistCalls.length === 1, `the command calls persistTierInstance() exactly once (found ${persistCalls.length}) — one request, one write, never a separate persist for the trash step`);
check(
  !commandBody.includes('persistTierEditionOccupant('),
  'the command does not ALSO call persistTierEditionOccupant (which would persist the trash transition on its own before the bin relocation) — the in-memory occupant carries both steps into the single persistTierInstance call',
);

// The persist call must be textually AFTER the error-return branches, so a
// thrown exception or a returned `error` key never reaches it.
const persistIndex = commandBody.indexOf('$this->persistTierInstance(');
const catchIndex = commandBody.indexOf('} catch (\\InvalidArgumentException $e) {');
const errorBranchIndex = commandBody.indexOf("isset($result['error'])");
check(
  catchIndex !== -1 && catchIndex < persistIndex,
  'the try/catch around both composed steps appears before the single persist call — a thrown exception returns before any write',
);
check(
  errorBranchIndex !== -1 && errorBranchIndex < persistIndex,
  'the `isset($result[\'error\'])` guard appears before the single persist call — a returned error short-circuits before any write',
);

// Never assigns/reserves CZTE — that only happens on transition to Active.
check(
  !commandBody.includes('reserve(') && !commandBody.includes('edition_platform_id'),
  'the command never touches Platform identity — trashing/binning an Edition assigns no CZTE, mirroring every other travel operation',
);

// ── Frontend: api.ts exposes both, as separate functions ───────────────────

check(
  api.includes('export function moveTierEditionToBinCommand') && api.includes('/editions/${editionId}/move-to-bin`'),
  'api.ts exposes moveTierEditionToBinCommand targeting the instance-scoped .../editions/{id}/move-to-bin route',
);
check(
  api.includes('export function moveTierEditionToBin(') && api.includes('/editions/${editionId}/bin`'),
  'api.ts still exposes the original, narrower moveTierEditionToBin targeting .../editions/{id}/bin — kept intact for callers that deliberately require "already binnable"',
);

// ── The hook drives the footer's ONE Move to Bin action through the atomic
//    command, not the narrow endpoint ───────────────────────────────────────

check(
  hook.includes('moveTierEditionToBinCommand(serviceId, tierInstanceId, tierId, editionId)'),
  'useTierEditions.moveToBin calls the atomic moveTierEditionToBinCommand — the ONE admin-facing action works from any Edition status with no frontend branching',
);
check(
  !hook.includes('moveTierEditionToBin(serviceId'),
  'useTierEditions no longer calls the narrow moveTierEditionToBin directly — that endpoint remains reachable in api.ts, just not from this hook\'s public moveToBin action',
);

// ── The lifecycle menu carries exactly one danger-toned Move to Bin row,
//    never a separate Trash/Permanently-Delete row ─────────────────────────

check(
  !menu.includes('onTrash:') && !menu.includes('onDelete:') && !menu.includes('edition.onTrash') && !menu.includes('edition.onDelete'),
  'tierLifecycleMenu.ts declares no onTrash/onDelete inputs or usages — Trash is folded into the atomic Move to Bin handler, Permanent Delete moved out entirely',
);
check(
  menu.includes("label: `Move Edition to Bin — ${name}`") && !menu.includes('Permanently Delete Edition — ${name}'),
  'the menu never produces a "Permanently Delete Edition" row — that action exists only in the Edition Bin now',
);

console.log('Move Edition to Bin (atomic) contract passed.');
