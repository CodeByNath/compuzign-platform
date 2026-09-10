// Contract: "Upgrade your build" CTA relocated into Recommendations, and
// the composable occupant's browsing stage sharing the normal focused shell
// (project-work/2026-09-06-tier-catalogue-admin-ux-consolidation.md,
// post-rollback correction). Supersedes upgrade-your-build-gate-contract.ts
// and upgrade-shell-visual-parity-contract.ts (deleted — their entire
// subject, the standalone gate panel and the bespoke
// .cz-package-builder__upgrade-browsing wrapper, no longer exists).
// FamilyTierAdapter/PricingTiers carry too much live-fetched Family/pricing
// state to instantiate standalone in a script — same reasoning
// package-builder-addon-focus-contract.ts already documents for this exact
// component pair — so this locks the source facts that produce the
// required behavior.
//
// Properties locked:
//   1. The standalone full-panel gate branch is gone: 'pending' no longer
//      has its own mainContent branch — the CTA renders only inside the
//      stagedTier branch's Recommendations, via a new PricingTiers prop.
//   2. PricingTiers accepts recommendationsCta/hideAddonsInRecommendations
//      and renders the CTA inside recommendationsShell, suppressing the
//      add-on cards only while hideAddonsInRecommendations is true.
//   3. The composable browsing stage ('browsing') builds real mainContent —
//      the shared .cz-package-builder__focused shell — never null, and
//      there is no separate bottom-sibling block for it anymore.
//   4. Inside that shell, the top tab row is wired to the COMPOSABLE
//      occupant's own edition_options (family.pricing.composable_offer),
//      never the already-quoted primary's — Build Your Own is a real
//      occupant with its own Default/Edition context now, not a guest
//      inside the primary's own tab.
//   5. ComposableOfferBrowser/UpgradeBuildSummary are still passed through
//      with the exact same props as before this correction — only their
//      wrapper changed.
//   6. Close (X) inside composable browsing calls dismissUpgradeGate, the
//      same single exit path Add-to-Quote-inside-the-shell (UpgradeBuild
//      Summary's own onExit) already uses — never a second exit action.
//   7. composableEditionId (the new piece of state the top tab row needs)
//      is reset alongside the gate itself, both on dismiss and on Family
//      switch — never left stale across a fresh browsing entry.
//   8. Dead code sweep: no trace of the removed standalone gate panel or
//      the bespoke upgrade-browsing wrapper/CSS remains.
//   9. [Correction] commitSelection() stages the primary whenever EITHER
//      add-on Tiers exist OR the composable catalogue is eligible — a
//      catalogue-only Family (zero add-on Tiers) must still reach the
//      stagedTier branch, since the CTA itself now lives inside
//      Recommendations rather than a separate always-shown view.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Composable recommendations CTA contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const adapterSource = readFileSync(resolve(root, 'resources/ts/components/package-builder/FamilyTierAdapter.tsx'), 'utf8');
const pricingTiersSource = readFileSync(resolve(root, 'resources/ts/components/cost-builder/PricingTiers.tsx'), 'utf8');
const cssSource = readFileSync(resolve(root, 'resources/css/modules/cost-builder.css'), 'utf8');

// ── 1. No standalone full-panel gate branch ─────────────────────────────

