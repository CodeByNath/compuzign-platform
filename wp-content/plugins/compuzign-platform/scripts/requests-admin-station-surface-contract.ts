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
  'the Request drawer publishes a pinned footer for Approve/Cancel Request',
);
check(
  drawerSource.includes('setHeaderAction?.('),
  'CRM-1C audit correction: the Request drawer publishes Print / Save PDF as a header action, not a footer action',
);
check(
  !drawerSource.includes('setCloseGuard('),
  'the Request drawer still calls no close guard — none of Approve/Cancel/Print leave unsaved state to guard against',
);

// ── CRM-1C audit correction: header Print, footer Approve/Cancel only ──────
//
// Live browser review corrected the prior round's layout: Print moved out
// of the footer into a header icon action (present for every status), and
// the footer keeps only Approve/Cancel Request for a pending Request — no
// footer Close, no footer Print, no split-button chevron for Cancel
// Request. Structural proof (not a rendered-output check — this repo's
// contract scripts don't mount Preact).

check(
  drawerSource.includes("request.status === 'pending'"),
  'the Request drawer decides footer visibility by status: pending gets Approve/Cancel, every other status gets none',
);
const footerDecision = drawerSource.match(/setFooter\?\.\(\s*request\.status === 'pending'\s*\?([\s\S]*?)\)\s*;/);
check(footerDecision !== null, 'setFooter is driven by a pending ? <RequestDrawerFooter/> : null ternary');
check(
  footerDecision !== null && /<RequestDrawerFooter/.test(footerDecision[0]) && /:\s*null/.test(footerDecision[0]),
  'a terminal (approved/cancelled) Request publishes no footer at all — no mutation actions left to offer',
);

check(
  drawerSource.includes('<IconButton') && drawerSource.includes('<PrintIcon') && drawerSource.includes("label=\"Print / Save PDF\""),
  'the header action is an icon-only Print / Save PDF using the shared IconButton/PrintIcon primitives',
);
const headerActionBlock = drawerSource.match(/<IconButton[\s\S]*?<\/IconButton>/);
check(
  headerActionBlock !== null && headerActionBlock[0].includes('disabled={actions.pendingAction !== null}'),
  'CRM-1C: the header Print action still honors the same busy-state action lock as Approve/Cancel',
);

const footerSource = read('resources/ts/admin-station/stations/requests/RequestDrawerFooter.tsx');
// Strip // comments before scanning for code-level shape — this file's own
// explanatory prose legitimately names SupportedActionFooter/EntityActionFooter/
// status/Close/Print/placement to explain what it deliberately does NOT use,
// which must not itself trip a check for their absence from actual code.
const footerSourceNoComments = footerSource.replace(/\/\/.*$/gm, '');
check(
  !/\bstatus\b/.test(footerSourceNoComments),
  'RequestDrawerFooter no longer branches on status — the host decides whether to render it at all',
);
check(
  !footerSourceNoComments.includes('SupportedActionFooter') && !footerSourceNoComments.includes('EntityActionFooter'),
  "the audit explicitly rules out the shared footer's Close-slot/split-button grammar for this two-plain-button shape",
);
check(
  !/id:\s*'close'/.test(footerSourceNoComments) && !footerSourceNoComments.includes("'Close'")
    && !/id:\s*'print'/.test(footerSourceNoComments) && !footerSourceNoComments.includes('placement'),
  'the footer renders no Close button, no Print button, and no split-button placement — just Cancel Request and Approve',
);
check(
  footerSourceNoComments.includes('cz-admin-btn--danger') && footerSourceNoComments.includes('cz-admin-btn--primary') && footerSourceNoComments.includes('cz-tf-footer__spacer'),
  'Cancel Request (danger) sits left of the spacer and Approve (primary) sits right of it, the plain cz-admin-btn/cz-tf-footer grammar InlineEditorShell already establishes',
);
check(
  (footerSourceNoComments.match(/disabled=\{busy\}/g) ?? []).length === 2,
  'both Cancel Request and Approve disable while either mutation is in flight',
);

// ── CRM-1C audit correction: header icon/tooltip accessibility ─────────────

