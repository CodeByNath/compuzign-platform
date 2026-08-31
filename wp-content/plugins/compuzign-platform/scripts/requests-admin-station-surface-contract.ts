// Contract: CRM-1B's Requests destination reuses the established Admin
// Station navigation, list, and drawer systems — it registers through the
// same Station Manager registries every other station uses, renders through
// the shared `cz-station-list` system (no second table/list system), and its
// drawer content is plain DrawerContentProps + the shared ReadBlock (no
// second drawer host). The drawer template supports only `view` — CRM-1C's
// Approve/Cancel/Print live as pinned-footer actions on that same `view`
// drawer, never an `edit`-mode surface binding or a second drawer host. And
// the backend list/detail routes never read the quote transient — durable
// RequestRepository is the sole source, matching
// tests/admin-requests-durable-surface.php's dynamic coverage of the same
// boundary from the PHP side.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { requestItemDisplay } from '../resources/ts/admin-station/stations/requests/requestItemDisplay';
import { deriveRequestSummaryMetrics } from '../resources/ts/admin-station/stations/requests/requestSummaryMetrics';
import type { RequestLine, RequestSummary } from '../resources/ts/api/types/admin';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Requests Admin Station surface contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const read = (path: string): string => readFileSync(resolve(root, path), 'utf8');

const registerSource = read('resources/ts/admin-station/register.ts');
const kitSource = read('resources/ts/admin-station/stations/requests/RequestsCatalogueKit.tsx');
const drawerSource = read('resources/ts/admin-station/stations/requests/RequestDrawerHost.tsx');
const dataSourceSource = read('resources/ts/admin-station/stations/requests/useRequestsCatalogue.ts');
const controllerSource = read('src/Modules/Admin/Http/AdminRequestsController.php');

// ── Registration uses the shared Station Manager registries ────────────────