check(
  !/upgradeGateActive === 'pending'\) \{\s*\n\s*mainContent = \(/.test(adapterSource),
  "there is no more standalone `} else if (upgradeGateActive === 'pending') { mainContent = (` branch — the 'pending' stage no longer produces its own top-level view",
);
check(
  !/class="cz-package-builder__upgrade-gate"/.test(adapterSource),
  'the old full-bleed panel class (cz-package-builder__upgrade-gate, no suffix) is gone from the source — only the relocated -inline variant remains',
);

// ── 2. CTA is built inside the stagedTier branch, gated on 'pending' ────

const stagedBranchMatch = adapterSource.match(/\} else if \(stagedTier\) \{([\s\S]*?)\n {2}\} else \{/);
check(stagedBranchMatch !== null, 'the stagedTier branch exists');
const stagedBranchBody = stagedBranchMatch![1];
check(
  /const recommendationsCta = upgradeGateActive === 'pending' \? \(/.test(stagedBranchBody),
  "recommendationsCta is derived locally inside the stagedTier branch, gated on the SAME tier-scoped upgradeGateActive === 'pending' derivation used everywhere else in this file — never a second/parallel eligibility check",
);
check(
  /class="cz-package-builder__upgrade-gate-inline"/.test(stagedBranchBody)
    && /Your plan is already in the quote/.test(stagedBranchBody)
    && /Upgrade your build<\/h3>/.test(stagedBranchBody)
    && /Browse Catalogue/.test(stagedBranchBody)
    && /Maybe next time/.test(stagedBranchBody),
  'the relocated CTA keeps the exact same eyebrow/heading copy and both actions (Browse Catalogue, Maybe next time) the old standalone panel had',
);
check(
  /onClick=\{\(\) => setUpgradeGateStage\('browsing'\)\}/.test(stagedBranchBody),
  'Browse Catalogue still transitions the gate to \'browsing\' via the existing setter — no new state machine',
);
check(
  /onClick=\{dismissUpgradeGate\}\s*>\s*\n\s*Maybe next time/.test(stagedBranchBody),
  'Maybe next time still calls dismissUpgradeGate directly',
);
check(
  /recommendationsCta=\{recommendationsCta\}/.test(stagedBranchBody)
    && /hideAddonsInRecommendations=\{upgradeGateActive === 'pending'\}/.test(stagedBranchBody),
  'PricingTiers is wired with both recommendationsCta and hideAddonsInRecommendations, the latter tied to the same \'pending\' check',
);

// ── 3. PricingTiers renders the CTA inside recommendationsShell ─────────

check(
  /recommendationsCta\?: ComponentChildren;/.test(pricingTiersSource)
    && /hideAddonsInRecommendations\?: boolean;/.test(pricingTiersSource),
  'PricingTiersProps declares recommendationsCta and hideAddonsInRecommendations',
);
const shellMatch = pricingTiersSource.match(/const recommendationsShell = recommendationsAside && \(addonTiers\.length > 0 \|\| recommendationsCta\) \? \(([\s\S]*?)\) : null;/);
check(shellMatch !== null, 'recommendationsShell now renders when EITHER add-on Tiers exist OR the CTA is supplied — a catalogue-only Family with no add-on Tiers still gets a Recommendations shell for the CTA');
const shellBody = shellMatch![1];
check(
  /\{!hideAddonsInRecommendations && addonTiers\.map\(renderAddonTierCard\)\}/.test(shellBody),
  'the add-on cards render only when hideAddonsInRecommendations is false',
);
check(
  /\{recommendationsCta\}/.test(shellBody),
  'the CTA itself is rendered as a direct child of the shell, alongside/instead of the add-on cards',
);

// ── 4. Composable browsing stage builds the shared focused shell ────────

const browsingBranchMatch = adapterSource.match(/\} else if \(upgradeGateActive === 'browsing' && selectedTierId !== null\) \{([\s\S]*?)\n {2}\} else if \(stagedTier\) \{/);
check(browsingBranchMatch !== null, "the 'browsing' branch exists and immediately precedes the stagedTier branch (still takes priority over Recommendations)");
const browsingBranchBody = browsingBranchMatch![1];
check(
  !/mainContent = null;/.test(browsingBranchBody),
  "the 'browsing' branch no longer yields mainContent = null — it now produces the real shared shell directly",
);
check(
  /class="cz-package-builder__focused"/.test(browsingBranchBody)
    && /class="cz-package-builder__focused-detail"/.test(browsingBranchBody)
    && /class="cz-package-builder__focused-card"/.test(browsingBranchBody),
  'the composable browsing stage reuses the exact same .cz-package-builder__focused/-detail/-card classes the normal focused shell uses — never a lookalike wrapper',
);

// ── 5. Top tab row uses the composable occupant's OWN edition_options ───

check(
  /const composableData = family\.pricing\.composable_offer \?\? undefined;/.test(browsingBranchBody)
    && /const composableEditionOptions = composableData\?\.edition_options \?\? \[\];/.test(browsingBranchBody),
  'the tab destinations are resolved from family.pricing.composable_offer\'s own edition_options — never the already-quoted primary\'s (primaryTierData/primaryEditionOptions no longer appear in this branch)',
);
check(
  !/primaryTierData|primaryEditionOptions|primaryActiveEditionId|primaryLabel/.test(browsingBranchBody),
  'no remnant of the old primary-tab-reuse identity resolution (primaryTierData/primaryEditionOptions/primaryActiveEditionId/primaryLabel) remains in this branch',
);
check(
  /<EditionCueSelector[\s\S]*?activeId=\{composableEditionId\}[\s\S]*?onSelect=\{setComposableEditionId\}/.test(browsingBranchBody),
  'EditionCueSelector is controlled by composableEditionId/setComposableEditionId — a dedicated piece of state for this occupant, never focusedEditionId or the primary\'s own identity',
);

// ── 6. ComposableOfferBrowser / UpgradeBuildSummary props ────────────────
// (composable-edition-resolution-contract.ts locks that activeEditionId is
// actually ROUTED through the resolver, not merely present here.)

check(
  /<ComposableOfferBrowser\s+family=\{family\}\s+context="upgrade_your_build"\s+activeEditionId=\{composableEditionId\}\s+initialCartItem=\{selectedComposableItem\}\s+primaryItem=\{selectedPrimaryItem\}\s+onCommit=\{onComposableCommit\}\s+onRemoveFromQuote=\{onComposableRemove\}\s*\/>/.test(browsingBranchBody),
  'ComposableOfferBrowser keeps the same original props plus activeEditionId={composableEditionId} — the one addition the Edition-resolution correction required',
);
check(
  /<UpgradeBuildSummary\s+primaryItem=\{selectedPrimaryItem\}\s+composableItem=\{selectedComposableItem\}\s+onExit=\{dismissUpgradeGate\}\s*\/>/.test(browsingBranchBody),
  'UpgradeBuildSummary keeps the exact same props, still exiting via dismissUpgradeGate',
);

// ── 7. Close (X) inside composable browsing uses the same exit path ─────

check(
  /aria-label="Close Build Your Own"\s*\n\s*onClick=\{dismissUpgradeGate\}/.test(browsingBranchBody),
  'the composable focused shell\'s own close (X) button calls dismissUpgradeGate directly — the same single exit action UpgradeBuildSummary\'s Add to Quote button already uses, never a second exit path',
);

// ── 8. No separate bottom-sibling block survives ────────────────────────

check(
  !/upgradeGateActive === 'browsing' && selectedTierId !== null && \(\(\) => \{/.test(adapterSource),
  'the old bottom-sibling IIFE block for the browsing stage is gone — mainContent is the sole render path for it now',
);

// ── 9. composableEditionId is reset alongside the gate ──────────────────

check(
  /const \[composableEditionId, setComposableEditionId\] = useState<string \| null>\(null\);/.test(adapterSource),
  'composableEditionId exists as its own piece of state',
);
const dismissMatch = adapterSource.match(/const dismissUpgradeGate = \(\) => \{([\s\S]*?)\};/);
check(dismissMatch !== null && /setComposableEditionId\(null\);/.test(dismissMatch[1]), 'dismissUpgradeGate resets composableEditionId alongside the gate itself');
const familySwitchEffectMatch = adapterSource.match(/useEffect\(\(\) => \{\s*setFocusedTierId\(null\);([\s\S]*?)\}, \[family\.family_id\]\);/);
check(familySwitchEffectMatch !== null && /setComposableEditionId\(null\);/.test(familySwitchEffectMatch[1]), 'the Family-switch reset effect also clears composableEditionId — the identical same-TierId-different-Family reasoning the other focused-state resets already guard against does not apply to a plain string Edition id key, but a stale selection from a different Family\'s composable offer must not silently survive the switch either');

// ── 10. Dead code sweep ──────────────────────────────────────────────────

const forbidden: RegExp[] = [
  /class="cz-package-builder__upgrade-browsing"/,
  /class="cz-package-builder__upgrade-browsing-detail"/,
  /mainContent = null;/,
];
for (const pattern of forbidden) {
  check(!pattern.test(adapterSource), `no trace of ${pattern} remains in FamilyTierAdapter.tsx`);
}
check(
  !/\.cz-package-builder__upgrade-browsing\s*\{/.test(cssSource),
  'the bespoke .cz-package-builder__upgrade-browsing CSS rule no longer exists',
);
check(
  /\.cz-package-builder__focused-detail > \.cz-package-builder__composable \{/.test(cssSource),
  'the divider-zeroing override now targets .cz-package-builder__focused-detail (the shared shell), not the deleted .upgrade-browsing-detail',
);
check(
  /\.cz-package-builder__upgrade-gate-inline \{/.test(cssSource),
  'the relocated CTA has its own compact .cz-package-builder__upgrade-gate-inline rule',
);

// ── 9. [Correction] catalogue-only Families still stage ──────────────────

const commitSelectionMatch = adapterSource.match(/const commitSelection = \([\s\S]*?\n {2}\};/);
check(commitSelectionMatch !== null, 'commitSelection exists');
check(
  /setStagedTierId\(addonTiers\.length > 0 \|\| hasCatalogue \? tierId : null\);/.test(commitSelectionMatch![0]),
  'commitSelection stages when EITHER add-on Tiers exist OR hasCatalogue — a Family with a composable catalogue but zero add-on Tiers now reaches the stagedTier/Recommendations branch instead of falling through to the plain comparison grid',
);

// ── 10. [Live correction 2026-09-10] no duplicate Upgrade CTA once an
//        Upgrade is already quoted for this Family+Instance ───────────────
//
// project-work/2026-09-10-cart-bundle-and-upgrade-refinements.md, Issue 2:
// Recommendations kept offering "Upgrade your build / Browse Catalogue" even
// when the Family already had a quoted Upgrade line, so the customer was
// invited to start an upgrade they had already made. The Cart footer's own
// recovery route already applied exactly this rule
// (PackageBuilderApp's showUpgradeYourBuildFooter -> composableItem === null);
// Recommendations simply never got it.
//
// Resolved at the shell-level upgradeGateActive derivation rather than inside
// the Recommendations branch, so every consumer (the focused-shell active
// signal, hideAddonsInRecommendations, the CTA itself) reads ONE gate and
// cannot drift. Deliberately narrowed to 'pending': 'browsing' is the
// Manage-build route INTO an existing Upgrade and must keep working.
{
  const stageMatch = adapterSource.match(
    /const upgradeGateStageForSelectedTier = upgradeGateTierId !== null && upgradeGateTierId === selectedTierId[\s\S]*?\? upgradeGateStage[\s\S]*?: null;/,
  );
  check(
    stageMatch !== null,
    'the tier-scoped stage derivation is kept as its own value, so the cart-state gate below composes with it rather than replacing it',
  );

  const gateMatch = adapterSource.match(
    /const upgradeGateActive = upgradeGateStageForSelectedTier === 'pending' && selectedComposableItem !== null[\s\S]*?\? null[\s\S]*?: upgradeGateStageForSelectedTier;/,
  );
  check(
    gateMatch !== null,
    "upgradeGateActive suppresses ONLY the 'pending' CTA stage when this Family+Instance already has a quoted composable line",
  );
  check(
    gateMatch !== null && gateMatch[0].includes('selectedComposableItem !== null'),
    'the suppression reads the parent-derived composable cart line (resolveQuoteItemRole-based), never a rendered label or heading string',
  );
  check(
    gateMatch !== null && !/'browsing'/.test(gateMatch[0]),
    "the suppression never touches the 'browsing' stage — Manage build must still re-enter an existing Upgrade",
  );

  // The CTA and the add-on suppression both hang off upgradeGateActive, so
  // gating that one value is what makes the CTA disappear and the ordinary
  // add-on choices come back — and makes it RETURN once the Upgrade is
  // explicitly removed (selectedComposableItem becomes null again, with no
  // separate reset state to keep in sync).
  check(
    /const recommendationsCta = upgradeGateActive === 'pending' \? \(/.test(adapterSource)
      && /hideAddonsInRecommendations=\{upgradeGateActive === 'pending'\}/.test(adapterSource),
    'both the CTA and hideAddonsInRecommendations still read upgradeGateActive, so the single gate above governs both',
  );
  check(
    !/selectedComposableItem !== null/.test(adapterSource.replace(gateMatch![0], ''))
      || adapterSource.split('selectedComposableItem !== null').length - 1 === 1,
    'the cart-state gate is derived exactly once — no second, parallel composable-in-cart test elsewhere in the file',
  );
}

console.log('Composable recommendations CTA contract: PASS');
