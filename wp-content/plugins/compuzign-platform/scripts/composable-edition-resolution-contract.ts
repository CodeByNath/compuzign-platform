// Contract: composable Edition cue drives REAL Edition resolution
// (project-work/2026-09-06-tier-catalogue-admin-ux-consolidation.md,
// "composable Edition cue must drive real Edition resolution" — the
// auditor's blocker: changing the cue's UI state alone, with the server
// preview/resolver and the built quote item still hardcoded to Default, is
// a false UI state, not a fix).
//
// Properties locked:
//   1. Backend: resolveComposableOfferSelection() accepts an optional
//      editionId; null/absent behaves exactly as before (Default).
//   2. Backend [corrected round]: a real editionId swaps the WHOLE
//      container for that Edition's own raw declaration — its own
//      rate_sheet_id/rate_sheet_items/price/billing_cycle/minimum_term_*/
//      from_month/to_month/legs/headline_leg_id, the exact same shape
//      compileOccupantSlotForCostBuilder() already feeds into
//      resolveCommercialLegTimeline() to resolve each edition_option's own
//      public commercial_legs/price — never a policy-only overlay on top
//      of the Default occupant's commercial fields, and never a second/
//      parallel resolveCustomerComposableSelection() call or pricing
//      engine. customer_policy alone still follows an inherit rule (this
//      Edition's own when set, else the occupant's own).
//   3. Backend: an editionId naming no ACTIVE Edition on this occupant
//      fails closed (not_found) — never a silent fallback to Default.
//   4. Backend route: edition_id is a registered, optional REST arg,
//      sanitized and threaded through by the controller.
//   5. Frontend endpoint: resolveComposablePreview() accepts editionId and
//      includes edition_id in the POST body only when non-null.
//   6. Frontend: resolveComposableEligibleRows() accepts editionId and
//      resolves rows from that Edition's own customer_policy — the exact
//      same fallback rule as the backend, so displayed rows can never
//      drift from what the resolver will actually price against.
//   7. ComposableOfferBrowser: activeEditionId is a required prop, drives
//      `rows`/`policy` via resolveComposableEligibleRows(family,
//      activeEditionId), is passed to resolveComposablePreview(), and is a
//      dependency of both the reseed effect and the auto-commit effect.
//   8. buildComposableFamilyTierQuoteItem() accepts the resolved
//      activeEdition and sets tierEditionPlatformId/tierEditionTitle from
//      it — no hardcoded null for either field remains.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Composable Edition resolution contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const repositorySource = readFileSync(resolve(root, 'src/Modules/SurfacePackages/Repositories/PackageRepository.php'), 'utf8');
const controllerSource = readFileSync(resolve(root, 'src/Modules/CostBuilder/Http/PackageBuilderController.php'), 'utf8');
const endpointSource = readFileSync(resolve(root, 'resources/ts/api/endpoints/package-builder.ts'), 'utf8');
const browserSource = readFileSync(resolve(root, 'resources/ts/components/package-builder/ComposableOfferBrowser.tsx'), 'utf8');

// ── 1-3. Backend resolver ────────────────────────────────────────────────

