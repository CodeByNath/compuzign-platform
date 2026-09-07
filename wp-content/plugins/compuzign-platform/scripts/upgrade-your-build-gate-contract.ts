// Contract: "Upgrade your build" gate, Phase 2+3+4 shell/state/catalogue
// routing/right-side summary (project-work/2026-09-06-tier-catalogue-
// admin-ux-consolidation.md).
// FamilyTierAdapter/PackageBuilderApp carry too much live-fetched Family/
// pricing state to instantiate standalone in a script — same reasoning
// package-builder-addon-focus-contract.ts already documents for this exact
// component pair — so this locks the source facts that produce the
// required behavior, matching that established convention rather than
// re-deriving a DOM-render harness for it.
//
// Properties locked:
//   1. the gate's eligibility trigger reuses Phase 1's shared
//      resolveComposableEligibleRows(family) — never a second, parallel
//      "does this Tier have a catalogue" rule;
//   2. the gate's own validity (both 'pending' and 'browsing' — one shared
//      derivation, no separate rule per stage) is derived the SAME way
//      stagedTier already is (belongs-to-tier comparison against the live
//      selectedTierId prop, not a bare boolean) — so it can never survive a
//      primary swap/removal on its own, the identical "no separate reset
//      needed for that case" reasoning stagedTier already relies on;
//   3. the gate ('pending') and browsing branches take priority over
//      (appear before, in source order) the stagedTier/Recommendations
//      branch, so Recommendations never renders underneath either stage;
//   4. the Family-switch reset effect clears the gate too, guarding the
//      same TierId-collision-across-Families class of bug the other
//      focused-state resets already guard against;
//   5. Maybe next time clears the gate via the same two setters commit uses
//      to open it — no separate/duplicate reset path — and only exists in
//      the 'pending' branch (no browsing-stage exit yet; that is Phase 4's
//      stage-exit CTA, not this phase's);
//   6. Browse Catalogue is now active and sets the gate to 'browsing' —
//      Phase 2's disabled placeholder is gone;
//   7. the pending branch's own JSX contains no ComposableOfferBrowser —
//      the catalogue never appears stacked underneath the gate;
//   8. ComposableOfferBrowser's mount condition is narrowed from Phase 1/2's
//      selectedTierId !== null to upgradeGateActive === 'browsing' — mounts
//      only for the intended stage, with the exact same props/pipeline;
//   9. onCommit/onRemoveFromQuote are still passed through unwrapped
//      (onComposableCommit/onComposableRemove directly) — auto-sync while
//      browsing can never clear the gate, because nothing in that path
//      touches upgradeGateTierId/upgradeGateStage at all;
//   10. PackageBuilderApp suppresses BOTH QuoteSummary and MobileQuoteBar
//       while the gate is active (either stage), via the one boolean
//       FamilyTierAdapter reports up — `items` itself is never touched by
//       any of this;
//   11. the browsing stage renders UpgradeBuildSummary beside
//       ComposableOfferBrowser, wired with the exact same
//       selectedPrimaryItem/selectedComposableItem this component already
//       has — no new state computed for it;
//   12. UpgradeBuildSummary's own exit action is dismissUpgradeGate, never
//       onComposableCommit/onComposableRemove — it cannot perform a quote
//       mutation, only end the gate;
//   13. [Phase 4 correction — "scoped Cart presentation reuse"] the
//       auditor rejected an earlier version that computed its own
//       simplified monetary presentation (flat primary price/cycle,
//       composableItem.inclusionItems label×quantity rows, a "See Cart"
//       fallback for multi-stream items). QuoteSummary.tsx's own per-item
//       and totals presentation is now extracted into two exported
//       functions — QuoteItemPricePresentation, QuoteTotalsPresentation —
//       which QuoteSummary itself calls (so there is exactly one place
//       this presentation lives), and UpgradeBuildSummary imports and
//       calls the SAME two functions, scoped to just [primaryItem,
//       composableItem] — never a second/simplified computation, never a
//       client-side quantity fallback, never a "See Cart" placeholder;
//   14. UpgradeBuildSummary imports no cart-mutating function from
//       utils/quote.ts (no upsert/remove/replace) and renders exactly one
//       button — no second Continue/Done/Finish action alongside it;
//   15. [Correction round — "Require Upgrade inclusion rows in scoped Cart
//       presentation"] the price/totals reuse alone dropped the selected
//       Upgrade inclusions entirely. UpgradeBuildSummary now also calls
//       disclosureRowsForFamilyTierItem(composableItem) — the SAME
//       authoritative row derivation QuoteSummary's own inclusion
//       disclosure panel uses for this exact item — and renders each row's
//       label plus " × quantity" ONLY when that row's resolved quantity is
//       not null, never defaulting/reconstructing one client-side;
//   16. [Phase 5 — mobile stacking] the browsing-stage layout is
//       mobile-first (a plain column, catalogue then summary in DOM
//       order — no `order` override) and only switches to a two-column
//       row at the SAME min-width: 1024px breakpoint the real Cart-vs-main
//       sidebar relationship already uses, rather than an ad hoc flex-wrap
//       point — this stage structurally replaces that sidebar, so it
//       stacks/unstacks at the identical width.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Upgrade your build gate contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const adapterSource = readFileSync(resolve(root, 'resources/ts/components/package-builder/FamilyTierAdapter.tsx'), 'utf8');
const appSource = readFileSync(resolve(root, 'resources/ts/components/package-builder/PackageBuilderApp.tsx'), 'utf8');
const summarySource = readFileSync(resolve(root, 'resources/ts/components/package-builder/UpgradeBuildSummary.tsx'), 'utf8');
const quoteSummarySource = readFileSync(resolve(root, 'resources/ts/components/cost-builder/QuoteSummary.tsx'), 'utf8');
const cssSource = readFileSync(resolve(root, 'resources/css/modules/cost-builder.css'), 'utf8');

