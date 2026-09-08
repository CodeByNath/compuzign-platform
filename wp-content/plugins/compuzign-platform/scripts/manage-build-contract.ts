// Contract: "Manage build" Cart re-entry into Upgrade Your Build browsing
// (project-work/2026-09-06-tier-catalogue-admin-ux-consolidation.md, live
// acceptance follow-up + "race-safe cross-Family Manage build re-entry"
// correction).
//
// Properties locked:
//   1. QuoteSummary renders Manage build ONLY for a composable line that
//      coexists with its primary (composableCoexistsWithPrimary — the same
//      authority already used for the "Upgrades" vs "Build Your Own"
//      label), never inferred from that label text itself, and the prop is
//      optional so CostBuilderApp.tsx (no Upgrade Your Build concept) is
//      unaffected.
//   2. PackageBuilderApp's handler only routes an identity/request signal —
//      it switches activeFamilyId to the clicked item's own Family and
//      hands FamilyTierAdapter a one-shot request object, never calling
//      any gate setter or cart-mutating function itself.
//   3. FamilyTierAdapter is the sole owner of consuming that request: it
//      only enters its EXISTING 'browsing' stage (no new state machine)
//      when the request targets this exact, currently-rendered Family +
//      Instance and both the primary and the already-committed composable
//      line exist.
//   3b. [Race-safety correction] PackageBuilderApp's handler performs two
//       separate setState calls (setActiveFamilyId, then
//       setManageBuildRequest) — a static contract cannot prove these are
//       always observed by FamilyTierAdapter in one batched render, so the
//       consuming effect no longer assumes it. A request for a Family/
//       Instance OTHER than the one currently rendered is left completely
//       untouched (not consumed) — the effect's dependency array includes
//       family.family_id/family.tier_instance_id specifically so it
//       re-fires the moment the target Family/Instance actually renders,
//       at which point the same still-pending request is re-evaluated.
//   4. Once the Family/Instance genuinely matches, the request is always
//      resolved exactly once — opened (guard passes) or silently dropped
//      (guard fails) — so it can never linger and fire unexpectedly later;
//      a later browsing-stage exit can never re-trigger an already-resolved
//      request.
//   5. No quote mutation on entry: the consuming effect calls only the two
//      existing gate setters, nothing from utils/quote.ts.
//   6. Add-to-Quote's existing browsing-stage exit (UpgradeBuildSummary's
//      onExit) is untouched — still exactly dismissUpgradeGate.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Manage build contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const quoteSummarySource = readFileSync(resolve(root, 'resources/ts/components/cost-builder/QuoteSummary.tsx'), 'utf8');
const adapterSource = readFileSync(resolve(root, 'resources/ts/components/package-builder/FamilyTierAdapter.tsx'), 'utf8');
const appSource = readFileSync(resolve(root, 'resources/ts/components/package-builder/PackageBuilderApp.tsx'), 'utf8');
const costBuilderAppSource = readFileSync(resolve(root, 'resources/ts/components/cost-builder/CostBuilderApp.tsx'), 'utf8');
const cssSource = readFileSync(resolve(root, 'resources/css/modules/cost-builder.css'), 'utf8');

// ── 1. QuoteSummary: optional prop, gated on composableCoexistsWithPrimary ──

