import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { LegPaymentSummary } from '@/utils/paymentSummary';
import type { ComposablePreviewChoiceItem, CommercialLegPeriod, CustomerPolicyItem, PackageBuilderFamily, PricingTierData, ServiceInclusion } from '@/api/types/cost-builder';
import { resolveComposablePreview } from '@/api/endpoints/package-builder';
import { buildLegPaymentSummaries, cycleSuffix, resolveHeadlinePrice } from '@/components/cost-builder/PricingTiers';
import { formatPrice } from '@/utils/format';
import { COMPOSABLE_QUOTE_TIER_ID, type FamilyTierQuoteItem } from '@/components/cost-builder/types';

// Preview requests are debounced by this much so typing a quantity does not
// POST on every keystroke — server-side validation stays the sole
// authority regardless; this only trims request volume.
const PREVIEW_DEBOUNCE_MS = 400;

// Phase 2B1 — the composable Tier occupant's own minimal customer
// composition surface: quantity-only Add/Remove browsing over Admin-
// authorized inclusions, with a live server-resolved running total. No
// Price Option control, no Leg/commitment/Edition editing.
//
// Quote/cart connection (composable occupant -> quote/cart phase): this
// component now owns building and committing/removing the one aggregate
// composable FamilyTierQuoteItem for its Family — see onCommit/
// onRemoveFromQuote below and buildComposableFamilyTierQuoteItem(). It
// still owns no cart mutation of its own; the caller (FamilyTierAdapter ->
// PackageBuilderApp) performs the actual upsert/remove. See
// project-work/2026-09-02-composable-tier-customer-ux.md and
// project-work/2026-09-03-composable-tier-admin-to-customer-validation.md.
interface ComposableOfferBrowserProps {
  family: PackageBuilderFamily;
  // 'build_your_own' = direct entry with no normal Tier/Edition chosen yet;
  // 'upgrade_your_build' = rendered after a normal Tier/Edition selection.
  // Presentation only — both read the exact same composable_offer/policy.
  context: 'build_your_own' | 'upgrade_your_build';
  // The already-quoted composable line for this Family+Instance, or null —
  // re-seeds `selection` from its own composableSelection (a real prior
  // customer choice) instead of policy defaults, so switching Family and
  // back (or a page reload restoring the cart) shows the same Add/Remove
  // state the customer already committed rather than resetting to defaults.
  initialCartItem: FamilyTierQuoteItem | null;
  // Called with a freshly built, server-resolved snapshot once the customer
  // has actually interacted with this browser AND the resolved selection is
  // non-empty (at least one required or selected-optional item) — never
  // fired from the initial default-seeded render, and never recomputed from
  // the choice payload alone: price/inclusionItems/legPaymentSummaries all
  // come straight off the matching successful preview response. Add-or-
  // replace: the caller upserts the one aggregate composable line, it never
  // accumulates duplicates.
  onCommit: (item: FamilyTierQuoteItem) => void;
  // Called instead of onCommit, after interaction, when the resolved
  // selection is empty (zero required, zero selected-optional) — removes
  // the composable line entirely rather than committing a zero-value
  // placeholder cart item.
  onRemoveFromQuote: () => void;
  // Live-validation correction (project-work/2026-09-03-composable-tier-
  // admin-to-customer-validation.md, "Upgrade your build accepts an
  // Upgrade while the cart has no primary"): the CURRENT authoritative
  // primary Tier/Edition for this Family+Instance, straight from the cart
  // — null when none is committed. FamilyTierAdapter.tsx's own render gate
  // (selectedTierId !== null) is the belt; this is the suspenders — every
  // Add/Remove control and the debounced auto-commit effect below refuse
  // to act without it, so a click, a stale handler, a race during unmount,
  // or hydration can never start preview/pricing/persistence/projection
  // for an Upgrade with no exact base.
  primaryItem: FamilyTierQuoteItem | null;
}

export interface BrowseRow {
  item_id: string;
  label: string;
  unitPrice: number | null;
  categories: string[];
  service: string | null;
  policy: CustomerPolicyItem;
}

