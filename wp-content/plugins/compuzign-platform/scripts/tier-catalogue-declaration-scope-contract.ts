// Phase 3 correction contract — project-work/2026-09-06-tier-catalogue-
// admin-ux-consolidation.md. Proves the auditor's final approved UX: the
// Customer Selection Rules panel gains one scope tab per declaration
// (Default plus every existing Build Your Own Edition), scope selection is
// presentation-only, and switching scope swaps BOTH the Featured inclusions
// list and every policy-summary count to that declaration's own resolved
// state. Real behavior against buildComposableDeclarationScopes/
// projectComposableHighlightInclusions/summarizeComposableCustomerPolicy/
// projectDeclarationDetailCard (pure exported functions), plus source-scan
// proof that the retired button/drawer was replaced by these tabs and not
// by a new card action or a new drawer route. Proves:
//
//   1. Default is always the first scope, and the ONE selected-scope state
//      (lifted to PackageTierWorkspace.tsx by the live-UI correction below)
//      initializes to Default.
//   2. Tabs enumerate the occupant's REAL tier_editions[] — no synthetic
//      catch-all entry, one scope per Edition, using that Edition's own
//      draft-preferred title/identity.
//   3. Switching scope swaps the Featured inclusions AND every policy-
//      summary count to that Edition's own resolved deck/policy — never
//      Default's, even when the Edition's own policy is configured
//      differently.
//   4. An Edition's own null customer_policy inherits Default's wholesale;
//      a non-null value is its own complete replacement — never blended.
//   5. Each Edition's own inclusions resolve against its OWN bound Rate
//      Sheet, never Default's or another Edition's (no cross-scope bleed).
//   6. No standalone Customer Selection destination and no third "Editions"
//      card action were reintroduced.
//   7. REVERTED (2026-09-07): the second-round correction's scope-following
//      Edit target and the Phase 3 correction's Edition auto-open deep-link
//      both corrupted the drawer's own chrome state on live validation
//      (auto-reopen loops, then a header/footer/tab-less render after
//      Save/Cancel) and are removed entirely, not patched further. A
//      further same-day live cleanup pass then removed the Edit action
//      ENTIRELY (including for Default) — the panel is pure view-only now;
//      every declaration is edited exclusively through the normal Tier
//      drawer — proven below.
//   8. No seeded Edition target reaches the drawer at all: useTierDrawerController
//      never derives/reads an external declaration id, and
//      TierEditionDeclarationSwitcher carries no auto-open prop/effect —
//      proven by source-scan absence of every symbol that mechanism used.
//   9. (absorbed into 7/8 — the "seeded selection survives first load" guard
//      existed only to protect that now-removed seed, and is removed too.)
//
// Phase 3 live-UI correction (auditor: "Proceed with safeguards" — the scope
// mechanism itself works, but the upper Build Your Own detail card never
// followed it, the right-column layout was wrong, and the action's copy was
// wrong). Additionally proves:
//
//  10. Each scope carries its OWN upper-card fields (priceDisplay,
//      includedFeatureCount, commonQuestionCount) — genuinely different per
//      scope, never Default's carried over — and
//      projectDeclarationDetailCard merges ONLY those fields onto the
//      occupant's base card, leaving identity fields (name/kind/status/
//      actions) untouched.
//  11. An Edition's own empty faq_refs inherits the Default declaration's
//      own FAQ count; a non-empty faq_refs is its own complete replacement.
//  12. The selected-scope state that used to be TierComposableMiddleShell's
//      own `useState` is lifted to PackageTierWorkspace.tsx instead, so ONE
//      state can drive the upper detail card and both lower columns
//      together — proven by source-scan (the old internal `useState` is
//      gone from the middle shell; the same initial-selection behavior now
//      lives in the workspace).
//  13. REVERTED (2026-09-07 cleanup): the middle shell carries no Edit
//      action, copy, or button-class reference of any kind any more — see
//      item 7 above.
//  14. No bespoke/hardcoded inline styling was introduced in either touched
//      presentation file (no `style=` attributes; every class referenced is
//      either a pre-existing established class or the one narrow
//      layout-modifier class this correction adds, composed onto the
//      shared `cz-station-tabset__list` skin rather than replacing it).
//  16. (2026-09-07 cleanup) The metrics container's own `border-top` — which
//      sat directly beneath the scope tabs' own bottom border/selected-tab
//      underline, doubling that line — is removed; between-row dividers
//      still apply via the adjacent-sibling rule.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildComposableDeclarationScopes,
  projectComposableHighlightInclusions,
  projectDeclarationDetailCard,
  summarizeComposableCustomerPolicy,
} from '../resources/ts/package-station/surface/packageTierWorkspace/composableMiddleShell';
import { EMPTY_TIER_DECK, type TierDeck } from '../resources/ts/package-station/surface/packageTierWorkspace/deck';
import { decodeTierDrawerRecordId, encodeTierDrawerRecordId } from '../resources/ts/package-station/drawer/tier/tierDrawerTypes';
import type { CategoryGroupCardItem } from '../resources/ts/admin-station/presentation/category-groups/types';
import type { CustomerPolicy } from '../resources/ts/api/types/cost-builder';
import type { PackageRateSheet, TierEdition } from '../resources/ts/package-station/types';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Tier catalogue declaration scope contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');

