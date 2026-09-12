// Contract: Cart footer "Upgrade your build" recovery route
// (project-work/2026-09-06-tier-catalogue-admin-ux-consolidation.md,
// "skipped-upgrade Cart footer recovery route").
//
// Properties locked:
//   1. Eligibility (PackageBuilderApp): the footer action is offered only
//      for the currently active Family — a quoted primary must exist, no
//      composable/Upgrades line may be committed yet, and
//      resolveComposableEligibleRows(family) (the SAME shared authority
//      FamilyTierAdapter's own commitSelection gate already uses) must be
//      non-empty. Never "first item in Cart" or a rendered label.
//   2. Disappearance: the same composableItem === null check that grants
//      eligibility is what makes it disappear once a composable line
//      exists — mutually exclusive with the deployed Manage build route
//      by construction, never a second independent check.
//   3. QuoteSummary stays generic: an optional onUpgradeYourBuild callback,
//      absent for CostBuilderApp.tsx (no Upgrade Your Build concept).
//      Presentation (project-work/2026-09-12-cart-upgrade-secondary-cta.md):
//      it is no longer a text-link beside View details — it renders as the
//      full-width SECONDARY CTA directly BELOW the primary Review &
//      Finalise Quote button, inside the shared footer-actions group, on
//      the same onUpgradeYourBuild condition as before. View details keeps
//      the footer-links row to itself. Order/conditional rendering and
//      class/style ownership are locked in 6 below.
//   4. Cross-Family routing reuses Manage build's own race-safe request
//      path (requestManageBuild) rather than a second navigation state
//      machine — the footer click supplies the ACTIVE Family's own
//      identity (family.family_id/family.tier_instance_id), never "first
//      item in Cart" or anything derived from a rendered item/label.
//   5. Direct browsing re-entry with no composable item yet, via its OWN
//      complete 'start_upgrade' intent guard (auditor correction,
//      "intent-safe shared Cart-to-browsing request"): the footer route
//      supplies 'start_upgrade' on its request, and FamilyTierAdapter's
//      consuming effect opens browsing for that intent only when the
//      primary exists, NO composable item is committed, and the catalogue
//      is eligible — never merely "eligible catalogue" alone, and never
//      substitutable with 'manage_existing's own separate guard (see
//      manage-build-contract.ts for that side of the same correction).
//   6. Manage build's own semantics (button gating, race safety, one-shot
//      consumption, no mutation on entry, unchanged Add-to-Quote exit) are
//      independently locked in manage-build-contract.ts and are not
//      re-asserted here beyond the shared-guard check in #5 above.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Upgrade build footer contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const quoteSummarySource = readFileSync(resolve(root, 'resources/ts/components/cost-builder/QuoteSummary.tsx'), 'utf8');
const adapterSource = readFileSync(resolve(root, 'resources/ts/components/package-builder/FamilyTierAdapter.tsx'), 'utf8');
const appSource = readFileSync(resolve(root, 'resources/ts/components/package-builder/PackageBuilderApp.tsx'), 'utf8');
const costBuilderAppSource = readFileSync(resolve(root, 'resources/ts/components/cost-builder/CostBuilderApp.tsx'), 'utf8');
const cssSource = readFileSync(resolve(root, 'resources/css/modules/cost-builder.css'), 'utf8');

// ── 1 & 2. PackageBuilderApp: eligibility + disappearance ──────────────────

check(
  /import \{ resolveComposableEligibleRows \} from '\.\/ComposableOfferBrowser';/.test(appSource),
  'PackageBuilderApp imports the shared eligibility function directly, never re-deriving a second catalogue test',
);
const eligibilityMatch = appSource.match(/const showUpgradeYourBuildFooter = primary !== null\s*\n\s*&& composableItem === null\s*\n\s*&& resolveComposableEligibleRows\(family\)\.length > 0;/);
check(
  eligibilityMatch !== null,
  'showUpgradeYourBuildFooter requires a quoted primary, no committed composable/Upgrades line (composableItem === null — the SAME check that governs Manage build\'s own presence, so the two routes are mutually exclusive by construction), and a non-empty resolveComposableEligibleRows(family)',
);
check(
  !/showUpgradeYourBuildFooter[\s\S]{0,200}items\[0\]|showUpgradeYourBuildFooter[\s\S]{0,200}\.label/.test(appSource),
  'eligibility never derives the target from "first item in Cart" or a rendered label',
);