// ── 1. Shared eligibility, not a second rule ────────────────────────────────

check(
  /import\s*\{\s*ComposableOfferBrowser,\s*resolveComposableEligibleRows\s*\}\s*from\s*'\.\/ComposableOfferBrowser'/.test(adapterSource),
  'FamilyTierAdapter imports the Phase 1 shared eligibility function from ComposableOfferBrowser, rather than re-deriving the offer/policy/rows join itself',
);
check(
  /const\s+hasCatalogue\s*=\s*resolveComposableEligibleRows\(family\)\.length\s*>\s*0;/.test(adapterSource),
  'commitSelection computes catalogue eligibility via the shared function on the live family prop',
);
check(
  /setUpgradeGateTierId\(hasCatalogue \? tierId : null\);\s*\n\s*setUpgradeGateStage\(hasCatalogue \? 'pending' : null\);/.test(adapterSource),
  "commitSelection opens the gate to 'pending' only when the shared eligibility check is non-empty, otherwise leaves it null (today's existing continuation)",
);

// ── 2. Gate validity derived like stagedTier, not a bare boolean ───────────

check(
  /const \[upgradeGateTierId, setUpgradeGateTierId\] = useState<TierId \| null>\(null\);/.test(adapterSource),
  'upgradeGateTierId exists, tracking which exact Tier the gate belongs to',
);
check(
  /const upgradeGateActive = upgradeGateTierId !== null && upgradeGateTierId === selectedTierId\s*\n\s*\? upgradeGateStage\s*\n\s*: null;/.test(adapterSource),
  'upgradeGateActive is derived by comparing upgradeGateTierId against the live selectedTierId prop, the same belongs-to-tier pattern stagedTier already uses — so a primary swap/removal invalidates it automatically',
);

// ── 3. Gate + browsing branches precede stagedTier branch in source order ──

const gateBranchIndex = adapterSource.indexOf("} else if (upgradeGateActive === 'pending') {");
const browsingBranchIndex = adapterSource.indexOf("} else if (upgradeGateActive === 'browsing') {");
const stagedBranchIndex = adapterSource.indexOf('} else if (stagedTier) {');
check(gateBranchIndex !== -1, 'the pending gate render branch exists');
check(browsingBranchIndex !== -1, 'the browsing render branch exists');
check(stagedBranchIndex !== -1, 'the stagedTier render branch still exists');
check(
  gateBranchIndex < browsingBranchIndex && browsingBranchIndex < stagedBranchIndex,
  'the pending branch, then the browsing branch, are both checked before stagedTier in the if/else-if chain, so either active stage always wins over Recommendations',
);
check(
  /\}\s*else if \(upgradeGateActive === 'browsing'\) \{\s*mainContent = null;/.test(adapterSource),
  "the browsing branch sets mainContent to null — the catalogue (a sibling further down, gated on this same stage) is the sole visible content, never stacked beneath a stale grid/staged view",
);