export interface CandidateEntry {
  selected: boolean;
  quantity?: number;
}

const PAGE_SIZE = 6;
type SortMode = 'featured' | 'name';

// Extracted so a contract script can exercise this directly (see
// scripts/composable-offer-choice-contract.ts) — this is the exact piece
// the auditor's correction round found broken: a required row is always
// sent unconditionally (the resolver always treats it as selected
// regardless of what's submitted, so no 'selected' key is needed);
// EVERY optional row is always sent too, with an EXPLICIT selected:
// true/false. Omitting an unselected optional row entirely — the original
// bug — leaves it absent from the submitted choice, and
// PackageManagerSchema::resolveCustomerComposableSelection() treats an
// absent optional row as "use the policy's own default_selected", not
// "not selected". For a default_selected:true item that silently
// re-selects it server-side on every Remove click.
export function buildComposableChoice(
  rows: BrowseRow[],
  selection: Record<string, CandidateEntry>,
): ComposablePreviewChoiceItem[] {
  const choice: ComposablePreviewChoiceItem[] = [];
  for (const row of rows) {
    if (row.policy.mode === 'required') {
      choice.push({ item_id: row.item_id });
      continue;
    }
    const entry = selection[row.item_id];
    const isSelected = entry?.selected ?? false;
    const submitted: ComposablePreviewChoiceItem = { item_id: row.item_id, selected: isSelected };
    if (isSelected && row.policy.quantity) {
      submitted.quantity = entry?.quantity ?? row.policy.quantity.default;
    }
    choice.push(submitted);
  }
  return choice;
}

// Live-validation correction: the one place local Add/Remove `selection`
// state is derived from an authoritative committed cart line (or its
// absence) — used both at mount/Family-switch and by the reconciliation
// effect below that fires when the cart's own composable line disappears
// out from under this component. `cartItem: null` seeds every row back to
// its policy default (the same "no existing cart item" behavior this
// already had at mount) — never a special "cleared" shape of its own.
// Exported so a contract script can exercise it directly, same precedent
// as buildComposableChoice()/resolveItemContributions() elsewhere in this
// file.
export function seedSelectionFromCartItem(
  rows: BrowseRow[],
  cartItem: FamilyTierQuoteItem | null,
): Record<string, CandidateEntry> {
  const seededById = new Map(
    (cartItem?.composableSelection ?? []).map((entry) => [entry.item_id, entry]),
  );
  const next: Record<string, CandidateEntry> = {};
  for (const row of rows) {
    const seeded = seededById.get(row.item_id);
    next[row.item_id] = {
      selected: row.policy.mode === 'required' ? true : (seeded?.selected ?? row.policy.default_selected),
      quantity: seeded?.quantity ?? (row.policy.quantity ? row.policy.quantity.default : undefined),
    };
  }
  return next;
}

// One item_id's resolved contribution, read verbatim off the server's own
// resolved Period/component rows — never computed by multiplying a
// published unit price by a client-held quantity. `ambiguous: true` means
// the SAME item_id was claimed, with a DIFFERENT `line_total`, by more
// than one distinct commercial stream (component.source) in the resolved
// candidate — Default and an Additional Leg may both legally claim the
// same item independently (see the Commercial Legs pricing boundary), so
// there is no single truthful number to show; `lineTotal` is then null and
// the card must not display one.
export interface ItemContribution {
  lineTotal: number | null;
  quantity: number;
  ambiguous: boolean;
  // Live-validation correction ("Upgrade selections should be a compact
  // list"): the claiming component's own billing_cycle, passed through
  // unchanged — never a client-side inference — so each row's inline total
  // can carry the same "/ mo"/"/ yr" cadence suffix cycleSuffix() already
  // renders elsewhere on this surface, instead of a bare unlabeled number.
  billingCycle: string | null;
}