function policyOf(itemId: string, featured: boolean): CustomerPolicy {
  return {
    items: [{
      item_id: itemId, mode: 'required', default_selected: false, quantity: null,
      price_option: { mode: 'fixed', allowed_price_option_ids: null, default_price_option_id: null }, featured,
    }],
  };
}

function makeEdition(overrides: Partial<TierEdition> & { id: string }): TierEdition {
  return {
    edition_platform_id: '', edition_catalogue_platform_id: '', default_leg_platform_id: '',
    title: overrides.id, admin_description: '', platform_status: 'active', previous_platform_status: null,
    is_explicitly_disabled: false, module_status: {}, drafts: {}, rate_sheet_id: null, rate_sheet_items: [],
    price: null, contact: false, billing_cycle: null, minimum_term_value: null, minimum_term_unit: null,
    from_month: 0, to_month: null, legs: [], headline_leg_id: '', inclusions_override: [], faq_refs: [],
    customer_policy: null,
    ...overrides,
  };
}

const defaultDeck: TierDeck = {
  ...EMPTY_TIER_DECK,
  inclusions: [
    { itemId: 'default-item', sourceId: 's1', name: 'Default Backup Storage', categories: [], quantity: 1, unitPrice: 10, per: 'mo', lineTotal: 10, resolved: true, addressable: true },
  ],
};
const defaultPolicy = policyOf('default-item', true);

const svc = {
  rate_sheets: [
    {
      rate_sheet_id: 'rs_edition_b', platform_id: '', title: 'Edition B Sheet', status: 'active' as const, groups: [],
      items: [{
        item_id: 'edition-b-item', label: '', unit_price: 15, per: 'mo', quantity: 1, sort_order: 0,
        price_options: [], group_id: null, source_item_id: 'rel_1',
      }],
    },
  ] as PackageRateSheet[],
  package_relationships: [
    {
      item_id: 'rel_1', source_type: 'inclusion' as const, source_id: 'svc_1',
      resolved: { label: 'Edition B Priority Support' }, decorated_label: null, group_id: null,
      sort_order: 0, disabled: false, missing: false, module_transition: 'settled' as const,
    },
  ],
};

// ── 1/2. Default first, Editions enumerated by real identity, draft-
//    preferred title/policy ──────────────────────────────────────────────

const editionInherits = makeEdition({ id: 'edt_a', title: 'Edition A', customer_policy: null });
const editionReplaces = makeEdition({
  id: 'edt_b', title: 'Stale Title', rate_sheet_id: 'rs_edition_b',
  rate_sheet_items: [{ item_id: 'edition-b-item', quantity: 1 }],
  customer_policy: policyOf('edition-b-item', false),
  // draft-preferred: a pending overview draft's own title/billing_cycle/
  // faq_refs must win over the stale settled ones, exactly like every other
  // Edition display already does — including this correction's own new
  // upper-card fields.
  drafts: { overview: { title: 'Edition B', admin_description: '', rate_sheet_id: 'rs_edition_b', rate_sheet_items: [{ item_id: 'edition-b-item', quantity: 1 }], billing_cycle: 'Annual', contact: false, minimum_term_value: null, minimum_term_unit: null, from_month: 0, to_month: null, legs: [], headline_leg_id: '', inclusions_override: [], faq_refs: ['faq-b'], customer_policy: policyOf('edition-b-item', false) } },
});

