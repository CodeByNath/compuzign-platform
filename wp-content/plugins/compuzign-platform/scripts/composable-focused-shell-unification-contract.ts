// Contract: the composable ("Build Your Own") occupant shares the SAME
// focused-shell structure every normal Tier occupant uses — never a second,
// parallel focused-view system (project-work/2026-09-06-tier-catalogue-
// admin-ux-consolidation.md, "structural correction: Build Your Own must
// use the same focused-occupant model, not a parallel Upgrade shell").
//
// Nath's clarified rule, kept literal: Build Your Own is also a Tier
// occupant with its own Default, Editions, Legs, inclusions, pricing and
// customer policy — so its focused flow is the SAME product pattern
// (occupant -> its own Default/Edition identity -> the same focused shell),
// entered through a plain Choose-Plan-style click on its own card, never a
// separate gate/interstitial screen or a second Edition-selector/exit-guard
// state machine merely styled to resemble the real shell.
//
// This is a component-effect/structure property (state shape, render
// branching, prop wiring), not a pure function — same source-scan
// precedent this codebase already documents elsewhere (composable-quote-
// cart-contract.ts's own "8b" section, composable-edition-cue-sync-
// contract.ts) for properties with no component-render test harness
// available.
//
// Properties locked (this file's own report on "which focused-shell code
// is now shared and which body remains composable-specific"):
//   1. focusedTierId's type (FocusedOccupantId) admits the composable
//      occupant's own sentinel alongside the five fixed Tier ids — ONE
//      state slot, not two.
//   2. The focused-branch render guard covers a normal Tier OR the
//      composable occupant with the SAME condition, never two separate
//      `if` branches for the two cases.
//   3. focusedData — the SAME local every downstream read in the shell
//      consumes (title, ideal_for, edition_options, commercial terms) —
//      resolves from family.pricing.composable_offer for the composable
//      occupant and family.pricing.tiers[tierId] for a normal Tier, through
//      ONE ternary, not a duplicated resolution path.
//   4. selectVariant is the ONLY entry point into focus for both cases —
//      the composable occupant's own Build Your Own card, Manage build,
//      and the Cart footer's recovery route all call it directly, never a
//      second/parallel state setter.
//   5. The composable occupant's own Build Your Own entry card is gated on
//      the SAME shared eligibility authority (resolveComposableEligibleRows)
//      the earlier Phase 1 gate already used — never a second, parallel
//      "does this Family/Tier have a catalogue" rule.
//   6. The composable occupant's own interactive catalogue body
//      (ComposableOfferBrowser) is the one occupant-specific substitution
//      inside the SHARED focused-card wrapper — rendered only when
//      focusedIsComposable, with onCommit/onRemoveFromQuote passed through
//      UNWRAPPED (no second commit path), and activeEditionId wired to the
//      SAME focusedEditionId every other part of the shell reads/writes.
//   7. Cart/Add-on visibility (onUpgradeGateActiveChange) is driven
//      directly by focusedIsComposable — the SAME observable behavior the
//      earlier gate produced, now reported off the unified state instead
//      of a parallel one. The visibility RULE itself is unchanged in this
//      phase (a separate, deferred concern per the project-work doc).
//   8. The earlier parallel gate/stage/exit-guard system is completely
//      gone: no upgradeGateTierId/Stage, no composableEditionId/
//      composableSyncPending, no dismissUpgradeGate/exitUpgradeBrowsing, no
//      UpgradeBuildSummary import — a second focused-view system was
//      removed, not merely relabeled.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Composable focused-shell unification contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const adapterSource = readFileSync(resolve(root, 'resources/ts/components/package-builder/FamilyTierAdapter.tsx'), 'utf8');

// ── 1. FocusedOccupantId admits both a normal Tier and the composable sentinel ─

check(
  /export type FocusedOccupantId = TierId \| typeof COMPOSABLE_QUOTE_TIER_ID;/.test(adapterSource),
  'FocusedOccupantId is the union of the five fixed Tier ids and the composable occupant\'s own sentinel',
);
check(
  /const \[focusedTierId, setFocusedTierId\] = useState<FocusedOccupantId \| null>\(null\);/.test(adapterSource),
  'focusedTierId itself is typed FocusedOccupantId — ONE state slot for both a normal Tier and the composable occupant, never two',
);

// ── 2. One shared render guard, not two separate branches ──────────────────