check(
  /public function resolveComposableOfferSelection\(string \$familyId, array \$rawChoice, \?string \$editionId = null\): array/.test(repositorySource),
  'resolveComposableOfferSelection() accepts an optional editionId parameter, defaulting to null (Default, unchanged behavior)',
);
const resolverMatch = repositorySource.match(/public function resolveComposableOfferSelection\([\s\S]*?\n {4}\}\n/);
check(resolverMatch !== null, 'resolveComposableOfferSelection() method body is found');
const resolverBody = resolverMatch![0];
check(
  /if \(\$editionId !== null && \$editionId !== ''\) \{/.test(resolverBody),
  'the Edition overlay only runs for a real, non-empty editionId — null/empty takes the exact same path as before this correction',
);
check(
  /foreach \(PackageSchema::sanitizeTierEditions\(\$occupant\['tier_editions'\] \?\? \[\]\) as \$candidate\) \{\s*\n\s*if \(\$candidate\['id'\] === \$editionId && \(\$candidate\['platform_status'\] \?\? null\) === \$engine::STATUS_ACTIVE\) \{/.test(resolverBody),
  'the requested Edition is looked up by exact id match among the occupant\'s own ACTIVE editions only — a Pending/Disabled/Archived/Trashed Edition can never be resolved against',
);
check(
  /if \(\$edition === null\) \{\s*\n\s*return \['ok' => false, 'code' => 'not_found'\];\s*\n\s*\}/.test(resolverBody),
  'an editionId matching no active Edition fails closed (not_found) — never a silent fallback to Default, which would price the customer against a declaration they never chose',
);
check(
  /\$occupantCustomerPolicy = \$container\['customer_policy'\];\s*\n\s*\$container = \$edition;\s*\n\s*\$container\['customer_policy'\] = \$edition\['customer_policy'\] \?\? \$occupantCustomerPolicy;/.test(resolverBody),
  'the container is REPLACED with the Edition\'s own full raw declaration ($container = $edition) — never merely overlaid with its customer_policy on top of the Default occupant\'s own commercial fields; customer_policy alone still inherits from the occupant when the Edition has none of its own',
);
check(
  !/\$container\['customer_policy'\] = PackageSchema::sanitizeCustomerPolicy/.test(resolverBody),
  'no separate sanitizeCustomerPolicy() re-sanitize call remains — sanitizeTierEditions() already sanitized $edition[\'customer_policy\'] once, reused verbatim rather than re-sanitized a second time',
);
check(
  !/resolveCustomerComposableSelection\([\s\S]{0,200}resolveCustomerComposableSelection/.test(resolverBody),
  'the existing single call to resolveCustomerComposableSelection() is reused unchanged — no second/parallel resolver call was introduced',
);

// ── 4. Backend route ──────────────────────────────────────────────────────

check(
  /'edition_id' => \['required' => false, 'type' => 'string'\],/.test(controllerSource),
  'the composable-preview route registers edition_id as an optional string arg',
);
check(
  /\$editionIdParam = \$request->get_param\('edition_id'\);\s*\n\s*\$editionId = \$editionIdParam !== null \? sanitize_text_field\(\(string\) \$editionIdParam\) : null;\s*\n\s*return rest_ensure_response\(\$this->packages->resolveComposableOfferSelection\(\$familyId, \$choice, \$editionId\)\);/.test(controllerSource),
  'the controller sanitizes edition_id when present and threads it through to resolveComposableOfferSelection() as the third argument',
);

// ── 5. Frontend endpoint ──────────────────────────────────────────────────

check(
  /export function resolveComposablePreview\(\s*familyId: string,\s*choice: ComposablePreviewChoiceItem\[\],\s*editionId: string \| null = null,\s*\): Promise<ComposablePreviewResult> \{/.test(endpointSource),
  'resolveComposablePreview() accepts editionId, defaulting to null',
);
check(
  /\.\.\.\(editionId !== null \? \{ edition_id: editionId \} : \{\}\),/.test(endpointSource),
  'edition_id is included in the POST body only when editionId is non-null — an omitted/null editionId sends exactly the same body as before this correction',
);

// ── 6. resolveComposableEligibleRows is Edition-aware ─────────────────────

check(
  /export function resolveComposableEligibleRows\(family: PackageBuilderFamily, editionId: string \| null = null\): BrowseRow\[\] \{/.test(browserSource),
  'resolveComposableEligibleRows() accepts an optional editionId, defaulting to null so every existing coarse-eligibility caller (Recommendations CTA gate, Cart footer route) is unaffected',
);
check(
  /const edition = editionId !== null \? \(offer\?\.edition_options \?\? \[\]\)\.find\(\(option\) => option\.id === editionId\) \?\? null : null;\s*\n\s*const policy = edition\?\.customer_policy \?\? offer\?\.customer_policy \?\? null;/.test(browserSource),
  'the eligible-rows join resolves the target Edition\'s own customer_policy, falling back to the occupant\'s own — the identical rule the backend resolver and PackageSchema::publicTierEditionOptions() both apply, so displayed rows can never drift from what will actually be priced',
);

// ── 7. ComposableOfferBrowser wiring ───────────────────────────────────────

check(
  /activeEditionId: string \| null;/.test(browserSource),
  'ComposableOfferBrowserProps declares activeEditionId as a required prop — never optional/defaulted, so every render site must make an explicit Default-or-Edition choice',
);
check(
  /const activeEdition = activeEditionId !== null\s*\n\s*\? \(offer\?\.edition_options \?\? \[\]\)\.find\(\(option\) => option\.id === activeEditionId\) \?\? null\s*\n\s*: null;/.test(browserSource),
  'activeEdition is resolved once from activeEditionId, by real id match against offer.edition_options — never by label or array position',
);
check(
  /const rows = useMemo<BrowseRow\[\]>\(\(\) => resolveComposableEligibleRows\(family, activeEditionId\), \[offer, policy, activeEditionId\]\);/.test(browserSource),
  'rows is derived through the Edition-aware resolveComposableEligibleRows(family, activeEditionId) call, with activeEditionId in its own memo dependencies',
);
check(
  /resolveComposablePreview\(family\.family_id, choice, activeEditionId\)/.test(browserSource),
  'the debounced server preview call passes activeEditionId through — the live preview/pricing is genuinely Edition-scoped, not merely the displayed catalogue',
);
check(
  browserSource.includes('}, [family.family_id, rowIdsKey, activeEditionId]);'),
  'the mount/Family-switch reseed effect also reseeds on Edition switch — two Editions can share the same item_id set with different quantity bounds/mode, a case rowIdsKey alone would miss',
);
check(
  browserSource.includes('hasInteracted, onCommit, onRemoveFromQuote, hasReadyPrimary, activeEditionId]);'),
  'the auto-commit effect also re-runs on Edition switch',
);

// ── 8. buildComposableFamilyTierQuoteItem carries real Edition identity ───

check(
  /activeEdition: PricingEditionOption \| null = null,\s*\n\): FamilyTierQuoteItem \{/.test(browserSource),
  'buildComposableFamilyTierQuoteItem() accepts the resolved activeEdition, defaulting to null (Default, unchanged behavior for any caller that omits it)',
);
check(
  /tierEditionPlatformId: activeEdition\?\.edition_platform_id \?\? null,/.test(browserSource),
  'tierEditionPlatformId is read from activeEdition\'s own real edition_platform_id — never hardcoded null',
);
check(
  /tierEditionTitle: activeEdition\?\.label \?\? null,/.test(browserSource),
  'tierEditionTitle is read from activeEdition\'s own real label — never hardcoded null',
);
check(
  /onCommit\(buildComposableFamilyTierQuoteItem\(family, offer, choice, periods, contributions, rows, activeEdition\)\);/.test(browserSource),
  'the auto-commit effect passes the resolved activeEdition through to the builder — the committed quote item\'s Edition identity matches exactly what was previewed/priced',
);

console.log('Composable Edition resolution contract: PASS');