// The Default declaration's own upper-card inputs — 2 FAQs, so Edition A's
// own empty faq_refs can be proven to inherit this exact count while
// Edition B's own non-empty ['faq-b'] proves the opposite (replace) branch.
const defaultDeclaration = { price: 42, billing_cycle: 'Monthly', faq_refs: ['faq-1', 'faq-2'] };

const scopes = buildComposableDeclarationScopes(defaultDeck, defaultPolicy, [editionInherits, editionReplaces], svc, defaultDeclaration);

check(scopes.length === 3, 'one scope per declaration: Default plus the two fixture Editions, no synthetic extra entry');
check(scopes[0].id === 'default' && scopes[0].label === 'Default', 'Default is always the first scope');
check(scopes[1].id === 'edt_a' && scopes[1].label === 'Edition A', 'the second scope uses the Edition\'s own real identity/title');
check(scopes[2].id === 'edt_b' && scopes[2].label === 'Edition B', 'a pending overview draft\'s own title wins over the stale settled one — draft-preferred, matching every other Edition display');

// ── 4. Inherit-when-null / replace-when-non-null ────────────────────────────

check(scopes[1].policy === defaultPolicy, 'an Edition with customer_policy: null inherits Default\'s own policy object wholesale, never a blended/partial copy');
// Draft-preferred: Edition B's own PENDING draft.overview.customer_policy —
// not its stale settled field — is what wins, matching #2's own title proof.
check(scopes[2].policy === editionReplaces.drafts.overview!.customer_policy, 'an Edition with a non-null customer_policy uses its own (draft-preferred) value as a complete replacement, never Default\'s');

// ── 5. Each Edition's own inclusions resolve against its OWN bound sheet ───

check(
  scopes[2].deck.inclusions.length === 1 && scopes[2].deck.inclusions[0].name === 'Edition B Priority Support',
  'Edition B\'s own inclusion resolves against ITS OWN bound Rate Sheet (rs_edition_b), not Default\'s',
);
check(
  !scopes[2].deck.inclusions.some((inclusion) => inclusion.itemId === 'default-item'),
  'Edition B\'s own deck never leaks Default\'s inclusion, even though both share the same buildComposableDeclarationScopes call',
);
check(scopes[1].deck.inclusions.length === 0, 'Edition A binds no Rate Sheet, so it resolves zero inclusions rather than falling back to Default\'s');

// ── 3. Switching scope swaps BOTH Featured inclusions and every policy count ─

const defaultHighlights = projectComposableHighlightInclusions(scopes[0].deck, scopes[0].policy);
const editionBHighlights = projectComposableHighlightInclusions(scopes[2].deck, scopes[2].policy);
check(
  defaultHighlights.length === 1 && defaultHighlights[0].itemId === 'default-item' && defaultHighlights[0].featured === true,
  'Default\'s own scope highlights its own featured item',
);
check(
  editionBHighlights.length === 1 && editionBHighlights[0].itemId === 'edition-b-item' && editionBHighlights[0].featured === false,
  'Edition B\'s own scope highlights ITS OWN item with ITS OWN featured flag — a genuinely different projection, not Default\'s carried over',
);

const defaultStats = summarizeComposableCustomerPolicy(scopes[0].policy);
const editionBStats = summarizeComposableCustomerPolicy(scopes[2].policy);
const featuredCount = (stats: typeof defaultStats) => stats.find((metric) => metric.id === 'featured')?.value;
check(featuredCount(defaultStats) === 1, 'Default\'s own Featured count reflects its own policy (1 featured item)');
check(featuredCount(editionBStats) === 0, 'Edition B\'s own Featured count reflects ITS OWN policy (0 featured items) — the summary genuinely swapped, not a stale carry-over from Default');