// ── 4. Family-switch reset also clears the gate ─────────────────────────────

const familySwitchEffectMatch = adapterSource.match(/useEffect\(\(\) => \{\s*setFocusedTierId\(null\);[\s\S]*?\}, \[family\.family_id\]\);/);
check(familySwitchEffectMatch !== null, 'the Family-switch reset effect exists');
check(
  /setUpgradeGateTierId\(null\);\s*\n\s*setUpgradeGateStage\(null\);/.test(familySwitchEffectMatch![0]),
  'the Family-switch reset effect clears the gate too, guarding the same TierId-collision-across-Families class of bug as focusedTierId/stagedTierId',
);

// ── 5. Maybe next time reuses the exact same reset path ────────────────────

check(
  /const dismissUpgradeGate = \(\) => \{\s*setUpgradeGateTierId\(null\);\s*setUpgradeGateStage\(null\);\s*\};/.test(adapterSource),
  'dismissUpgradeGate clears the gate via the same two setters commitSelection uses to open it',
);
check(
  /onClick=\{dismissUpgradeGate\}\s*>\s*\n\s*Maybe next time/.test(adapterSource),
  "the gate panel's Maybe next time button calls dismissUpgradeGate",
);

// ── 6. Browse Catalogue is now active, opening the browsing stage ──────────

const pendingBranchSource = adapterSource.slice(gateBranchIndex, browsingBranchIndex);
check(/Browse Catalogue/.test(pendingBranchSource), 'the gate panel renders a Browse Catalogue action');
check(
  !/disabled/.test(pendingBranchSource),
  "Browse Catalogue is no longer disabled — Phase 2's inert placeholder is gone",
);
check(
  /onClick=\{\(\) => setUpgradeGateStage\('browsing'\)\}\s*>\s*\n\s*Browse Catalogue/.test(pendingBranchSource),
  "Browse Catalogue's click handler sets the gate stage to 'browsing'",
);

// ── 7. The pending branch's own JSX renders no ComposableOfferBrowser ──────

check(
  !/ComposableOfferBrowser/.test(pendingBranchSource),
  'the pending branch never mentions ComposableOfferBrowser at all — the catalogue cannot appear stacked underneath the gate',
);

// ── 8. ComposableOfferBrowser mounts only for the browsing stage ───────────

