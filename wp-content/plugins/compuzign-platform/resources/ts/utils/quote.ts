import type { CartItem, FamilyTierQuoteItem, QuoteItem, QuoteItemTierId } from '@/components/cost-builder/types';

// ── Cart identity and mutation ──────────────────────────────────────────────
//
// A quote cart line is no longer uniquely identified by serviceId alone: one
// Service can carry one normal (non-add-on) selection plus zero or more
// add-on Tier selections at once. The stable identity of a line is therefore
// serviceId + (isAddon ? tierId : the fact that it is the one non-add-on
// line for that serviceId) — used for both React/Preact list keys and
// mutation. Every helper below is pure so the cart-key contract can be
// exercised without mounting a component.

/** Stable list key / identity string for one cart line. */
export function isFamilyTierQuoteItem(item: CartItem): item is FamilyTierQuoteItem {
  return item.offer_type === 'family_tier';
}

export function familyTierSystemKey(item: FamilyTierQuoteItem): string {
  return `family:${item.familyPlatformId}:instance:${item.tierInstancePlatformId}`;
}

export type FamilyTierQuoteItemRole = 'primary' | 'addon' | 'composable';

/**
 * The one place that resolves primary/addon/composable for a
 * FamilyTierQuoteItem — every call site below reads through this rather
 * than re-deriving the same isAddon/isComposable branch independently, so
 * the three roles can never drift out of agreement with each other. Every
 * writer in this module sets isComposable only inside a freshly built
 * composable snapshot (ComposableOfferBrowser.tsx's own builder), always
 * paired with isAddon: false, so the two are never both true in practice;
 * this still resolves deterministically (composable takes priority) rather
 * than throwing, so a read path over a hand-edited/corrupted persisted cart
 * degrades to a defensible classification instead of crashing the cart UI.
 */
export function resolveQuoteItemRole(item: FamilyTierQuoteItem): FamilyTierQuoteItemRole {
  if (item.isComposable) return 'composable';
  return item.isAddon ? 'addon' : 'primary';
}

/**
 * Live-correction round: whether a composable ("Build Your Own") line has a
 * sibling primary Tier for the SAME Family+Tier-Instance in the same cart —
 * i.e. it was reached via the "upgrade your build" entry point rather than
 * standing alone. Contextual, not a stored fact: the same composable line
 * can gain or lose a sibling primary as the customer edits the cart, so this
 * is computed at render time from the cart array, never cached on the item
 * itself.
 *
 * Correction (deployed live-gate finding, 2026-09-05): QuoteProposalPreview.tsx
 * is NOT admin-only — it is the one shared renderer behind the customer's own
 * Review & Finalise Print/Save-as-PDF, the standalone customer Quote View
 * page, AND (via NotificationTemplates.php's parallel PHP rendering) the
 * customer confirmation email, so a prior round's assumption that it could
 * keep "Build Your Own" unconditionally was itself the leak. Every
 * customer-facing consumer (QuoteSummary.tsx, OrderSummary.tsx,
 * QuoteProposalPreview.tsx, and the PHP email templates) now applies this
 * same rule to show "Upgrades" instead of "Build Your Own" for exactly this
 * coexistence case. Internal identity/keys and the Admin Request-list
 * surface (requestItemDisplay.ts, the Request drawer) are unaffected and
 * keep "Build Your Own" — those never render the customer proposal markup.
 */
export function composableCoexistsWithPrimary(item: FamilyTierQuoteItem, items: CartItem[]): boolean {
  if (resolveQuoteItemRole(item) !== 'composable') return false;
  const systemKey = familyTierSystemKey(item);
  return items.some((other) => isFamilyTierQuoteItem(other)
    && resolveQuoteItemRole(other) === 'primary'
    && familyTierSystemKey(other) === systemKey);
}

const ROLE_HIERARCHY_RANK: Record<FamilyTierQuoteItemRole, number> = {
  primary: 0,
  composable: 1,
  addon: 2,
};

/**
 * Live-gate correction (2026-09-05, "cart hierarchy requirement"): a
 * customer-facing, presentation-only reordering of the cart — main plan
 * first, its Upgrade (composable) second when present, its add-ons last —
 * deterministic by Family+Tier-system identity and role, never by
 * insertion history. `QuoteSummary.tsx` previously rendered raw
 * `items.map(...)`, so an Upgrade added after an add-on (or a base Tier
 * swap, which re-appends the replaced primary at the END of the array —
 * see replaceFamilyNormalQuoteItem() above) visibly reordered the list in
 * a way that tracked WHEN something was added/changed, not what it is.
 *
 * A stable sort, never a mutation of `items` itself or of canonical cart
 * storage: each Family+Tier-system's items are kept together as one block,
 * positioned wherever that system FIRST appears among the other items in
 * the array (so unrelated Services/other Family systems keep their own
 * existing relative position); within a system's own block, items sort by
 * role (primary, then composable/Upgrade, then addon); items sharing a
 * block+role (multiple add-ons) keep their original relative order via the
 * final index tie-break. A non-Family item is its own single-item "system"
 * (keyed by its own index), so it is untouched relative to every other
 * item — this function only ever reorders WITHIN a Family+Tier-system's
 * own cluster.
 */