// ── 6. No standalone destination, no third card action ──────────────────────

const middleShellSource = readFileSync(resolve(root, 'resources/ts/package-station/presentation/package-tier-workspace/TierComposableMiddleShell.tsx'), 'utf8');
const workspaceSource = readFileSync(resolve(root, 'resources/ts/package-station/presentation/package-tier-workspace/PackageTierWorkspace.tsx'), 'utf8');
// Live-UI correction #12: the selection state is LIFTED OUT of the middle
// shell — it must carry no `useState` of its own at all — and the exact
// same "initial selection is Default" behavior now lives in
// PackageTierWorkspace.tsx instead.
check(
  !middleShellSource.includes('useState'),
  'TierComposableMiddleShell no longer owns any local state — the selected scope is a controlled prop from PackageTierWorkspace.tsx',
);
check(
  workspaceSource.includes("useState('default')") || workspaceSource.includes('useState("default")'),
  'PackageTierWorkspace.tsx now owns the lifted selected-declaration-scope state, initialized to Default — the same initial-selection behavior the middle shell used to own internally',
);
check(!middleShellSource.includes('onManageCustomerOptions'), 'the retired button prop is gone from the middle shell entirely — its panel-head location is the scope tab strip now');

const cardSource = readFileSync(resolve(root, 'resources/ts/package-station/surface/tierSurface/tierOccupantCard.ts'), 'utf8');
check(
  !cardSource.includes('withComposableCustomerOptionsAction') && !cardSource.includes('withComposableEditionsAction') && !cardSource.includes("id: 'editions'") && !cardSource.includes("id: 'customer-options'"),
  'the composable card never grows a third action — View/Edit remain its only two, exactly like every other Tier/Add-on card',
);

// ── 7. The panel's Edit action is removed ENTIRELY, including for Default
//    (2026-09-07 cleanup, same-day follow-up to the reversion above — a
//    prior pass narrowed the Edit action to Default only, but live
//    validation asked for it to be gone from this panel altogether: it is
//    pure view-only now). The scope tabs themselves still switch both
//    columns' projection for VIEWING any declaration — that read-only
//    mechanism is untouched and proven by items 1-6 above ─────────────────

check(
  !middleShellSource.includes('onEditDeclaration')
    && !middleShellSource.includes('<button')
    && !middleShellSource.includes('composable-edit'),
  'TierComposableMiddleShell renders no Edit button, prop, or its retired CSS class reference at all — Default included',
);
check(
  !workspaceSource.includes('dispatchDeclarationEdit')
    && !workspaceSource.includes('onEditDeclaration'),
  'PackageTierWorkspace.tsx no longer defines or passes any Edit-dispatch function into the middle shell',
);

// The encode/decode round trip itself is untouched infrastructure (no
// caller anywhere passes a declarationId any more, but the functions still
// support one correctly — proven structurally sound regardless).
const defaultRecordId = encodeTierDrawerRecordId('ti_1', 'occ_1', 'default');
const editionARecordId = encodeTierDrawerRecordId('ti_1', 'occ_1', 'edt_a');
check(defaultRecordId !== editionARecordId, 'distinct declarations still produce structurally distinct record ids');
check(
  decodeTierDrawerRecordId(defaultRecordId)?.declarationId === 'default'
    && decodeTierDrawerRecordId(editionARecordId)?.declarationId === 'edt_a',
  'decoding a record id still recovers exactly the declaration it was encoded with',
);
check(
  decodeTierDrawerRecordId(encodeTierDrawerRecordId('ti_1', 'occ_1'))?.declarationId === undefined,
  'every existing two-segment caller (no declarationId argument) still decodes with declarationId undefined',
);