// ── 3. QuoteSummary: optional prop, secondary CTA below the primary ───────

check(
  /onUpgradeYourBuild\?: \(\) => void;/.test(quoteSummarySource),
  'QuoteSummary declares onUpgradeYourBuild as an optional prop',
);
check(
  !/onUpgradeYourBuild/.test(costBuilderAppSource),
  'CostBuilderApp.tsx (the other QuoteSummary caller) never references onUpgradeYourBuild — omitting the prop leaves it unaffected',
);
const footerLinksMatch = quoteSummarySource.match(/<div class="cz-quote-summary__footer-links">([\s\S]*?)<\/div>/);
check(footerLinksMatch !== null, 'the footer-links row wrapper exists');
const footerLinksBody = footerLinksMatch![1];
check(
  /View details\s*\n\s*<\/button>/.test(footerLinksBody),
  'View details keeps its existing link-style role inside the footer-links row',
);
check(
  !footerLinksBody.includes('onUpgradeYourBuild'),
  'Upgrade your build no longer renders inside the footer-links row — it moved below the primary CTA',
);

const footerActionsMatch = quoteSummarySource.match(/<div class="cz-quote-summary__footer-actions">([\s\S]*?)<\/div>/);
check(footerActionsMatch !== null, 'the footer-actions CTA group wrapper exists');
const footerActionsBody = footerActionsMatch![1];
const primaryIndex = footerActionsBody.indexOf('cz-btn cz-btn-primary cz-quote-summary__cta');
const secondaryIndex = footerActionsBody.indexOf('{onUpgradeYourBuild && (');
check(primaryIndex !== -1, 'the primary Review & Finalise Quote button renders inside the CTA group');
check(secondaryIndex !== -1, 'the Upgrade your build button renders inside the CTA group');
check(
  primaryIndex < secondaryIndex,
  'Review & Finalise Quote stays the primary and renders BEFORE the secondary Upgrade your build button in source/DOM order',
);
check(
  /onClick=\{onOpenReview\}/.test(footerActionsBody),
  'the primary button keeps its own unchanged onOpenReview action',
);
check(
  /\{onUpgradeYourBuild && \(/.test(footerActionsBody),
  'the secondary button renders ONLY under the same onUpgradeYourBuild condition as before — an ineligible render produces no empty secondary-button space',
);
check(
  /class="cz-btn cz-quote-summary__cta cz-quote-summary__upgrade-your-build"/.test(footerActionsBody),
  'the secondary button takes its shape/width from the shared .cz-btn primitive plus .cz-quote-summary__cta (a matched pair with the primary above it), never a bespoke button of its own',
);
check(
  !/cz-btn-primary[\s\S]{0,120}Upgrade your build/.test(footerActionsBody),
  'the secondary button never takes the primary .cz-btn-primary treatment',
);
check(
  /onClick=\{onUpgradeYourBuild\}\s*>\s*\n\s*Upgrade your build/.test(footerActionsBody),
  'the button calls onUpgradeYourBuild directly with no wrapping/derived argument',
);

// ── 4. Cross-Family routing reuses the shared request helper ───────────────

check(
  /onUpgradeYourBuild=\{showUpgradeYourBuildFooter\s*\n\s*\? \(\) => requestManageBuild\(family\.family_id, family\.tier_instance_id, 'start_upgrade'\)\s*\n\s*: undefined\}/.test(appSource),
  'the footer click calls the SAME requestManageBuild helper Manage build uses, supplying the ACTIVE Family\'s own family_id/tier_instance_id and the \'start_upgrade\' intent — never a second request-building path, never derived from a cart item',
);

// ── 5. FamilyTierAdapter: browsing opens with no composable item yet, via its own complete guard ─

const consumeEffectMatch = adapterSource.match(/useEffect\(\(\) => \{\s*if \(!manageBuildRequest\) return;([\s\S]*?)\}, \[manageBuildRequest, family\.family_id, family\.tier_instance_id\]\);/);
check(consumeEffectMatch !== null, 'the manageBuildRequest-consuming effect exists');
const consumeEffectBody = consumeEffectMatch![1];
check(
  /const intentSatisfied = manageBuildRequest\.intent === 'manage_existing'\s*\n\s*\? !!selectedComposableItem\s*\n\s*: selectedComposableItem === null && resolveComposableEligibleRows\(family\)\.length > 0;/.test(consumeEffectBody),
  '\'start_upgrade\' has its own complete guard — selectedComposableItem === null AND a non-empty resolveComposableEligibleRows(family) — never merely "eligible catalogue" alone, and never satisfied by \'manage_existing\'\'s own (different) guard, so a stray manage_existing request can never open a fresh start_upgrade session and vice versa',
);
check(
  !/upsertFamilyComposable|onComposableCommit\(/.test(consumeEffectBody),
  'opening browsing with no composable item performs no synthetic commit — the line is created later only by ComposableOfferBrowser\'s own existing auto-sync, never by this effect',
);

// ── 6. Secondary CTA style ownership (accent outline, not a new system) ────

const secondaryRestMatch = cssSource.match(/\.cz-quote-summary__upgrade-your-build \{([^}]*)\}/s);
check(secondaryRestMatch !== null, '.cz-quote-summary__upgrade-your-build has its own rest-state rule');
const secondaryRest = secondaryRestMatch![1];
check(
  /border-color:\s*var\(--cz-color-accent\);/.test(secondaryRest)
    && /color:\s*var\(--cz-color-accent\);/.test(secondaryRest)
    && /background:\s*transparent;/.test(secondaryRest),
  'at rest the secondary CTA is the established accent-outline treatment — accent border, accent label, transparent background — using the shared accent token, never a bespoke colour',
);
check(
  !/text-decoration:\s*underline;/.test(secondaryRest),
  'the old quiet text-link treatment is gone, not left behind alongside the button treatment',
);

const secondaryHoverMatch = cssSource.match(/\.cz-quote-summary__upgrade-your-build:hover,\s*\n\.cz-quote-summary__upgrade-your-build:focus-visible \{([^}]*)\}/s);
check(secondaryHoverMatch !== null, 'hover and focus-visible share one rule, so keyboard focus gets the same treatment as hover');
const secondaryHover = secondaryHoverMatch![1];
check(
  /background:\s*var\(--cz-color-accent\);/.test(secondaryHover) && /color:\s*#000;/.test(secondaryHover),
  'on hover/focus the secondary CTA fills accent with dark text — the SAME recipe .cz-cost-builder__tier-choose already uses, keeping it in the existing secondary-action visual family',
);

check(
  /\.cz-cost-builder__tier-choose:hover \{[^}]*background:\s*var\(--cz-color-accent\);[^}]*color:\s*#000;[^}]*\}/s.test(cssSource),
  'the Tier choose action this treatment is reused from still carries that same accent-fill hover — if it ever changes, this reuse claim must be re-checked rather than silently drifting',
);

check(
  /\.cz-quote-summary__footer-actions \{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*\}/s.test(cssSource),
  '.cz-quote-summary__footer-actions stacks the primary and secondary CTAs in one column',
);
check(
  /\.cz-quote-summary__footer-links \{[^}]*display:\s*flex;[^}]*\}/s.test(cssSource),
  '.cz-quote-summary__footer-links still lays its (now single) entry out as a row',
);

console.log('Upgrade build footer contract: PASS');
