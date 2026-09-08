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
//      rendered immediately before the existing View details entry point,
//      absent for CostBuilderApp.tsx (no Upgrade Your Build concept).
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

// ── 3. QuoteSummary: optional prop, rendered before View details ───────────

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
const upgradeIndex = footerLinksBody.indexOf('onUpgradeYourBuild &&');
const viewDetailsIndex = footerLinksBody.indexOf('onOpenDetails && orderedFamilyTierItems.length > 0 &&');
check(upgradeIndex !== -1 && viewDetailsIndex !== -1, 'both the Upgrade your build and View details conditional blocks exist inside the row');
check(
  upgradeIndex < viewDetailsIndex,
  'Upgrade your build renders immediately BEFORE View details in source/DOM order',
);
check(
  /onClick=\{onUpgradeYourBuild\}\s*>\s*\n\s*Upgrade your build/.test(footerLinksBody),
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

// ── 6. Button styled as a quiet text link inside the row ───────────────────

check(
  /\.cz-quote-summary__upgrade-your-build \{[^}]*text-decoration:\s*underline;[^}]*\}/s.test(cssSource),
  '.cz-quote-summary__upgrade-your-build exists as a quiet text-link style, matching the row\'s other entries rather than a new primary-button treatment',
);
check(
  /\.cz-quote-summary__footer-links \{[^}]*display:\s*flex;[^}]*\}/s.test(cssSource),
  '.cz-quote-summary__footer-links lays the two entries out in one row',
);

console.log('Upgrade build footer contract: PASS');