const tierDrawerHostSource = readFileSync(resolve(root, 'resources/ts/package-station/surface/tierSurface/TierDrawerHost.tsx'), 'utf8');
check(
  tierDrawerHostSource.includes("initialTierSection={target.declarationId === 'default' ? 'tier-inclusions' : fallbackTierSection}"),
  'declarationId \'default\' still resolves to the Default Tier Inclusions editor (initialTierSection: \'tier-inclusions\'), never the generic empty-slot fallback',
);
check(
  !tierDrawerHostSource.includes('initialDeclarationId'),
  'TierDrawerHost no longer forwards a declarationId prop into the drawer composition at all — Default\'s own routing is fully resolved here via initialTierSection, and nothing downstream reads a declaration id any more (dead as of Phase 1\'s removal from useTierDrawerController)',
);
const tierDrawerTypesSource = readFileSync(resolve(root, 'resources/ts/package-station/drawer/tier/tierDrawerTypes.ts'), 'utf8');
check(
  !tierDrawerTypesSource.includes('initialDeclarationId'),
  'TierDrawerContentProps carries no initialDeclarationId field any more',
);

// ── 8/9 (2026-09-07 reversion): the special auto-open deep-link chain is
//    gone entirely — Options/Edition selection is never externally seeded,
//    and no one-shot intent auto-opens an Edition's inline editor. Live
//    validation twice showed this deep-link route corrupting the drawer's
//    own chrome state (auto-reopen loops, then a header/footer/tab-less
//    "plain modules" render after Save/Cancel); the fix is removal of the
//    entire chain, not a further patch. The normal Options tab / Edition
//    system (chip strip, each module's own Edit, Save/Cancel, lifecycle,
//    Publish) is untouched — this only proves the deep-link entry is gone ──

const controllerSource = readFileSync(resolve(root, 'resources/ts/package-station/drawer/tier/useTierDrawerController.ts'), 'utf8');
check(
  !controllerSource.includes('initialEditionId')
    && !controllerSource.includes('initialDeclarationId')
    && !controllerSource.includes('initialEditionEditTab')
    && !controllerSource.includes('consumeInitialEditionEditTab'),
  'useTierDrawerController no longer derives or seeds anything from an external declaration/Edition target — tierTab and selectedDeclarationId always start at their plain defaults (\'details\', null), regardless of how the drawer was opened',
);
check(
  controllerSource.includes("useState<TierDrawerGroupId>('details')")
    && controllerSource.includes('useState<string | null>(null)'),
  'the active group and the selected declaration id both start at their ordinary unseeded defaults — Options is reached only by the admin\'s own click on the tab, never by an opening prop',
);
check(
  !controllerSource.includes('previousEditingTierId')
    && !controllerSource.includes('if (previous === null && editingTierId !== null) return;'),
  'the null-to-resolved editingTierId skip-guard is gone — it existed only to protect a seeded Edition selection that no longer exists, so the reset effect is unconditional again, exactly as it was before the deep-link mechanism was introduced',
);

const switcherSource = readFileSync(resolve(root, 'resources/ts/package-station/drawer/tier/TierEditionDeclarationSwitcher.tsx'), 'utf8');
check(
  !switcherSource.includes('initialEditTab')
    && !switcherSource.includes('onInitialEditTabConsumed')
    && !switcherSource.includes('initialEditApplied'),
  'TierEditionDeclarationSwitcher carries no auto-open prop, effect, or guard of any kind — an Edition\'s inline editor opens ONLY through the admin\'s own click on a read card\'s Edit action (openEdit, wired to buildTierEditionDetail\'s onEdit), the same as every other module editor in this drawer',
);
const drawerContentSource = readFileSync(resolve(root, 'resources/ts/package-station/drawer/tier/TierDrawerContent.tsx'), 'utf8');
check(
  !drawerContentSource.includes('initialEditTab')
    && !drawerContentSource.includes('onInitialEditTabConsumed')
    && !drawerContentSource.includes('initialEditionEditTab'),
  'TierDrawerContent passes TierEditionDeclarationSwitcher no auto-open plumbing of any kind',
);

// ── 10/11. Each scope's own upper-card fields, genuinely different per
//    scope; projectDeclarationDetailCard merges ONLY those onto the base
//    card ────────────────────────────────────────────────────────────────