check(
  /registerNavItems\(\[[\s\S]*?id:\s*'requests'/.test(registerSource),
  'Requests registers a navigation item through the shared navigation registry',
);
check(
  /registerDestinations\(\[[\s\S]*?id:\s*'requests'[\s\S]*?stationId:\s*'requests'/.test(registerSource),
  'Requests registers a destination through the shared destination registry',
);
check(
  registerSource.includes("'requests-catalogue': useRequestsCatalogue"),
  'Requests registers its data source through the shared data-source registry',
);
check(
  registerSource.includes("'requests-catalogue': RequestsCatalogueKit"),
  'Requests registers its list through the shared template-kit registry',
);

// ── The drawer template is view-only — CRM-1B ships no mutation entry point ─

const drawerTemplateMatch = registerSource.match(
  /key:\s*'request',[\s\S]*?supportedModes:\s*(\[[^\]]*\])[\s\S]*?content:\s*RequestDrawerHost/,
);
check(drawerTemplateMatch !== null, 'the request drawer template is registered with a supportedModes array');
check(
  drawerTemplateMatch![1].replace(/\s/g, '') === "['view']",
  `the request drawer template supports view only, not edit — got ${drawerTemplateMatch?.[1]}`,
);

const bindingMatch = registerSource.match(
  /stationId:\s*'requests',[\s\S]*?actionIntents:\s*\[([\s\S]*?)\]/,
);
check(bindingMatch !== null, 'the requests surface binding declares its actionIntents');
check(
  !/mode:\s*'edit'/.test(bindingMatch![1]),
  'the requests surface binding declares no edit-mode intent — Approve/Cancel are CRM-1C\'s to add',
);

// ── The list reuses the shared station list system, not a second table ─────

check(
  kitSource.includes('cz-station-list') && kitSource.includes('cz-station-list__cell'),
  'the Requests catalogue renders through the shared station list system',
);
check(
  kitSource.includes("cz-station-list__row--requests"),
  "the Requests catalogue declares its own row template modifier, not a shared one it does not own",
);
check(!/<table/.test(kitSource), 'the Requests catalogue introduces no second table markup');

// ── The drawer content is plain DrawerContentProps + the shared ReadBlock ──

check(
  drawerSource.includes("from '@/station-manager/drawerTypes'") && drawerSource.includes('DrawerContentProps'),
  'the Request drawer content is a plain DrawerContentProps consumer, addressed by the one shared drawer host',
);
check(
  drawerSource.includes("from '@/drawer-kit/ReadBlock'"),
  'Request drawer sections render through the shared drawer-kit ReadBlock, not a second card/section system',
);
check(
  !drawerSource.includes('cz-station-drawer-layer') && !drawerSource.includes('role="dialog"'),
  'the Request drawer content never reimplements the shared drawer host\'s own chrome',
);
check(
  drawerSource.includes('setFooter?.('),
  'CRM-1C: the Request drawer now publishes a pinned footer for Approve/Cancel/Print',
);
check(
  !drawerSource.includes('setCloseGuard('),
  'the Request drawer still calls no close guard — none of Approve/Cancel/Print leave unsaved state to guard against',
);

// ── CRM-1C: footer action visibility by status ──────────────────────────────
//
// Structural proof (not a rendered-output check — this repo's contract
// scripts don't mount Preact) that the footer descriptor for `pending`
// includes exactly Approve + Cancel Request + Print, and every other status
// drops to Print + Close only — mirrors the drawer footer contract already
// established by RequestDrawerFooter.tsx's own status branch.

const footerSource = read('resources/ts/admin-station/stations/requests/RequestDrawerFooter.tsx');
check(footerSource.includes("status === 'pending'"), 'the footer branches on Request status');
const pendingBranch = footerSource.match(/status === 'pending'\)\s*{([\s\S]*?)}\s*else\s*{([\s\S]*?)}/);
check(pendingBranch !== null, 'the footer has a pending branch and a non-pending (else) branch');
const [, pendingBlock, otherBlock] = pendingBranch!;
check(
  /id:\s*'approve'/.test(pendingBlock) && /id:\s*'cancel-request'/.test(pendingBlock) && /id:\s*'print'/.test(pendingBlock),
  'pending status offers Approve, Cancel Request, and Print',
);
check(
  !/id:\s*'approve'/.test(otherBlock) && !/id:\s*'cancel-request'/.test(otherBlock) && /id:\s*'print'/.test(otherBlock),
  'approved/cancelled status offers Print only (plus the always-present Close) — no opposite lifecycle action',
);

// CRM-1C audit correction: pending Print must honor the same busy-state
// action lock as Approve/Cancel Request, not stay enabled during mutation.
const pendingPrintAction = pendingBlock.match(/id:\s*'print'[\s\S]*?\n\s*},/);
check(pendingPrintAction !== null, 'the pending branch has a print action descriptor');
check(
  pendingPrintAction !== null && /disabled:\s*busy/.test(pendingPrintAction[0]),
  'CRM-1C correction: pending Print action is disabled while an Approve/Cancel mutation is in flight',
);

// ── The data source calls the durable-backed endpoint ───────────────────────

check(
  dataSourceSource.includes('fetchAdminRequests'),
  'the Requests data source calls the admin requests endpoint',
);

// ── The backend list/detail routes never read the quote transient ──────────

check(
  !controllerSource.includes('get_transient') && !controllerSource.includes('set_transient'),
  'AdminRequestsController never reads or writes the cz_quote_* transient — RequestRepository is the sole source',
);
check(
  controllerSource.includes('RequestRepository') && controllerSource.includes('findAll()') && controllerSource.includes('findByRef('),
  'AdminRequestsController reads the durable RequestRepository for both list and detail',
);
// view_secret_hash's absence from the actual response allow-list — not merely
// from this file's text, which legitimately documents it in prose — is
// proven dynamically by tests/admin-requests-durable-surface.php, including
// the defense-in-depth case where a stored snapshot is deliberately poisoned
// with the key and the projection still excludes it.

// ── Correction: a family_tier line renders a non-blank identity ────────────
// RequestSchema::sanitizeItems() unsets serviceTitle/categoryName for a
// family_tier line and stores familyTitle/tierTitle/tierEditionTitle instead
// — the exact Package Family/Tier requests CRM most needs to review must not
// show a blank primary item name.

const familyLine: RequestLine = {
  offer_type: 'family_tier',
  tierTitle: 'Omnia Basic',
  tierId: 'basic',
  price: 200,
  billingCycle: 'monthly',
  features: [],
  isAddon: false,
  promotion_id: '',
  billing_label: '',
  minimumTermValue: null,
  minimumTermUnit: null,
  familyId: 'pcg_omnia',
  familyPlatformId: 'CZPG-OMNIA001',
  familyTitle: 'OMNIA',
  tierInstanceId: 'ti_omnia',
  tierInstancePlatformId: 'CZTG-OMNIA001',
  tierOccupantId: 'occ_basic',
  tierPlatformId: 'CZT-OMNIA0001',
  tierEditionPlatformId: 'CZTE-OMNIA001',
  tierEditionTitle: 'Annual',
  inclusionItems: null,
  legPaymentSummaries: null,
};

const familyDisplay = requestItemDisplay(familyLine);
check(familyDisplay.title === 'OMNIA', `a family_tier line's title is its familyTitle, not a blank serviceTitle — got '${familyDisplay.title}'`);
check(
  familyDisplay.subtitle === 'Omnia Basic · Annual',
  `a family_tier line's subtitle is Tier · Edition, not a blank categoryName pairing — got '${familyDisplay.subtitle}'`,
);
check(familyDisplay.price === '$200.00 / monthly', 'the price shown is the line\'s own stored headline snapshot, never a computed total');

// The legacy Service/Bundle display shape is unchanged by this correction.
const legacyLine: RequestLine = {
  offer_type: 'tier',
  tierTitle: 'IaaS Starter Cloud',
  tierId: 'starter',
  price: 100,
  billingCycle: 'monthly',
  features: [],
  isAddon: false,
  promotion_id: '',
  billing_label: '',
  minimumTermValue: null,
  minimumTermUnit: null,
  serviceId: 1,
  serviceTitle: 'KAIROS',
  categoryName: 'Cloud',
};
const legacyDisplay = requestItemDisplay(legacyLine);
check(legacyDisplay.title === 'KAIROS', 'a legacy line\'s title remains its serviceTitle, unchanged by the family_tier correction');
check(legacyDisplay.subtitle === 'Cloud · IaaS Starter Cloud', 'a legacy line\'s subtitle remains Category · Tier, unchanged');

// No per-item Platform ID (familyPlatformId, tierPlatformId, etc.) is ever
// exposed by the display projection — only the Request's own CZR (rendered
// separately, from RequestEntry.platform_id) is intended plumbing.
for (const value of Object.values(familyDisplay)) {
  check(!String(value).startsWith('CZPG') && !String(value).startsWith('CZT'), 'the family_tier display never surfaces a raw per-item Platform ID');
}

// ── Summary cards: display-only, reuses the shared StationMetricBlock ──────
// The auditor's correction: is_today is a per-row server-derived field
// (AdminRequestsController::summarize()), not a new top-level API envelope
// field threaded through SurfaceCollection/TemplateKitProps, which are
// closed generic contracts shared by every station.

const summaryCardsSource = read('resources/ts/admin-station/stations/requests/RequestsSummaryCards.tsx');
check(
  kitSource.includes('RequestsSummaryCards') && kitSource.includes('<RequestsSummaryCards'),
  'the Requests catalogue mounts the summary cards above its list',
);
check(
  summaryCardsSource.includes("from '@/admin-station/presentation/StationMetricBlock'"),
  'the summary cards reuse the shared StationMetricBlock primitive directly, not a bespoke card',
);
check(
  !summaryCardsSource.includes('onClick') && !summaryCardsSource.includes('onIntent'),
  'the summary cards are numbers only — no click handler, no intent dispatch',
);
check(
  controllerSource.includes("'is_today'") && controllerSource.includes("current_time('Y-m-d')"),
  'AdminRequestsController derives is_today server-side from current_time, matching how `submitted` is itself stamped',
);

const summaryFixture: RequestSummary[] = [
  { quote_ref: 'CZ-A', platform_id: 'CZR00001', status: 'pending', contact: '', company: '', email: '', submitted: '', is_today: true, item_count: 1, total: 10 },
  { quote_ref: 'CZ-B', platform_id: 'CZR00002', status: 'approved', contact: '', company: '', email: '', submitted: '', is_today: true, item_count: 1, total: 10 },
  { quote_ref: 'CZ-C', platform_id: 'CZR00003', status: 'pending', contact: '', company: '', email: '', submitted: '', is_today: false, item_count: 1, total: 10 },
  { quote_ref: 'CZ-D', platform_id: 'CZR00004', status: 'cancelled', contact: '', company: '', email: '', submitted: '', is_today: false, item_count: 1, total: 10 },
];
const metrics = deriveRequestSummaryMetrics(summaryFixture);
const byId = Object.fromEntries(metrics.map((metric) => [metric.id, metric.value]));
check(byId.all === 4, `All Requests counts every row regardless of status — got ${byId.all}`);
check(byId.today === 2, `New Today counts only is_today rows — got ${byId.today}`);
check(byId.pending === 2, `Pending counts lifecycle status pending only — got ${byId.pending}`);
check(byId.approved === 1, `Approved counts lifecycle status approved only — got ${byId.approved}`);
check(deriveRequestSummaryMetrics([]).every((metric) => metric.value === 0), 'an empty Requests list derives all-zero counts, not an error');

console.log('Requests Admin Station surface contract checks passed.');
