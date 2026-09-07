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
//   7. Second-round correction (auditor confirmed the gap): the panel keeps
//      one Edit action whose TARGET follows the currently selected scope —
//      never a fixed 'default' — via the real encodeTierDrawerRecordId/
//      decodeTierDrawerRecordId round trip.
//   8. Default scope resolves to the Default Tier Inclusions editor
//      (initialTierSection: 'tier-inclusions'); an Edition scope resolves
//      to that EXACT Edition's own id, never another Edition's or Default's
//      — proven both as a real id round trip and via source-scan of the
//      resolution/seeding logic (TierDrawerHost.tsx/
//      useTierDrawerController.ts/TierEditionDeclarationSwitcher.tsx).
//   9. The seeded Edition selection survives the composable occupant's own
//      null → resolved editingTierId transition (its first load), so the
//      panel's Edit action reliably lands on the intended Edition rather
//      than being silently reset back to none.
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
//  13. The middle shell's Edit action reads exactly "Edit" (not "Edit
//      Customer Options") and wears the established Admin primary-button
//      class (`cz-tier-deck__button cz-tier-deck__button--primary`), the
//      same treatment TierDetailPanel.tsx's own buttons use.
//  14. No bespoke/hardcoded inline styling was introduced in either touched
//      presentation file (no `style=` attributes; every class referenced is
//      either a pre-existing established class or one of the two narrow
//      layout-modifier classes this correction adds, both composed onto the
//      shared `cz-station-tabset__list` / `cz-tier-deck__button` skins
//      rather than replacing them).

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

// ── 7/8/9. The panel's Edit action follows the selected scope; each
//    resolves to that exact declaration; the seed survives first load ──────

check(
  middleShellSource.includes('onClick={() => onEditDeclaration(active?.id ?? \'default\')}'),
  'the panel\'s Edit action targets `active` (the currently selected scope), never a hardcoded \'default\'',
);

// Real round trip: encoding with a declarationId, decoding it back, never
// bleeding across two different Editions or into Default.
const defaultRecordId = encodeTierDrawerRecordId('ti_1', 'occ_1', 'default');
const editionARecordId = encodeTierDrawerRecordId('ti_1', 'occ_1', 'edt_a');
const editionBRecordId = encodeTierDrawerRecordId('ti_1', 'occ_1', 'edt_b');
check(defaultRecordId !== editionARecordId && editionARecordId !== editionBRecordId, 'each declaration produces a structurally distinct record id');
check(
  decodeTierDrawerRecordId(defaultRecordId)?.declarationId === 'default'
    && decodeTierDrawerRecordId(editionARecordId)?.declarationId === 'edt_a'
    && decodeTierDrawerRecordId(editionBRecordId)?.declarationId === 'edt_b',
  'decoding each record id recovers EXACTLY the declaration it was encoded with — Edition A can never resolve to Edition B or Default',
);
check(
  decodeTierDrawerRecordId(encodeTierDrawerRecordId('ti_1', 'occ_1'))?.declarationId === undefined,
  'every existing two-segment caller (no declarationId argument) still decodes with declarationId undefined — byte-identical to before this correction',
);

check(
  workspaceSource.includes("encodeTierDrawerRecordId(instanceId, tool.composableOccupant.occupantId, declarationId)")
    && workspaceSource.includes("'edit',"),
  'the panel dispatches through the SAME existing \'edit\' action/drawer every card\'s own Edit button uses — no new action intent or drawer template',
);

const tierDrawerHostSource = readFileSync(resolve(root, 'resources/ts/package-station/surface/tierSurface/TierDrawerHost.tsx'), 'utf8');
check(
  tierDrawerHostSource.includes("initialTierSection={target.declarationId === 'default' ? 'tier-inclusions' : fallbackTierSection}"),
  'declarationId \'default\' resolves to the Default Tier Inclusions editor (initialTierSection: \'tier-inclusions\'), never the generic empty-slot fallback',
);
check(
  tierDrawerHostSource.includes('initialDeclarationId={target.declarationId}'),
  'the decoded declarationId is forwarded into the drawer composition, not read only at the host level',
);