check(scopes[0].priceDisplay === '$42.00 · Monthly', 'Default\'s own priceDisplay reflects the price/billing_cycle passed in for the Default declaration');
check(scopes[0].includedFeatureCount === 1 && scopes[0].commonQuestionCount === 2, 'Default\'s own upper-card counts match its own deck.inclusions/faq_refs');

check(scopes[1].priceDisplay === 'Pricing not configured', 'Edition A binds no Rate Sheet items, so its own resolved price is null — never a fabricated figure');
check(scopes[1].includedFeatureCount === 0, 'Edition A\'s own includedFeatureCount matches its own (empty) deck, not Default\'s');
check(scopes[1].commonQuestionCount === 2, 'Edition A\'s own empty faq_refs INHERITS the Default declaration\'s own FAQ count (2), per TierEdition.faq_refs\'s own inherit-when-empty rule');

check(scopes[2].priceDisplay === '$15.00 · Annual', 'Edition B\'s own price is resolved from ITS OWN bound rate_sheet_items/Rate Sheet (resolveRateSheetSelection), and its own draft-preferred billing_cycle wins over the stale settled null — never Default\'s $42.00/Monthly and never a naive buildRateSheetCatalogue candidate row');
check(scopes[2].includedFeatureCount === 1, 'Edition B\'s own includedFeatureCount matches its own resolved deck (1), not Default\'s');
check(scopes[2].commonQuestionCount === 1, 'Edition B\'s own NON-empty faq_refs (draft-preferred [\'faq-b\']) is its own complete REPLACEMENT of the Default count (2), never blended or inherited');

const baseCard: CategoryGroupCardItem = {
  id: 'occ_1', key: 'occ_1', name: 'Package Build Your Own', kind: 'Composable occupant',
  description: 'stale description', status: 'active', notifications: [], actions: [{ id: 'edit', label: 'Edit' }],
  metrics: [{ id: 'stale', label: 'Stale', value: 0 }],
};
const projectedDefault = projectDeclarationDetailCard(baseCard, scopes[0]);
const projectedEditionB = projectDeclarationDetailCard(baseCard, scopes[2]);
check(
  projectedDefault.description === scopes[0].priceDisplay
    && projectedDefault.metrics.find((m) => m.id === 'features')?.value === 1
    && projectedDefault.metrics.find((m) => m.id === 'faqs')?.value === 2,
  'projectDeclarationDetailCard(baseCard, Default scope) re-projects price/features/faqs from the Default scope',
);
check(
  projectedEditionB.description === scopes[2].priceDisplay
    && projectedEditionB.metrics.find((m) => m.id === 'features')?.value === 1
    && projectedEditionB.metrics.find((m) => m.id === 'faqs')?.value === 1,
  'projectDeclarationDetailCard(baseCard, Edition B scope) re-projects price/features/faqs from Edition B\'s own scope, genuinely different from Default\'s',
);
check(
  projectedDefault.id === baseCard.id && projectedDefault.name === baseCard.name
    && projectedDefault.kind === baseCard.kind && projectedDefault.status === baseCard.status
    && projectedDefault.actions === baseCard.actions,
  'projectDeclarationDetailCard touches ONLY price/feature-count/faq-count — identity fields (id/name/kind/status/actions) stay the occupant\'s own, never declaration-owned',
);

// ── 13. REVERTED — no Edit copy/class of any kind remains (see item 7) ─────

check(
  !middleShellSource.includes("'Edit'") && !middleShellSource.includes('>Edit<'),
  'no "Edit" label/copy remains anywhere in the middle shell',
);
check(
  !middleShellSource.includes('cz-tier-deck__button'),
  'the retired Edit button\'s own class is gone entirely, not merely unstyled',
);

// ── 14. No bespoke/hardcoded styling introduced ─────────────────────────────

check(!middleShellSource.includes('style='), 'TierComposableMiddleShell introduces no inline style attribute');
check(!workspaceSource.includes('style='), 'PackageTierWorkspace.tsx introduces no inline style attribute for this correction');
check(
  middleShellSource.includes("classes={{ list: 'cz-station-tabset__list cz-tier-workspace__scope-tabs' }}"),
  'the declaration tabs compose the shared cz-station-tabset__list skin with one narrow layout-modifier class (cz-tier-workspace__scope-tabs) for right-alignment — never a wholesale replacement of the shared tab skin',
);