const iconButtonSource = read('resources/ts/admin-station/shell/IconButton.tsx');
check(
  iconButtonSource.includes('aria-label={label}') && iconButtonSource.includes('role="tooltip"'),
  'IconButton exposes a full accessible name and a tooltip element carrying the same text',
);
const shellCssSource = read('resources/ts/admin-station/styles/admin-station.css');
check(
  shellCssSource.includes(':hover') && shellCssSource.includes(':focus-visible'),
  'the icon-button tooltip shows on both hover and keyboard focus, not hover alone',
);

// ── CRM-1C audit correction: Print icon resolves through Admin tokens only,
//    every visual state, never a raw/new/borrowed accent colour ───────────

const iconBtnRuleBlocks = [...shellCssSource.matchAll(/([^{}]*\.cz-icon-btn[^{}]*)\{([^{}]*)\}/g)].map((m) => m[2]);
check(iconBtnRuleBlocks.length > 0, 'admin-station.css declares at least one .cz-icon-btn rule');
const iconBtnDeclarations = iconBtnRuleBlocks.join('\n');
check(
  !/#[0-9a-fA-F]{3,8}\b/.test(iconBtnDeclarations) && !/\b(rgb|rgba|hsl|hsla)\(/.test(iconBtnDeclarations),
  'no .cz-icon-btn rule declares a raw hex/rgb/hsl colour literal — every colour/background/outline resolves through a var(--station-*) token',
);
check(
  shellCssSource.includes('.cz-icon-btn:focus-visible') && /\.cz-icon-btn:focus-visible[\s\S]{0,120}?var\(--station-focus-ring\)/.test(shellCssSource),
  'CRM-1C correction: .cz-icon-btn:focus-visible resolves through the same canonical --station-focus-ring token .cz-station-iconbtn (the Admin header icon pattern) already uses, not a browser default outline',
);
check(
  /\.cz-icon-btn:active[^{]*\{[^}]*var\(--station-active-bg\)/.test(shellCssSource),
  'CRM-1C correction: .cz-icon-btn:active resolves through the same neutral --station-active-bg token, not a new accent',
);
check(
  /\.cz-icon-btn\s*\{[^}]*var\(--station-text-muted\)/.test(shellCssSource),
  'the Print icon\'s default color matches the adjacent Close ×\'s own --station-text-muted token',
);

// ── CRM-1C audit correction: synchronous print-window activation ───────────
//
// Live review found window.open() reported as falsely "popup blocked"
// because the prior single async printRequestProposal() opened it as the
// first statement of an async function — some browsers drop transient user
// activation the instant an async function is entered, before its first
// await. The fix: openRequestPrintWindow() is a plain, non-async function,
// called directly and synchronously from the click handler; only the
// continuation after a real window exists is async.

const printSource = read('resources/ts/admin-station/stations/requests/printRequestProposal.tsx');
check(
  /export function openRequestPrintWindow/.test(printSource) && !/export async function openRequestPrintWindow/.test(printSource),
  'openRequestPrintWindow is a plain, non-async function — window.open() must never sit behind an async-function frame',
);
check(
  /export async function finishRequestPrint/.test(printSource),
  'finishRequestPrint is the async continuation — render, stylesheet wait, and print() all happen after the window already exists',
);

const drawerActionsSource = read('resources/ts/admin-station/stations/requests/useRequestDrawerActions.ts');
check(
  /function runPrint\(request: RequestEntry\): void \{/.test(drawerActionsSource),
  'runPrint is a plain, non-async function, called directly (not awaited/void-wrapped) by handlePrint — the whole chain from click to openRequestPrintWindow() stays synchronous',
);
check(
  drawerActionsSource.includes('handlePrint: (request: RequestEntry) => runPrint(request)'),
  'handlePrint calls runPrint directly and synchronously, with no async wrapper reintroduced at the call site',
);
check(
  /if \(opened\.reason === 'popup-blocked'\)/.test(drawerActionsSource),
  'genuine popup-blocking is reported only from openRequestPrintWindow\'s own returned reason, never inferred elsewhere',
);
check(
  drawerActionsSource.includes('finishRequestPrint(opened, request).catch(') && drawerActionsSource.includes('opened.printWindow.close()'),
  'CRM-1C: a preparation failure (render/stylesheet error) closes the placeholder window and surfaces the real error, distinct from the popup-blocked message',
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
