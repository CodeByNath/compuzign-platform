// Phase 3 correction contract — project-work/2026-09-06-tier-catalogue-
// admin-ux-consolidation.md. Proves the auditor's final approved UX: the
// Customer Selection Rules panel gains one scope tab per declaration
// (Default plus every existing Build Your Own Edition), scope selection is
// presentation-only, and switching scope swaps BOTH the Featured inclusions
// list and every policy-summary count to that declaration's own resolved
// state. Real behavior against buildComposableDeclarationScopes/
// projectComposableHighlightInclusions/summarizeComposableCustomerPolicy
// (pure exported functions), plus source-scan proof that the retired
// button/drawer was replaced by these tabs and not by a new card action or
// a new drawer route. Proves:
//
//   1. Default is always the first scope, and TierComposableMiddleShell's
//      own initial selection is Default.
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

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildComposableDeclarationScopes, projectComposableHighlightInclusions, summarizeComposableCustomerPolicy } from '../resources/ts/package-station/surface/packageTierWorkspace/composableMiddleShell';
import { EMPTY_TIER_DECK, type TierDeck } from '../resources/ts/package-station/surface/packageTierWorkspace/deck';
import { decodeTierDrawerRecordId, encodeTierDrawerRecordId } from '../resources/ts/package-station/drawer/tier/tierDrawerTypes';
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
  // draft-preferred: a pending overview draft's own title must win over the
  // stale settled one, exactly like every other Edition display already does.
  drafts: { overview: { title: 'Edition B', admin_description: '', rate_sheet_id: 'rs_edition_b', rate_sheet_items: [{ item_id: 'edition-b-item', quantity: 1 }], billing_cycle: null, contact: false, minimum_term_value: null, minimum_term_unit: null, from_month: 0, to_month: null, legs: [], headline_leg_id: '', inclusions_override: [], faq_refs: [], customer_policy: policyOf('edition-b-item', false) } },
});

const scopes = buildComposableDeclarationScopes(defaultDeck, defaultPolicy, [editionInherits, editionReplaces], svc);

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
check(
  middleShellSource.includes("useState(scopes[0]?.id ?? 'default')"),
  'TierComposableMiddleShell initializes its own scope selection to the first (Default) scope',
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

const workspaceSource2 = readFileSync(resolve(root, 'resources/ts/package-station/presentation/package-tier-workspace/PackageTierWorkspace.tsx'), 'utf8');
check(
  workspaceSource2.includes("encodeTierDrawerRecordId(instanceId, tool.composableOccupant.occupantId, declarationId)")
    && workspaceSource2.includes("'edit',"),
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
  switcherSource.includes('if (initialEditApplied.current || !initialEditTab || !selected) return;')
    && switcherSource.includes('initialEditApplied.current = true;')
    && switcherSource.includes('openEdit(initialEditTab);'),
  'the pre-selected Edition\'s own inline editor opens automatically exactly once, waiting for its draft-preferred data to resolve, and never re-fires on a later manual Save/Cancel/tab switch',
);

console.log('Tier catalogue declaration scope contract: PASS');