const adminStationCssSource = readFileSync(resolve(root, 'resources/ts/admin-station/styles/admin-station.css'), 'utf8');
check(
  adminStationCssSource.includes('.cz-tier-workspace__scope-tabs {'),
  'the one narrow layout-modifier class this correction needs (tab-strip right-alignment) is a real, token-based CSS rule, not an undefined/unstyled class or inline style',
);
check(
  !adminStationCssSource.includes('.cz-tier-workspace__composable-edit'),
  'the retired Edit button\'s own CSS rule is removed entirely, not left as dead/unstyled-target CSS',
);
check(
  adminStationCssSource.includes('grid-template-columns: minmax(0, 1fr) minmax(260px, 0.8fr);'),
  'the existing two-column grid (.cz-tier-workspace__composable-shell) is untouched — this correction only adds layout-modifier rules, it never edits the grid itself',
);

// ── 16. The metrics container's own border-top (which doubled the scope
//    tabs' own underline directly beneath them) is gone; between-row
//    dividers still apply ───────────────────────────────────────────────

const metricsContainerBlock = adminStationCssSource.match(/\.cz-tier-workspace__composable-metrics \{[^}]*\}/)?.[0] ?? '';
check(
  metricsContainerBlock.length > 0 && !metricsContainerBlock.includes('border-top'),
  'the metrics container itself carries no border-top any more — the line that doubled the scope tabs\' own bottom border/underline directly beneath them is gone',
);
check(
  adminStationCssSource.includes('.cz-tier-workspace__composable-metrics > * + * {')
    && adminStationCssSource.includes('border-top: 1px solid var(--station-card-divider);'),
  'between-row dividers still apply via the adjacent-sibling selector — only the FIRST row lost its (redundant) top border, every later row still has its own separator from the one before it',
);

// ── 15 (2026-09-07 correction): Edition mutations refresh the Workspace's
//    own separate pkg instance too, not just this drawer's local one, so
//    the Customer Selection Rules panel's scope tabs stop showing stale
//    (Default-looking) data for an Edition whose own values were genuinely
//    just saved. Every occupant-level mutation in usePackageStation.ts
//    already threads onRefresh through to bridge.onMutationComplete (via
//    useTierDrawerController.ts's own `usePackageStation(..., bridge.onMutationComplete)`
//    call) — Edition mutations (useTierEditions.ts, a separate hook) and
//    Edition creation (handleAddEdition) did not, since pkg.refetch() alone
//    only reloads this drawer's own local state; bridge.onMutationComplete
//    is the one thing wired to refresh the ORIGINATING wall (a drawer
//    opened from the Workspace mounts its own separate usePackageStation
//    instance from the Workspace's own — see AdminStationBody.tsx's own
//    doc comment on this contract) ───────────────────────────────────────

check(
  drawerContentSource.includes('c.pkg.refetch();')
    && drawerContentSource.includes('bridge.onMutationComplete?.();')
    && drawerContentSource.includes('notifyEditionMutated,'),
  'TierDrawerContent.tsx no longer passes c.pkg.refetch directly as useTierEditions\' onMutated callback — notifyEditionMutated calls both the drawer\'s own local refetch AND bridge.onMutationComplete, so every Edition mutation (create/save/settle/revert/publish/disable/enable/archive/restore/bin travel — all routed through useTierEditions\' one shared `run()` helper) now refreshes the originating wall too',
);
check(
  controllerSource.includes('pkg.refetch();')
    && controllerSource.includes('bridge.onMutationComplete?.();'),
  'handleAddEdition (Edition creation) also notifies the bridge after refetching its own local pkg — the identical wiring gap as Edition mutations, fixed the same way, so a newly created Edition appears in the Workspace\'s Customer Selection Rules panel without requiring an unrelated refetch first',
);

console.log('Tier catalogue declaration scope contract: PASS');