export function orderedQuoteItems(items: CartItem[]): CartItem[] {
  const systemAnchor = new Map<string, number>();
  const systemKeyAt = (item: CartItem, index: number): string =>
    isFamilyTierQuoteItem(item) ? familyTierSystemKey(item) : `__solo__:${index}`;
  items.forEach((item, index) => {
    const key = systemKeyAt(item, index);
    if (!systemAnchor.has(key)) systemAnchor.set(key, index);
  });
  const roleRankOf = (item: CartItem): number =>
    isFamilyTierQuoteItem(item) ? ROLE_HIERARCHY_RANK[resolveQuoteItemRole(item)] : 0;

  return items
    .map((item, index) => ({ item, index, systemKey: systemKeyAt(item, index) }))
    .sort((a, b) => {
      const anchorDiff = systemAnchor.get(a.systemKey)! - systemAnchor.get(b.systemKey)!;
      if (anchorDiff !== 0) return anchorDiff;
      const roleDiff = roleRankOf(a.item) - roleRankOf(b.item);
      if (roleDiff !== 0) return roleDiff;
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}

export function quoteItemKey(item: CartItem): string {
  if (isFamilyTierQuoteItem(item)) {
    const systemKey = familyTierSystemKey(item);
    const role = resolveQuoteItemRole(item);
    if (role === 'composable') return `${systemKey}:composable`;
    return role === 'addon' ? `${systemKey}:addon:${item.tierPlatformId}` : `${systemKey}:primary`;
  }
  return item.isAddon ? `${item.serviceId}:addon:${item.tierId}` : `${item.serviceId}:primary`;
}

/**
 * Replacing the primary never disturbs an existing Add-on for the same
 * Family+Instance. An existing composable ("Upgrade your build") line is
 * different: in the active upgrade-only regime (see
 * project-work/2026-09-03-composable-tier-admin-to-customer-validation.md,
 * Phase 0 correction) an Upgrade only ever exists dependent on its exact
 * base Tier/Edition — standalone Build Your Own is disabled, so an Upgrade
 * surviving a base SWAP would be exactly the forbidden orphaned-standalone
 * state. Swapping to a genuinely different Tier/Edition therefore also
 * drops the composable line; re-confirming the SAME Tier/Edition (e.g. a
 * plan-duration change via Choose Plan, which still calls this with a
 * freshly built item for the identical Tier/Edition) leaves it alone.
 *
 * Identity safeguard (second Phase 0 correction round): the base-changed
 * comparison is anchored on `tierOccupantId` — the platform's own native
 * occupant identity, mandatory here — not a Platform-ID-only check.
 * `CZT`'s own reference shape is `(tier_instance_id, occupant_id)` (see the
 * CompuZign Platform skill's platform-id-families.md): occupant_id is the
 * true identity a Platform ID is minted against, so occupant_id is what
 * this compares first, never tierPlatformId alone standing in for it.
 * `tierEditionPlatformId` is compared alongside it as the exact Edition
 * identity — the only Edition-identifying field this item shape carries
 * (no separate native edition id exists on FamilyTierQuoteItem), naturally
 * covering "no Edition" too via direct null-safe equality. Still a plain
 * identity comparison, never a revived draft/staleness state machine.
 */
export function replaceFamilyNormalQuoteItem(items: CartItem[], item: FamilyTierQuoteItem): CartItem[] {
  const systemKey = familyTierSystemKey(item);
  const previousPrimary = items.find((existing): existing is FamilyTierQuoteItem => isFamilyTierQuoteItem(existing)
    && resolveQuoteItemRole(existing) === 'primary'
    && familyTierSystemKey(existing) === systemKey);
  const baseChanged = !previousPrimary
    || previousPrimary.tierOccupantId !== item.tierOccupantId
    || previousPrimary.tierEditionPlatformId !== item.tierEditionPlatformId;
  return [
    ...items.filter((existing) => {
      if (!isFamilyTierQuoteItem(existing) || familyTierSystemKey(existing) !== systemKey) return true;
      const role = resolveQuoteItemRole(existing);
      if (role === 'primary') return false;
      if (role === 'composable') return !baseChanged;
      return true;
    }),
    item,
  ];
}

export function upsertFamilyAddonQuoteItem(items: CartItem[], item: FamilyTierQuoteItem): CartItem[] {
  const key = quoteItemKey(item);
  return [...items.filter((existing) => quoteItemKey(existing) !== key), item];
}

/**
 * Add or replace the one aggregate composable ("Upgrade your build") line
 * for this Family+Instance — full-snapshot replace, never a per-item patch,
 * mirroring upsertFamilyAddonQuoteItem's own shape. Independent of the
 * primary Tier and every Add-on: it never removes them.
 *
 * Live-validation correction (project-work/2026-09-03-composable-tier-
 * admin-to-customer-validation.md, "Upgrade your build still contains
 * Build Your Own authority"): a primary already existing for this exact
 * Family+Instance is a HARD invariant enforced HERE, at the cart's own
 * data boundary — not merely a UI-entry-point gate the caller is trusted
 * to have applied first. A relying-on-the-caller invariant is exactly what
 * let a stale ComposableOfferBrowser re-fire its debounced auto-commit
 * effect and resurrect a just-removed (or now-orphaned) Upgrade line
 * straight into the cart, alone, with no base — the forbidden standalone
 * state reached through a code path this function's own docblock
 * previously assumed could never call it that way. No-op (returns `items`
 * unchanged) when no matching primary exists; the reverse direction — a
 * primary being removed or swapped drops this line — is
 * replaceFamilyNormalQuoteItem()'s/removeFamilyTierSystemQuoteItems()'s
 * job, not this function's.
 */
export function upsertFamilyComposableQuoteItem(items: CartItem[], item: FamilyTierQuoteItem): CartItem[] {
  const systemKey = familyTierSystemKey(item);
  const hasPrimary = items.some((existing) => isFamilyTierQuoteItem(existing)
    && resolveQuoteItemRole(existing) === 'primary'
    && familyTierSystemKey(existing) === systemKey);
  if (!hasPrimary) return items;
  const key = quoteItemKey(item);
  return [...items.filter((existing) => quoteItemKey(existing) !== key), item];
}

export function removeFamilyAddonQuoteItem(
  items: CartItem[],
  familyId: string,
  tierInstanceId: string,
  tierPlatformId: string,
): CartItem[] {
  return items.filter((item) => !isFamilyTierQuoteItem(item)
    || item.familyId !== familyId
    || item.tierInstanceId !== tierInstanceId
    || item.tierPlatformId !== tierPlatformId);
}

/**
 * Remove ONLY the one composable ("Upgrade your build") line for this
 * Family+Instance, leaving the primary Tier and every Add-on untouched —
 * the "remove just my Upgrade" action (ComposableOfferBrowser's own Remove
 * flow, or the composable line's own "×" in the cart list). The reverse
 * cascade — removing/swapping the primary also drops this line — lives in
 * removeFamilyTierSystemQuoteItems()/replaceFamilyNormalQuoteItem() above,
 * not here.
 */
export function removeFamilyComposableQuoteItem(
  items: CartItem[],
  familyId: string,
  tierInstanceId: string,
): CartItem[] {
  return items.filter((item) => !isFamilyTierQuoteItem(item)
    || item.familyId !== familyId
    || item.tierInstanceId !== tierInstanceId
    || resolveQuoteItemRole(item) !== 'composable');
}

/**
 * Removes the primary Tier, every Add-on, AND the composable ("Upgrade
 * your build") line for this Family+Instance — the whole Tier System.
 *
 * Phase 0 correction (project-work/2026-09-03-composable-tier-admin-to-
 * customer-validation.md): in the active upgrade-only regime an Upgrade
 * only ever exists dependent on an already-selected primary Tier/Edition —
 * standalone Build Your Own is disabled at its one entry point
 * (FamilyTierAdapter.tsx). Letting a composable line survive the primary's
 * removal (the pre-Phase-0 behaviour, when standalone Build Your Own was
 * still a live, separately-reachable journey) would leave exactly that
 * forbidden orphaned-standalone state reachable again through this route.
 * An Add-on only makes sense paired with a primary that is about to stop
 * existing, and now so does an Upgrade — both are cleared by the same
 * cascade.
 */
export function removeFamilyTierSystemQuoteItems(
  items: CartItem[],
  familyId: string,
  tierInstanceId: string,
): CartItem[] {
  return items.filter((item) => !isFamilyTierQuoteItem(item)
    || item.familyId !== familyId
    || item.tierInstanceId !== tierInstanceId);
}

/**
 * Add or replace the one normal (non-add-on) selection for item.serviceId —
 * a normal Tier, a promotion, or the legacy recommended bundle. Removes only
 * the existing normal line for that serviceId; every add-on line for that
 * same serviceId (and every line for every other serviceId) is left exactly
 * as it was. This is the rule that lets switching the normal Tier, or
 * selecting a promotion, coexist with already-selected add-ons — same-Tier-
 * System add-on compatibility is implicit, so there is no separate rule set
 * to consult here.
 */
export function replaceNormalQuoteItem(items: CartItem[], item: QuoteItem): CartItem[] {
  return [...items.filter((q) => isFamilyTierQuoteItem(q) || q.isAddon || q.serviceId !== item.serviceId), item];
}

/**
 * Add or update one add-on line, identified by serviceId + tierId. Never
 * touches the normal selection or any other add-on for the same Service.
 */
export function upsertAddonQuoteItem(items: CartItem[], item: QuoteItem): CartItem[] {
  return [
    ...items.filter((q) => isFamilyTierQuoteItem(q) || !(q.isAddon && q.serviceId === item.serviceId && q.tierId === item.tierId)),
    item,
  ];
}

/**
 * Remove exactly one add-on line (serviceId + tierId), leaving the normal
 * selection and every other add-on for the same Service untouched.
 */
export function removeAddonQuoteItem(items: CartItem[], serviceId: number, tierId: QuoteItemTierId): CartItem[] {
  return items.filter((q) => isFamilyTierQuoteItem(q) || !(q.isAddon && q.serviceId === serviceId && q.tierId === tierId));
}

/**
 * Remove a whole Service from the quote: its normal selection AND every
 * add-on selected alongside it. This is also the correct behaviour for
 * deselecting the normal Tier outright (clicking an already-selected Tier to
 * remove it) — add-ons only make sense paired with a normal Tier, so clearing
 * the normal selection clears its add-ons too, rather than leaving them
 * orphaned with nothing to attach to.
 */
export function removeServiceQuoteItems(items: CartItem[], serviceId: number): CartItem[] {
  return items.filter((q) => isFamilyTierQuoteItem(q) || q.serviceId !== serviceId);
}

export interface ClassifiedQuoteItems {
  mainItems: QuoteItem[];
  bundleItems: QuoteItem[];
  tierAddonItems: QuoteItem[];
  familyMainItems: FamilyTierQuoteItem[];
  familyAddonItems: FamilyTierQuoteItem[];
  // The composable ("Build Your Own") occupant's own aggregate line(s) —
  // never merged into familyMainItems: presentation/replacement semantics
  // must not call it "primary", even though a combined commercial total may
  // legitimately aggregate both (see resolveQuoteItemRole()).
  familyComposableItems: FamilyTierQuoteItem[];
}

/**
 * The four explicitly distinct, never-merged cart-line classifications used
 * by OrderSummary: the customer's one normal Tier/promotion per Service, the
 * legacy recommended bundle (still its own negative serviceId, unchanged),
 * real Tier add-ons (isAddon, regardless of serviceId sign — never inferred
 * from it), and the composable occupant's own line, kept apart from
 * familyMainItems by the same resolveQuoteItemRole() every other Family-item
 * mutation in this module already goes through.
 */
export function classifyQuoteItems(items: CartItem[]): ClassifiedQuoteItems {
  const serviceItems = items.filter((item): item is QuoteItem => !isFamilyTierQuoteItem(item));
  const familyItems = items.filter(isFamilyTierQuoteItem);
  return {
    mainItems: serviceItems.filter((item) => item.serviceId > 0 && !item.isAddon),
    bundleItems: serviceItems.filter((item) => item.serviceId < 0),
    tierAddonItems: serviceItems.filter((item) => item.isAddon),
    familyMainItems: familyItems.filter((item) => resolveQuoteItemRole(item) === 'primary'),
    familyAddonItems: familyItems.filter((item) => resolveQuoteItemRole(item) === 'addon'),
    familyComposableItems: familyItems.filter((item) => resolveQuoteItemRole(item) === 'composable'),
  };
}

export interface QuoteTotals {
  pricedItems: CartItem[];
  unpricedItems: CartItem[];
  cycleGroups: Record<string, number>;
  cycleEntries: [string, number][];
  hasMixedCycles: boolean;
  singleCycle: [string, number] | null;
}

export function calcQuoteTotals(items: CartItem[]): QuoteTotals {
  const pricedItems = items.filter((item) => item.price !== null);
  const unpricedItems = items.filter((item) => item.price === null);

  const cycleGroups = pricedItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.billingCycle] = (acc[item.billingCycle] ?? 0) + (item.price as number);
    return acc;
  }, {});

  const cycleEntries = Object.entries(cycleGroups) as [string, number][];
  const hasMixedCycles = cycleEntries.length > 1;
  const singleCycle = cycleEntries.length === 1 ? cycleEntries[0] : null;

  return { pricedItems, unpricedItems, cycleGroups, cycleEntries, hasMixedCycles, singleCycle };
}