// Extracted so a contract script can exercise this directly (see
// scripts/composable-offer-contribution-contract.ts). Deliberately reads
// only `component.price`'s own per-row `item.line_total`/`item.quantity` —
// server-resolved values — and reads each DISTINCT `component.source` at
// most once for a given item_id, mirroring the same "first-seen-wins per
// source is safe" invariant commercialLegInclusionGroups() (FamilyTierAdapter.tsx)
// already relies on: a Leg's own claimed items[] are built ONCE from the
// container's static declaration, so every repeated appearance of the SAME
// source across multiple resolved Periods is structurally guaranteed
// identical — nothing to reconcile. A SECOND, DIFFERENT source claiming the
// same item_id is a genuinely different commercial stream, not a repeat,
// and is what flips a row to ambiguous.
export function resolveItemContributions(periods: CommercialLegPeriod[]): Record<string, ItemContribution> {
  const bySource = new Map<string, Map<string, ItemContribution>>();
  for (const period of periods) {
    for (const component of period.components) {
      if (!component.available) continue;
      if (bySource.has(component.source)) continue;
      const perItem = new Map<string, ItemContribution>();
      for (const item of component.items) {
        if (item.available === false) continue;
        perItem.set(item.item_id, {
          lineTotal: item.line_total,
          quantity: item.quantity,
          ambiguous: false,
          billingCycle: component.billing_cycle,
        });
      }
      bySource.set(component.source, perItem);
    }
  }
  const out: Record<string, ItemContribution> = {};
  for (const perItem of bySource.values()) {
    for (const [itemId, contribution] of perItem) {
      const existing = out[itemId];
      if (existing === undefined) {
        out[itemId] = contribution;
      } else if (!existing.ambiguous) {
        out[itemId] = { lineTotal: null, quantity: existing.quantity, ambiguous: true, billingCycle: null };
      }
    }
  }
  return out;
}

// Builds the one aggregate composable FamilyTierQuoteItem from a successful
// preview's own resolved response — the exact same "commercial facts come
// only from the server-resolved response" rule buildComposableChoice()'s own
// docblock and resolveItemContributions() already establish for this
// surface. `choice` becomes the item's own composableSelection (intent/
// history for re-seeding); it is never itself read for price/quantity here
// — those come from `contributions`/`periods`. Exported so a contract script
// can exercise it directly, same precedent as buildComposableChoice()/
// resolveItemContributions() above.
export function buildComposableFamilyTierQuoteItem(
  family: PackageBuilderFamily,
  offer: PricingTierData,
  choice: ComposablePreviewChoiceItem[],
  periods: CommercialLegPeriod[],
  contributions: Record<string, ItemContribution>,
  rows: BrowseRow[],
): FamilyTierQuoteItem {
  const commitmentMonths = offer.minimum_term_unit && /month/i.test(offer.minimum_term_unit)
    ? offer.minimum_term_value ?? null
    : null;
  const legPaymentSummaries = buildLegPaymentSummaries(periods, commitmentMonths);
  const headline = resolveHeadlinePrice(periods, offer.headline_leg_id);
  const includedItemIds = new Set(
    choice
      .filter((entry) => entry.selected === undefined || entry.selected === true)
      .map((entry) => entry.item_id),
  );
  const inclusionItems: ServiceInclusion[] = rows
    .filter((row) => includedItemIds.has(row.item_id))
    .map((row) => {
      const contribution = contributions[row.item_id];
      const resolved = contribution && !contribution.ambiguous;
      return {
        id: row.item_id,
        label: row.label,
        quantity: resolved ? contribution.quantity : undefined,
        unit_price: row.unitPrice,
        line_total: resolved ? contribution.lineTotal : null,
        categories: row.categories,
        service: row.service,
      };
    });
  return {
    offer_type: 'family_tier',
    familyId: family.family_id,
    familyPlatformId: family.family_platform_id,
    familyTitle: family.title,
    tierInstanceId: family.tier_instance_id,
    tierInstancePlatformId: family.tier_instance_platform_id,
    tierOccupantId: offer.tier_occupant_id ?? '',
    tierPlatformId: offer.tier_platform_id ?? '',
    tierEditionPlatformId: null,
    tierId: COMPOSABLE_QUOTE_TIER_ID,
    tierTitle: offer.label || 'Build Your Own',
    tierEditionTitle: null,
    price: headline?.price ?? null,
    billingCycle: headline?.billing_cycle ?? '',
    features: inclusionItems.map((item) => item.label),
    inclusionItems,
    isAddon: false,
    isComposable: true,
    composableSelection: choice,
    minimumTermValue: offer.minimum_term_value ?? null,
    minimumTermUnit: offer.minimum_term_unit ?? null,
    planDurationMonths: null,
    legPaymentSummaries,
  };
}