check(
  /\{upgradeGateActive === 'browsing' && \(\s*\n\s*<div class="cz-package-builder__upgrade-browsing">\s*\n\s*<ComposableOfferBrowser/.test(adapterSource),
  "ComposableOfferBrowser's render gate is narrowed to upgradeGateActive === 'browsing' — mounts only for the intended stage",
);
check(
  !/\{selectedTierId !== null && \(\s*\n\s*<ComposableOfferBrowser/.test(adapterSource),
  'the old, broader selectedTierId !== null mount condition is gone, not left as a second/redundant gate',
);

// ── 9. Auto-sync while browsing can never clear the gate ───────────────────

const composableBrowserBlockMatch = adapterSource.match(/<ComposableOfferBrowser[\s\S]*?\/>/);
check(composableBrowserBlockMatch !== null, 'the ComposableOfferBrowser render call exists');
check(
  /onCommit=\{onComposableCommit\}/.test(composableBrowserBlockMatch![0]),
  'onCommit is still the parent-provided onComposableCommit callback directly, not wrapped in a new inline function',
);
check(
  /onRemoveFromQuote=\{onComposableRemove\}/.test(composableBrowserBlockMatch![0]),
  'onRemoveFromQuote is still the parent-provided onComposableRemove callback directly, not wrapped',
);
check(
  !/setUpgradeGateStage|setUpgradeGateTierId/.test(composableBrowserBlockMatch![0]),
  'no gate setter is referenced anywhere in the ComposableOfferBrowser render call — auto-commit/remove events have no path to touch gate state',
);

// ── 10. PackageBuilderApp suppresses Cart + MobileQuoteBar via the one flag ─

check(
  /const \[upgradeGateActive, setUpgradeGateActive\] = useState\(false\);/.test(appSource),
  'PackageBuilderApp holds the one reported-up boolean, not a duplicate of the gate\'s own internal shape',
);
check(
  /onUpgradeGateActiveChange=\{setUpgradeGateActive\}/.test(appSource),
  'FamilyTierAdapter is wired with the state setter directly — a stable identity, no unnecessary wrapper',
);
check(
  /\{items\.length > 0 && !upgradeGateActive && \(/.test(appSource),
  'QuoteSummary stays conditioned on items.length as before, with the gate flag added — items itself is never touched',
);
check(
  /\{!upgradeGateActive && <MobileQuoteBar items=\{items\} summaryId=\{SUMMARY_ID\} \/>\}/.test(appSource),
  'MobileQuoteBar is suppressed the same way',
);

// ── 11. UpgradeBuildSummary renders beside the browser, wired minimally ────

check(
  /import \{ UpgradeBuildSummary \} from '\.\/UpgradeBuildSummary';/.test(adapterSource),
  'FamilyTierAdapter imports UpgradeBuildSummary',
);
const browsingBlockMatch = adapterSource.match(/\{upgradeGateActive === 'browsing' && \(\s*\n\s*<div class="cz-package-builder__upgrade-browsing">[\s\S]*?\n\s*\)\}/);
check(browsingBlockMatch !== null, 'the browsing-stage wrapper div exists, gated on the same upgradeGateActive === \'browsing\' condition');
check(
  /<UpgradeBuildSummary\s+primaryItem=\{selectedPrimaryItem\}\s+composableItem=\{selectedComposableItem\}\s+onExit=\{dismissUpgradeGate\}\s*\/>/.test(browsingBlockMatch![0]),
  'UpgradeBuildSummary is wired with the exact same selectedPrimaryItem/selectedComposableItem props already available, and onExit is dismissUpgradeGate — no new state, no onComposableCommit/onComposableRemove path',
);

// ── 12. QuoteSummary's own per-item/totals presentation is extracted, not duplicated ─

check(
  /export function QuoteItemPricePresentation\(\{ item, items \}: \{ item: CartItem; items: CartItem\[\] \}\)/.test(quoteSummarySource),
  'QuoteSummary.tsx exports QuoteItemPricePresentation — the extracted per-item title/tier-label/payment-stream presentation',
);
check(
  /export function QuoteTotalsPresentation\(\{ items \}: \{ items: CartItem\[\] \}\)/.test(quoteSummarySource),
  'QuoteSummary.tsx exports QuoteTotalsPresentation — the extracted totals-footer presentation, parameterized by whatever items it is given',
);
check(
  /<QuoteItemPricePresentation item=\{item\} items=\{items\} \/>/.test(quoteSummarySource),
  'QuoteSummary itself calls QuoteItemPricePresentation for its own per-item rows — one place this presentation lives, not a copy kept in sync',
);
check(
  /<QuoteTotalsPresentation items=\{items\} \/>/.test(quoteSummarySource),
  'QuoteSummary itself calls QuoteTotalsPresentation for its own footer — same reasoning',
);
const quoteSummaryFunctionIndex = quoteSummarySource.indexOf('export function QuoteSummary(');
check(quoteSummaryFunctionIndex !== -1, 'the QuoteSummary function itself exists');
const quoteSummaryFunctionBody = quoteSummarySource.slice(quoteSummaryFunctionIndex);
check(
  !/calcQuoteTotals\(items\)/.test(quoteSummaryFunctionBody),
  'the QuoteSummary function body itself no longer calls calcQuoteTotals directly — it now only reaches that logic via <QuoteTotalsPresentation items={items} />',
);
check(
  !/computeTotalContractValue|startingPaymentsByCycle/.test(quoteSummaryFunctionBody),
  'the QuoteSummary function body itself no longer computes TCV/starting-payment figures directly — that logic lives only inside QuoteTotalsPresentation now',
);

// ── 13. UpgradeBuildSummary reuses those same two functions, scoped to primary+composable ─

check(
  /import \{ QuoteItemPricePresentation, QuoteTotalsPresentation \} from '@\/components\/cost-builder\/QuoteSummary';/.test(summarySource),
  'UpgradeBuildSummary imports the two extracted presentation functions from QuoteSummary.tsx directly',
);
check(
  /const scopedItems: FamilyTierQuoteItem\[\] = \[primaryItem, composableItem\]\.filter\(/.test(summarySource),
  'the scoped item list is exactly [primaryItem, composableItem] (nulls filtered) — never the whole cart, never a third synthesized item',
);
check(
  /<QuoteItemPricePresentation item=\{item\} items=\{scopedItems\} \/>/.test(summarySource),
  'each scoped item is rendered via the shared presentation function, not a bespoke row',
);
check(
  /<QuoteTotalsPresentation items=\{scopedItems\} \/>/.test(summarySource),
  'totals are computed by calling the shared totals-presentation function on the scoped items — never a second/simplified totals computation',
);
check(
  !/calcQuoteTotals|composableItem\?\.inclusionItems|\.composableSelection\b|See Cart|quantity \?\? 1/.test(summarySource),
  'none of the rejected round\'s bespoke monetary logic survives: no direct calcQuoteTotals call, no inclusionItems label×quantity rows, no composableSelection read, no "See Cart" fallback, no client-side quantity ?? 1 reconstruction',
);

// ── 14. No cart mutation, exactly one exit button ───────────────────────────

check(
  !/upsertFamily|removeFamily|replaceFamily|upsertAddon|replaceNormal|removeAddon|removeService/.test(summarySource),
  'UpgradeBuildSummary imports/calls no cart-mutating function at all',
);
const summaryButtonMatches = summarySource.match(/<button/g) ?? [];
check(
  summaryButtonMatches.length === 1,
  'UpgradeBuildSummary renders exactly one button — the single Add to Quote stage-exit action, no second Continue/Done/Finish control',
);
check(
  /onClick=\{onExit\}/.test(summarySource) && !/onComposableCommit|onComposableRemove/.test(summarySource),
  'the one button calls onExit (dismissUpgradeGate, wired by the parent) — UpgradeBuildSummary itself never references onComposableCommit/onComposableRemove, so it structurally cannot perform a quote mutation',
);

// ── 15. Upgrade inclusion rows reuse the existing Cart disclosure derivation ─

check(
  /import \{ disclosureRowsForFamilyTierItem \} from '@\/components\/cost-builder\/InclusionDisclosure';/.test(summarySource),
  'UpgradeBuildSummary imports the same row derivation QuoteSummary\'s own inclusion disclosure panel uses, rather than reading composableItem fields directly',
);
check(
  /const upgradeInclusionRows = composableItem \? disclosureRowsForFamilyTierItem\(composableItem\) : \[\];/.test(summarySource),
  'the Upgrade inclusion rows are exactly disclosureRowsForFamilyTierItem(composableItem) when a composable line exists, empty otherwise',
);
check(
  /\{row\.label\}\s*\n[\s\S]{0,300}?\{row\.quantity !== null && ` × \$\{row\.quantity\}`\}/.test(summarySource),
  'each row shows its label plus " × quantity" only when that row\'s resolved quantity is not null — never a defaulted/reconstructed quantity',
);
check(
  !/row\.quantity\s*\?\?/.test(summarySource),
  'no ?? fallback is ever applied to a row\'s quantity',
);
check(
  /row\.isChild/.test(summarySource),
  'row.isChild (Bundle/child hierarchy) is read and reflected in the rendered markup, not flattened away',
);

// ── 16. Browsing stage stacks mobile-first at the same breakpoint as the real Cart sidebar ─

const browsingCssMatch = cssSource.match(/\.cz-package-builder__upgrade-browsing \{([^}]*)\}/);
check(browsingCssMatch !== null, '.cz-package-builder__upgrade-browsing rule exists');
check(
  /flex-direction:\s*column;/.test(browsingCssMatch![1]),
  'the browsing-stage layout is a plain column by default (mobile-first) — catalogue then summary in DOM order, no `order` override needed',
);
const desktopBrowsingMediaMatch = cssSource.match(/@media \(min-width: 1024px\) \{\s*\.cz-package-builder__upgrade-browsing \{([^}]*)\}/);
check(desktopBrowsingMediaMatch !== null, 'a min-width: 1024px media query switches the browsing-stage layout to two columns');
check(
  /flex-direction:\s*row;/.test(desktopBrowsingMediaMatch![1]),
  'the two-column switch happens at min-width: 1024px — the same breakpoint .cz-cost-builder__body already uses for the real Cart-vs-main sidebar relationship, not an ad hoc flex-wrap point',
);

console.log('Upgrade your build gate contract: PASS');