const controllerSource = readFileSync(resolve(root, 'resources/ts/package-station/drawer/tier/useTierDrawerController.ts'), 'utf8');
check(
  controllerSource.includes("initialDeclarationId && initialDeclarationId !== 'default' ? initialDeclarationId : null"),
  'a real Edition declarationId (never the literal \'default\') is what seeds the Edition-scoped state below',
);
check(
  controllerSource.includes("useState<TierDrawerGroupId>(initialEditionId ? 'options' : 'details')")
    && controllerSource.includes('useState<string | null>(initialEditionId)'),
  'an Edition scope seeds BOTH the active group (Options) and the selected declaration id in one consistent step — never landing on Options with nothing selected, or vice versa',
);
check(
  controllerSource.includes('if (previous === null && editingTierId !== null) return;'),
  'the composable occupant\'s own first null-to-resolved editingTierId transition is recognised and skipped, so the seeded Edition selection survives it rather than being wiped by the same effect that clears a genuine Tier-to-Tier switch',
);

const switcherSource = readFileSync(resolve(root, 'resources/ts/package-station/drawer/tier/TierEditionDeclarationSwitcher.tsx'), 'utf8');
check(
  switcherSource.includes('if (!initialEditTab || !selected) return;')
    && switcherSource.includes('openEdit(initialEditTab);')
    && switcherSource.includes('onInitialEditTabConsumed?.();'),
  'the pre-selected Edition\'s own inline editor opens automatically once its draft-preferred data resolves, then immediately reports the intent consumed',
);
check(
  !switcherSource.includes('initialEditApplied'),
  'the routing-correction rewrite (2026-09-07): the auto-open guard is no longer a component-local ref, since TierEditionDeclarationSwitcher itself unmounts on every Edition mutation refetch (including its own Save) — a local ref reset on that remount while the old derived initialEditTab value stayed truthy, re-firing the auto-open after every Save and leaving no reachable footer (the live defect the rejected first candidate only partly fixed)',
);
check(
  controllerSource.includes("useState<TierEditionEditorTab | undefined>(initialEditionId ? 'inclusions' : undefined)")
    && controllerSource.includes('const consumeInitialEditionEditTab = () => setInitialEditionEditTab(undefined);'),
  'initialEditionEditTab is real one-shot STATE owned by useTierDrawerController (seeded once from initialEditionId, never re-derived on every render) with its own consume function — the controller instance survives the refetch-triggered remount that unmounts TierEditionDeclarationSwitcher (same reason selectedDeclarationId/editionBinActive are lifted here), so consuming it there is what actually prevents the post-Save re-open, not a guard living in the component that gets torn down',
);
const drawerContentSource = readFileSync(resolve(root, 'resources/ts/package-station/drawer/tier/TierDrawerContent.tsx'), 'utf8');
check(
  drawerContentSource.includes('initialEditTab={c.initialEditionEditTab}')
    && drawerContentSource.includes('onInitialEditTabConsumed={c.consumeInitialEditionEditTab}'),
  'TierDrawerContent wires both the one-shot value and its consume callback into the switcher — Options activation, the exact Edition selection, and the switcher\'s own Save/Cancel-driven return to the normal drawer chrome are all unchanged by this correction',
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

// ── 13. Exact "Edit" copy, established primary-button treatment ────────────

check(
  />\s*Edit\s*</.test(middleShellSource) && !middleShellSource.includes('Edit Customer Options'),
  'the middle shell\'s action reads exactly "Edit" — the retired "Edit Customer Options" copy is gone entirely',
);
check(
  middleShellSource.includes('cz-tier-deck__button cz-tier-deck__button--primary'),
  'the Edit action wears the established Admin primary-button class (cz-tier-deck__button cz-tier-deck__button--primary), the same treatment TierDetailPanel.tsx\'s own buttons use — not the plain, non-primary cz-tier-deck__button it wore before this correction',
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
  adminStationCssSource.includes('.cz-tier-workspace__scope-tabs {') && adminStationCssSource.includes('.cz-tier-workspace__composable-edit {'),
  'the two narrow layout-modifier classes this correction needs (tab-strip right-alignment, Edit bottom-right placement) are real, token-based CSS rules, not undefined/unstyled classes or inline styles',
);
check(
  adminStationCssSource.includes('grid-template-columns: minmax(0, 1fr) minmax(260px, 0.8fr);'),
  'the existing two-column grid (.cz-tier-workspace__composable-shell) is untouched — this correction only adds layout-modifier rules, it never edits the grid itself',
);

console.log('Tier catalogue declaration scope contract: PASS');