check(
  /const focusedIsComposable = focusedTierId === COMPOSABLE_QUOTE_TIER_ID;/.test(adapterSource),
  'focusedIsComposable is derived directly from focusedTierId — a plain equality check, not a second stored flag',
);
check(
  /if \(focusedTierId !== null && \(focusedTier \|\| focusedIsComposable\)\) \{/.test(adapterSource),
  'the focused-branch render guard covers a normal Tier OR the composable occupant with the SAME condition/branch — never a separate `else if` for the composable case',
);

// ── 3. focusedData resolves from the correct source through ONE ternary ────

check(
  /const focusedData: PricingTierData \| undefined = focusedIsComposable\s*\n\s*\? family\.pricing\.composable_offer \?\? undefined\s*\n\s*: family\.pricing\.tiers\[focusedTierId\];/.test(adapterSource),
  'focusedData resolves from family.pricing.composable_offer (composable) or family.pricing.tiers[tierId] (normal) through ONE ternary — every downstream read in the shell (title, ideal_for, edition_options, commercial terms) consumes this SAME local, never a duplicated per-branch resolution',
);

// ── 4. selectVariant is the only entry point, from every caller ────────────

check(
  /const selectVariant = \(tierId: FocusedOccupantId, editionId: string \| null\) => \{/.test(adapterSource),
  'selectVariant itself accepts FocusedOccupantId — the one shared entry function, not a normal-Tier-only one plus a second composable-only setter',
);
check(
  /onClick=\{\(\) => selectVariant\(COMPOSABLE_QUOTE_TIER_ID, seedComposableEditionId\(\)\)\}/.test(adapterSource),
  'the Build Your Own card\'s own Choose-Plan-style click calls selectVariant directly — a plain one-click entry, never a separate gate/interstitial screen',
);
check(
  (adapterSource.match(/selectVariant\(COMPOSABLE_QUOTE_TIER_ID, seedComposableEditionId\(\)\)/g) ?? []).length === 2,
  'selectVariant(COMPOSABLE_QUOTE_TIER_ID, ...) is called from exactly the two entry points that open the composable occupant\'s focus (the Build Your Own card\'s own click, and the manageBuildRequest-consuming effect shared by Manage build/the Cart footer recovery route) — never a third, parallel opener',
);

// ── 5. Build Your Own's own entry card reuses the SAME shared eligibility ──

check(
  /const hasComposableCatalogue = resolveComposableEligibleRows\(family\)\.length > 0;/.test(adapterSource),
  'the Build Your Own card\'s own visibility reuses resolveComposableEligibleRows(family) — the SAME shared authority the manageBuildRequest guard above already uses — never a second, parallel "does this Family/Tier have a catalogue" rule',
);

// ── 6. ComposableOfferBrowser: the one occupant-specific substitution ──────

check(
  /\{focusedIsComposable && \(\s*\n\s*<ComposableOfferBrowser\s*\n\s*family=\{family\}\s*\n\s*activeEditionId=\{focusedEditionId\}\s*\n\s*initialCartItem=\{selectedComposableItem\}\s*\n\s*primaryItem=\{selectedPrimaryItem\}\s*\n\s*onCommit=\{onComposableCommit\}\s*\n\s*onRemoveFromQuote=\{onComposableRemove\}\s*\n\s*\/>\s*\n\s*\)\}/.test(adapterSource),
  'ComposableOfferBrowser renders only when focusedIsComposable, inside the SAME .cz-package-builder__focused-card wrapper a normal Tier\'s TierCard uses — activeEditionId is the SAME focusedEditionId every other part of the shell reads/writes (never a second Edition-selector state), and onCommit/onRemoveFromQuote are passed straight through unwrapped (no second commit path)',
);

// ── 7. Cart/Add-on visibility driven directly by focusedIsComposable ───────

check(
  /onUpgradeGateActiveChange\(focusedIsComposable\);/.test(adapterSource),
  'onUpgradeGateActiveChange is called with focusedIsComposable directly — the same observable Cart/MobileQuoteBar-hiding behavior the earlier gate produced, reported off the unified focus state instead of a parallel one',
);

// ── 8. The earlier parallel gate/stage/exit-guard system is completely gone ─

for (const deadPattern of [
  /const \[upgradeGateTierId/,
  /setUpgradeGateTierId\(/,
  /const \[upgradeGateStage/,
  /setUpgradeGateStage\(/,
  /const \[composableEditionId/,
  /setComposableEditionId\(/,
  /const \[composableSyncPending/,
  /setComposableSyncPending\(/,
  /const dismissUpgradeGate/,
  /const exitUpgradeBrowsing/,
]) {
  check(
    !deadPattern.test(adapterSource),
    `no live declaration/call matching ${deadPattern} remains — the earlier parallel gate/stage/exit-guard state was actually deleted, not merely relabeled`,
  );
}
check(
  !existsSync(resolve(root, 'resources/ts/components/package-builder/UpgradeBuildSummary.tsx')),
  'UpgradeBuildSummary.tsx no longer exists — its one caller (the removed parallel Upgrade-browsing branch) is gone, and QuoteItemPricePresentation/QuoteTotalsPresentation (extracted for it in QuoteSummary.tsx) are kept as-is rather than re-inlined, since QuoteSummary itself still calls them',
);
check(
  !/UpgradeBuildSummary/.test(adapterSource),
  'FamilyTierAdapter.tsx no longer imports or references UpgradeBuildSummary',
);

console.log('Composable focused-shell unification contract: PASS');