check(
  /onManageBuild\?: \(item: FamilyTierQuoteItem\) => void;/.test(quoteSummarySource),
  'QuoteSummary declares onManageBuild as an optional prop',
);
check(
  /\{onManageBuild && isFamilyTierQuoteItem\(item\) && composableCoexistsWithPrimary\(item, items\) && \(/.test(quoteSummarySource),
  'the Manage build button is gated on composableCoexistsWithPrimary(item, items) — the same authority already used for the "Upgrades" label — never a label/string match',
);
check(
  /onClick=\{\(\) => onManageBuild\(item\)\}\s*>\s*\n\s*Manage build/.test(quoteSummarySource),
  'the button calls onManageBuild(item) with the exact cart item it renders for',
);
check(
  !/onManageBuild/.test(costBuilderAppSource),
  'CostBuilderApp.tsx (the other QuoteSummary caller, no Upgrade Your Build concept) never references onManageBuild — omitting the prop leaves it unaffected',
);

// ── 2. PackageBuilderApp: routes identity only, no gate/mutation logic ──────

check(
  /const \[manageBuildRequest, setManageBuildRequest\] = useState<ManageBuildRequest \| null>\(null\);/.test(appSource),
  'PackageBuilderApp holds the one-shot request as state, owned here (not duplicated from FamilyTierAdapter\'s internal gate shape)',
);
const handleManageBuildMatch = appSource.match(/const handleManageBuild = useCallback\(\(item: FamilyTierQuoteItem\) => \{([\s\S]*?)\}, \[\]\);/);
check(handleManageBuildMatch !== null, 'handleManageBuild exists as a stable useCallback');
const handleManageBuildBody = handleManageBuildMatch![1];
check(
  /setActiveFamilyId\(item\.familyId\)/.test(handleManageBuildBody),
  'handleManageBuild switches activeFamilyId to the clicked item\'s own Family — cross-Family routing lives here, not inside FamilyTierAdapter',
);
check(
  /setManageBuildRequest\(\{\s*familyId: item\.familyId,\s*tierInstanceId: item\.tierInstanceId,\s*requestId: manageBuildRequestId\.current,\s*\}\);/.test(handleManageBuildBody),
  'handleManageBuild hands down an identity-only request (familyId, tierInstanceId, requestId) — never a gate stage or any cart data',
);
check(
  !/setUpgradeGateTierId|setUpgradeGateStage|upsertFamily|removeFamily|replaceFamily/.test(handleManageBuildBody),
  'handleManageBuild calls no gate setter and no cart-mutating function — PackageBuilderApp never decides browsing state or touches items itself',
);
check(
  /onManageBuild=\{handleManageBuild\}/.test(appSource),
  'QuoteSummary is wired with handleManageBuild directly',
);
check(
  /manageBuildRequest=\{manageBuildRequest\}/.test(appSource) && /onManageBuildConsumed=\{consumeManageBuildRequest\}/.test(appSource),
  'FamilyTierAdapter receives both the request and the one-shot consumption callback',
);

// ── 3. FamilyTierAdapter: sole owner of consuming the request ───────────────

check(
  /manageBuildRequest: ManageBuildRequest \| null;\s*\n\s*onManageBuildConsumed: \(\) => void;/.test(adapterSource),
  'FamilyTierAdapter declares both props on its interface',
);
const consumeEffectMatch = adapterSource.match(/useEffect\(\(\) => \{\s*if \(!manageBuildRequest\) return;([\s\S]*?)\}, \[manageBuildRequest, family\.family_id, family\.tier_instance_id\]\);/);
check(consumeEffectMatch !== null, 'the manageBuildRequest-consuming effect exists, keyed on manageBuildRequest AND the rendered family.family_id/family.tier_instance_id — so it re-evaluates the moment the target Family/Instance actually renders, not just when the request object itself changes');
const consumeEffectBody = consumeEffectMatch![1];
check(
  /const familyMatches = manageBuildRequest\.familyId === family\.family_id\s*\n\s*&& manageBuildRequest\.tierInstanceId === family\.tier_instance_id;/.test(consumeEffectBody),
  'the effect computes whether the request targets THIS exact, currently-rendered Family + Instance',
);

// ── 3b. Race safety: a mismatched request is left untouched, not consumed ──

check(
  /if \(!familyMatches\) return;/.test(consumeEffectBody),
  'a request for a Family/Instance other than the one currently rendered here returns WITHOUT calling onManageBuildConsumed() — it is left pending rather than dropped, so it survives until the matching Family/Instance actually renders and this effect re-fires (via the family.family_id/family.tier_instance_id deps), instead of assuming PackageBuilderApp\'s two separate setState calls (setActiveFamilyId, setManageBuildRequest) are always observed together in one render',
);
check(
  /if \(!familyMatches\) return;\s*\n\s*if \(selectedTierId !== null && selectedPrimaryItem && selectedComposableItem\) \{/.test(consumeEffectBody),
  'the mismatch check happens BEFORE the primary/composable guard — a mismatch never reaches, and is never confused with, a matched-but-guard-failed case',
);
check(
  /setUpgradeGateTierId\(selectedTierId\);\s*\n\s*setUpgradeGateStage\('browsing'\);/.test(consumeEffectBody),
  'once matched, the effect sets the EXISTING gate state directly to \'browsing\' when the primary/composable guard passes — reusing FamilyTierAdapter\'s own state machine, never a second/parallel one',
);
check(
  !/onAdd\(|onComposableCommit\(|onComposableRemove\(|onRemovePrimary\(|onRemoveAddon\(/.test(consumeEffectBody),
  'the consuming effect calls no cart-mutating callback at all — reopening browsing performs no quote mutation on entry',
);

// ── 4. Matched requests are always resolved exactly once; unmatched ones never fire late ─

const afterGuardBlock = consumeEffectBody.slice(consumeEffectBody.indexOf("setUpgradeGateStage('browsing');") + "setUpgradeGateStage('browsing');".length);
check(
  /^\s*\}\s*\n[\s\S]*?onManageBuildConsumed\(\);/.test(afterGuardBlock),
  'onManageBuildConsumed() is called once the family has matched, AFTER (outside) the primary/composable guard block — so it fires whether that guard passed (opened) or failed (dropped), but never on a plain Family/Instance mismatch',
);
check(
  /const consumeManageBuildRequest = useCallback\(\(\) => setManageBuildRequest\(null\), \[\]\);/.test(appSource),
  'the parent\'s consumption callback simply nulls the request — a later browsing-stage exit (dismissUpgradeGate) reads no leftover request to re-trigger against',
);

// ── 5. Existing browsing-stage exit is untouched ─────────────────────────────

check(
  /<UpgradeBuildSummary\s+primaryItem=\{selectedPrimaryItem\}\s+composableItem=\{selectedComposableItem\}\s+onExit=\{dismissUpgradeGate\}\s*\/>/.test(adapterSource),
  'UpgradeBuildSummary is still wired with onExit={dismissUpgradeGate} exactly as before — Manage build only affects how browsing is ENTERED, not how it is exited',
);

// ── 6. Manage build button styled as a quiet text link, not a primary CTA ───

check(
  /\.cz-quote-summary__manage-build \{[^}]*text-decoration:\s*underline;[^}]*\}/s.test(cssSource),
  '.cz-quote-summary__manage-build exists as a quiet text-link style, matching .cz-quote-summary__view-details\' own recipe rather than a new primary-button treatment',
);

console.log('Manage build contract: PASS');