export function ComposableOfferBrowser({ family, context, initialCartItem, onCommit, onRemoveFromQuote, primaryItem }: ComposableOfferBrowserProps) {
  const offer = family.pricing.composable_offer ?? null;
  const policy = offer?.customer_policy ?? null;
  // Live-validation correction: the domain-boundary readiness check every
  // Add/Remove control and the auto-commit effect below gate on — see
  // primaryItem's own docblock above.
  const hasReadyPrimary = primaryItem !== null;

  // Join inclusions (label/price/categories/service — browse metadata) with
  // the customer_policy entry sharing the same item_id (authorization/
  // quantity bounds/featured). An inclusion with no matching policy entry
  // is not offered to the customer at all — the policy is the
  // authorization source of truth, never the inclusions list on its own.
  const rows = useMemo<BrowseRow[]>(() => {
    if (!offer || !policy) return [];
    const inclusionsById = new Map<string, ServiceInclusion>();
    for (const inclusion of offer.inclusions) inclusionsById.set(inclusion.id, inclusion);
    const out: BrowseRow[] = [];
    for (const item of policy.items) {
      const inclusion = inclusionsById.get(item.item_id);
      if (!inclusion) continue;
      out.push({
        item_id: item.item_id,
        label: inclusion.label,
        unitPrice: inclusion.unit_price ?? null,
        categories: inclusion.categories ?? [],
        service: inclusion.service ?? null,
        policy: item,
      });
    }
    return out;
  }, [offer, policy]);

  const rowIdsKey = rows.map((row) => row.item_id).join(',');

  // Candidate selection/quantity — held only here, mirrored into the cart
  // only through onCommit/onRemoveFromQuote below, never written directly.
  // Reseeded whenever the offer's item set itself changes (Family switch, or
  // the offer's own policy changing): from the already-quoted composable
  // item's own composableSelection when one exists for this Family+Instance
  // (a real prior customer choice), falling back to each item's own policy
  // defaults for any row that selection doesn't cover (a row added to the
  // policy after the cart item was last committed) or when there is no
  // existing cart item at all.
  const [selection, setSelection] = useState<Record<string, CandidateEntry>>({});
  const [category, setCategory] = useState('');
  const [service, setService] = useState('');
  const [sort, setSort] = useState<SortMode>('featured');
  const [page, setPage] = useState(0);
  // True only once the customer has actually clicked Add/Remove or changed
  // a quantity for THIS Family's browser instance — gates onCommit/
  // onRemoveFromQuote below so merely viewing this surface (default-seeded,
  // or re-seeded from an already-committed cart item) never itself mutates
  // the cart. Reset alongside `selection` on every reseed below.
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    setSelection(seedSelectionFromCartItem(rows, initialCartItem));
    setCategory('');
    setService('');
    setPage(0);
    setHasInteracted(false);
    // initialCartItem is deliberately excluded: this component's own commit
    // below updates it (via the parent's cart state), and re-including it
    // here would reseed/reset `selection` and `hasInteracted` right after
    // every commit — fighting the customer's own next click. Reseeding from
    // it is a Family-switch/mount concern only, matching the identical
    // reasoning already applied to `family`/`rows` elsewhere in this file.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family.family_id, rowIdsKey]);

  // Live-validation correction (project-work/2026-09-03-composable-tier-
  // admin-to-customer-validation.md, "Upgrade your build still contains
  // Build Your Own authority"): reconcile local Add/Remove state the
  // instant the cart's own authoritative composable line for this
  // Family+Instance disappears out from under this component WITHOUT it
  // having caused that itself — the cart's own × on the Upgrade row
  // (removeFamilyComposableQuoteItem), or a base SWAP cascade
  // (replaceFamilyNormalQuoteItem) that keeps this component mounted
  // (unlike a full primary removal, which unmounts it via
  // FamilyTierAdapter.tsx's own selectedTierId !== null gate — this effect
  // is the belt to that unmount's suspenders for any timing this can't
  // rely on). Tracked via a present -> absent transition on a ref (never
  // fired for the ordinary absent -> present commit echo, which would
  // otherwise fight the customer's own next click — same reasoning as the
  // mount effect above excluding initialCartItem from its own deps) so a
  // stale selection can never keep the card reading "Remove"/showing a
  // subtotal for an item the cart no longer has, and hasInteracted can
  // never stay permanently armed to silently re-fire the debounced
  // auto-commit effect below and resurrect a removed Upgrade as a
  // standalone cart line. upsertFamilyComposableQuoteItem()'s own hard
  // invariant in utils/quote.ts (refuses to insert without a matching
  // primary) is the second, structural layer of this same guarantee — an
  // Upgrade must never be able to live in the cart alone, by data
  // invariant, not merely by this component behaving correctly.
  // Live-validation correction, second round: the SAME reset also fires
  // when the primary itself disappears (hasReadyPrimary true -> false),
  // tracked independently of initialCartItem above — a customer can
  // interact (hasInteracted: true, something "selected") before ever
  // having a committed Upgrade line to lose, so initialCartItem alone
  // (still null throughout that case) would never catch it. Either
  // transition independently triggers the same reset; neither depends on
  // the other having fired.
  const hadCartItemRef = useRef(initialCartItem !== null);
  const hadReadyPrimaryRef = useRef(hasReadyPrimary);
  // Live-validation correction (regression migration round): the docblock
  // above already said this effect should fire "WITHOUT it having caused
  // that itself" — the implementation never actually checked that. Set
  // right before the ONE call that can drive initialCartItem to null from
  // this component's own action (the auto-commit effect's own
  // onRemoveFromQuote() below, a genuine customer Remove-to-zero) and
  // consumed the very next time this effect observes that transition.
  // Without it, a self-driven removal reseeds `selection` to a NEW-but-
  // equivalent object, which — because the auto-commit effect below
  // compares dependencies by reference, not value — re-fires an entirely
  // redundant preview request for a selection that was already known and
  // already resolved. Not a loop (it settles after the one extra call),
  // but a real wasted round-trip on every ordinary Remove-to-empty click,
  // only ever exercisable once a real primary is present to let this
  // effect run at all — see composable-quote-cart-loop-regression.mjs.
  const selfCausedRemovalRef = useRef(false);
  useEffect(() => {
    const hadCartItem = hadCartItemRef.current;
    const hadReadyPrimary = hadReadyPrimaryRef.current;
    hadCartItemRef.current = initialCartItem !== null;
    hadReadyPrimaryRef.current = hasReadyPrimary;
    const cartItemJustRemoved = hadCartItem && initialCartItem === null;
    const primaryJustRemoved = hadReadyPrimary && !hasReadyPrimary;
    if (cartItemJustRemoved && selfCausedRemovalRef.current) {
      selfCausedRemovalRef.current = false;
      if (!primaryJustRemoved) return;
    }
    if (cartItemJustRemoved || primaryJustRemoved) {
      setSelection(seedSelectionFromCartItem(rows, null));
      setHasInteracted(false);
    }
  }, [initialCartItem, hasReadyPrimary, rows]);

  const categories = useMemo(
    () => Array.from(new Set(rows.flatMap((row) => row.categories))).sort(),
    [rows],
  );
  const services = useMemo(
    () => Array.from(new Set(
      rows
        .filter((row) => category === '' || row.categories.includes(category))
        .flatMap((row) => (row.service ? [row.service] : [])),
    )).sort(),
    [rows, category],
  );

  // Required items are always included — never a browse/Add-Remove choice
  // of their own, matching the accepted contract ("no selector" for a
  // fixed/required inclusion).
  const filtered = useMemo(() => {
    let list = rows.filter((row) => row.policy.mode === 'optional');
    if (category !== '') list = list.filter((row) => row.categories.includes(category));
    if (service !== '') list = list.filter((row) => row.service === service);
    list = [...list].sort((a, b) => {
      if (sort === 'featured' && a.policy.featured !== b.policy.featured) {
        return a.policy.featured ? -1 : 1;
      }
      return a.label.localeCompare(b.label);
    });
    return list;
  }, [rows, category, service, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE);

  // Same "only a month-unit commitment caps an open-ended Leg's schedule"
  // gate FamilyTierAdapter's own itemFor()/buildLegPaymentSummaries() call
  // already applies to a normal Tier/Edition — reused verbatim here, never
  // a second rule.
  const commitmentMonths = offer?.minimum_term_unit && /month/i.test(offer.minimum_term_unit)
    ? offer.minimum_term_value ?? null
    : null;

  const [preview, setPreview] = useState<{
    ok: boolean;
    summaries: LegPaymentSummary[] | null;
    contributions: Record<string, ItemContribution> | null;
    message: string | null;
  }>({
    ok: true,
    summaries: null,
    contributions: null,
    message: null,
  });
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (rows.length === 0) return;
    // Live-validation correction: without an exact ready primary, this
    // effect must not even START a preview request — not merely skip the
    // eventual onCommit/onRemoveFromQuote call at the end of it. Bailing
    // out here, before setPreviewLoading/the debounce timer, is what
    // satisfies "a click, stale handler, hydration, or programmatic call
    // must not start preview, pricing, persistence, or projection without
    // the exact primary." hasReadyPrimary is also a dependency below, so a
    // primary disappearing mid-debounce tears down any in-flight timer via
    // this same effect's own cleanup, exactly like a Family switch already
    // does.
    if (!hasReadyPrimary) return;
    const choice = buildComposableChoice(rows, selection);

    let cancelled = false;
    setPreviewLoading(true);
    const timer = window.setTimeout(() => {
      resolveComposablePreview(family.family_id, choice)
        .then((result) => {
          if (cancelled) return;
          if (!result.ok) {
            setPreview({ ok: false, summaries: null, contributions: null, message: 'This combination is not available right now.' });
            return;
          }
          // Periods are timeline boundaries, not a commercial total on their
          // own — a recurring stream can span several of them. Reuse the
          // SAME payment-summary presentation the rest of this surface
          // already relies on (one row per resolved commercial stream,
          // cycle + start/end) rather than summing component prices across
          // periods into an invented cross-period number. This deliberately
          // never touches summary.subtotal/occurrenceMonths — those depend
          // on the same finite-occurrence counting this repo has an open,
          // unresolved discrepancy on (see the Phase 2A TCV floor removal);
          // reviving that math here was explicitly rejected in review.
          const periods = result.periods ?? [];
          const summaries = buildLegPaymentSummaries(periods, commitmentMonths);
          // Each card's own resolved individual contribution — read
          // verbatim off the server's resolved rows, never computed here by
          // multiplying a published unit price by the locally-held
          // quantity. See resolveItemContributions()'s own docblock for why
          // a second distinct commercial stream claiming the same item_id
          // makes that item's card contribution ambiguous rather than summed.
          const contributions = resolveItemContributions(periods);
          setPreview({ ok: true, summaries, contributions, message: null });

          // Cart sync — gated on hasInteracted so merely browsing (initial
          // default-seeded render, or re-seeding an already-committed
          // selection back from the cart) never itself adds/removes a cart
          // line; only an actual customer action does. The commit/removal
          // decision AND every commercial fact on the built item come only
          // from this successful resolved response — `choice` becomes the
          // item's own composableSelection (intent/history), never a
          // pricing source of its own.
          if (offer && hasInteracted) {
            const hasAnyIncluded = choice.some((entry) => entry.selected === undefined || entry.selected === true);
            if (!hasAnyIncluded) {
              selfCausedRemovalRef.current = true;
              onRemoveFromQuote();
            } else {
              onCommit(buildComposableFamilyTierQuoteItem(family, offer, choice, periods, contributions, rows));
            }
          }
        })
        .catch(() => {
          if (!cancelled) setPreview({ ok: false, summaries: null, contributions: null, message: 'Could not resolve pricing right now.' });
        })
        .finally(() => {
          if (!cancelled) setPreviewLoading(false);
        });
    }, PREVIEW_DEBOUNCE_MS);
    return () => { cancelled = true; window.clearTimeout(timer); };
    // `family` itself is deliberately not a dependency — a Family switch
    // always changes family_id (the row/offer set is re-derived from it via
    // `rows`/`offer` anyway), so this avoids re-fetching merely because the
    // parent handed down a new-identity-but-same-content family object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family.family_id, rows, selection, commitmentMonths, offer, hasInteracted, onCommit, onRemoveFromQuote, hasReadyPrimary]);

  if (!offer || !policy || rows.length === 0) return null;

  const heading = context === 'build_your_own' ? 'Build Your Own' : 'Upgrade your build';

  return (
    <section class="cz-package-builder__composable" aria-labelledby="cz-composable-heading">
      <h3 id="cz-composable-heading" class="cz-heading-sm">{heading}</h3>
      <p class="cz-package-builder__composable-subheading">Recommended Upgrades</p>

      <div class="cz-package-builder__composable-filters">
        <label class="cz-package-builder__composable-filter">
          Category
          <input
            list="cz-composable-categories"
            value={category}
            onInput={(event) => {
              setCategory((event.target as HTMLInputElement).value);
              setService('');
              setPage(0);
            }}
            placeholder="All Categories"
          />
          <datalist id="cz-composable-categories">
            {categories.map((option) => <option key={option} value={option} />)}
          </datalist>
        </label>
        <label class="cz-package-builder__composable-filter">
          Service
          <input
            list="cz-composable-services"
            value={service}
            onInput={(event) => {
              setService((event.target as HTMLInputElement).value);
              setPage(0);
            }}
            placeholder="All Services"
          />
          <datalist id="cz-composable-services">
            {services.map((option) => <option key={option} value={option} />)}
          </datalist>
        </label>
        <label class="cz-package-builder__composable-filter">
          Sort
          <select
            value={sort}
            onChange={(event) => setSort((event.target as HTMLSelectElement).value as SortMode)}
          >
            <option value="featured">Featured</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      <ul class="cz-package-builder__composable-list">
        {pageRows.map((row) => {
          const current = selection[row.item_id];
          const isSelected = current?.selected ?? false;
          // The row's total is the server-resolved contribution whenever
          // one is available and unambiguous for a currently-selected row
          // — never a client-side unitPrice*quantity computation. A row
          // that is not selected, whose contribution hasn't resolved yet
          // (still loading/failed), or whose item_id is ambiguously
          // claimed by more than one concurrent commercial stream falls
          // back to the published base/unit price, clearly labeled as such
          // rather than presented as the current total.
          const resolvedContribution = isSelected && preview.ok
            ? preview.contributions?.[row.item_id] ?? null
            : null;
          const showResolved = resolvedContribution !== null && !resolvedContribution.ambiguous
            && resolvedContribution.lineTotal !== null;
          return (
            <li key={row.item_id} class="cz-package-builder__composable-row">
              <svg class="cz-package-builder__composable-row-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M4.75 3.5h4.5c.69 0 1.25.56 1.25 1.25v4.5c0 .69-.56 1.25-1.25 1.25h-4.5A1.25 1.25 0 0 1 3.5 9.25v-4.5c0-.69.56-1.25 1.25-1.25Zm10 0h4.5c.69 0 1.25.56 1.25 1.25v4.5c0 .69-.56 1.25-1.25 1.25h-4.5a1.25 1.25 0 0 1-1.25-1.25v-4.5c0-.69.56-1.25 1.25-1.25Zm-10 10h4.5c.69 0 1.25.56 1.25 1.25v4.5c0 .69-.56 1.25-1.25 1.25h-4.5a1.25 1.25 0 0 1-1.25-1.25v-4.5c0-.69.56-1.25 1.25-1.25Zm10 0h4.5c.69 0 1.25.56 1.25 1.25v4.5c0 .69-.56 1.25-1.25 1.25h-4.5a1.25 1.25 0 0 1-1.25-1.25v-4.5c0-.69.56-1.25 1.25-1.25Z" />
              </svg>
              <span class="cz-package-builder__composable-row-label">{row.label}</span>
              {row.policy.quantity && isSelected && (
                <input
                  type="number"
                  class="cz-package-builder__composable-row-qty"
                  min={row.policy.quantity.min}
                  max={row.policy.quantity.max}
                  step={row.policy.quantity.step}
                  value={current?.quantity ?? row.policy.quantity.default}
                  aria-label={`${row.label} quantity`}
                  // Live-validation correction: disabled AND the handler
                  // itself refuses to act without hasReadyPrimary — belt and
                  // suspenders, matching the auto-commit effect's own guard.
                  disabled={!hasReadyPrimary}
                  onInput={(event) => {
                    if (!hasReadyPrimary) return;
                    const raw = Number((event.target as HTMLInputElement).value);
                    setSelection((prev) => ({ ...prev, [row.item_id]: { selected: true, quantity: raw } }));
                    setHasInteracted(true);
                  }}
                />
              )}
              {showResolved && (
                <span class="cz-package-builder__composable-row-total">
                  {formatPrice(resolvedContribution!.lineTotal)}
                  {cycleSuffix(resolvedContribution!.billingCycle)}
                </span>
              )}
              {!showResolved && row.unitPrice !== null && (
                <span class="cz-package-builder__composable-row-total cz-package-builder__composable-row-total--note">
                  {formatPrice(row.unitPrice)} per unit
                </span>
              )}
              <button
                type="button"
                class={`cz-package-builder__composable-row-action ${isSelected ? 'is-remove' : 'is-add'}`}
                // Live-validation correction: without an exact ready
                // primary this control must be non-interactive — a native
                // disabled button already blocks the click, and the
                // handler's own early return is the second layer for a
                // stale handler/programmatic dispatch.
                disabled={!hasReadyPrimary}
                aria-label={`${isSelected ? 'Remove' : 'Add'} ${row.label}`}
                title={isSelected ? 'Remove' : 'Add'}
                onClick={() => {
                  if (!hasReadyPrimary) return;
                  setSelection((prev) => ({
                    ...prev,
                    [row.item_id]: {
                      selected: !isSelected,
                      quantity: prev[row.item_id]?.quantity ?? row.policy.quantity?.default,
                    },
                  }));
                  setHasInteracted(true);
                }}
              >
                <span aria-hidden="true">{isSelected ? '×' : '+'}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div class="cz-package-builder__composable-pager">
        <button
          type="button"
          class="cz-package-builder__composable-page-btn"
          disabled={clampedPage === 0}
          onClick={() => setPage((current) => Math.max(0, current - 1))}
          aria-label="Previous"
        >‹</button>
        <span>{clampedPage + 1} / {pageCount}</span>
        <button
          type="button"
          class="cz-package-builder__composable-page-btn"
          disabled={clampedPage >= pageCount - 1}
          onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
          aria-label="Next"
        >›</button>
      </div>

      {/* Auditor correction ("deployed customer UI validation failed"
          round): the standalone resolved-summaries list (one "$X.XX / mo
          Ongoing"-style row per commercial stream) that used to render
          here was a detached duplicate of the SAME aggregate already
          shown in the quote/cart summary and Details — removed as
          redundant and visually disconnected. preview.summaries itself is
          untouched (still read by the auto-commit effect above to decide
          onCommit/onRemoveFromQuote and to build the committed item) —
          only this presentation block is gone; loading/error/empty
          feedback for the live preview request remain. */}
      <div class="cz-package-builder__composable-preview" aria-live="polite">
        {previewLoading && <span>Updating…</span>}
        {!previewLoading && preview.ok && preview.summaries && preview.summaries.length === 0 && (
          <span>No inclusions selected yet.</span>
        )}
        {!previewLoading && !preview.ok && preview.message && (
          <span class="cz-package-builder__composable-preview-error">{preview.message}</span>
        )}
      </div>
    </section>
  );
}
