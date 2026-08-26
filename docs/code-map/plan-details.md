# Plan Details

## Purpose and ownership

A "View plan details" trigger sits below the last left payment card in the
[Package Builder Focused Shell](package-builder-focused-shell.md) — a
quiet, secondary text control, never the primary CTA. It opens a separate
overlay surface (`PlanDetailsModal.tsx`) presenting the focused Tier/
Edition's own Commercial Leg terms as a document, not another pricing
card. Page/body scroll locks while open (`document.body.style.overflow`,
ESC-close, focus trap — the same pattern `PdfModal.tsx` already
establishes); the popup's own body scrolls internally. The close control
reuses the focused shell's own circular-X styling and sits outside the
scrolling panel, never inside the scrolling content.

## Target identity and lifecycle

The trigger resolves an explicit `PlanDetailsTarget` at click time from
whichever Tier/Edition is focused at that exact moment — never inferred
from tab position or carried over from a previous open:

```ts
interface PlanDetailsTarget {
  tierId: TierId;               // internal Tier id (family.pricing.tiers key)
  editionId: string | null;     // internal Edition selector id (periodsForVariant)
  platformId: string;           // real tier_platform_id, or edition_platform_id when an Edition is selected
}
```

This is identity only — never copied Period/pricing data. `FamilyTierAdapter.tsx`
re-derives `focusedData`/`selectedEdition`/`activePeriods`/commitment/plan
label fresh from `family` + this target on every render, reusing
`periodsForVariant()`/`resolveEffectiveTierDisplay()` — no second resolver.
The overlay renders as a sibling of whichever view (focused/staged/default)
is active, never nested inside the focused branch's own subtree, so it
never depends on that branch's own live locals once open.

`PlanDetailsModal` takes no `isOpen` prop: it is only ever mounted while a
target is set, keyed by `` `${platformId}:${openGeneration}` `` (an open-
generation counter bumped on every trigger click) — mounting IS opening,
unmounting IS closing, and every open is a genuinely fresh instance (fresh
refs, fresh scroll-lock/focus-trap effect). Switching Tier/Edition, closing
the focused view, or completing Add to Quote clears the target
synchronously in the same state batch — never a stale-props update.

## Content model

**Billing Breakdown by Period** renders every resolved Period and its
AVAILABLE components — explains which Legs are active TOGETHER, never a
payment restart. A component with the same composition as the immediately
preceding Period's own occurrence is described as continuing unchanged
rather than repeating its full item table.

**Payment Category labels** are synthesized from `billing_cycle`, the same
rule the admin Pricing Rules editors already use (`paymentCategoryOf()`):
one-time/upfront → "Fixed payment"; every other cycle → "Recurring
payment"; a null cycle → neutral "Payment" (never confidently called
either). Multiple simultaneously active components in one Period use the
neutral "Active payments" aggregate instead.

**Customer-facing ranges** translate a backend `0` start to "Plan start" —
never a raw "Month 0" — in both the Period headings and the Plan Summary
schedule column; later starts stay numeric.

**Plan Summary** aggregates by stable `component.source` across every
Period it appears in — never counts a Period fragment as a separate Leg. A
finite recurring stream's occurrences step by cadence from its own start
(annual starting Month 11 with a 48-month cap → 11, 23, 35, 47). A stream
with no finite end and no parent commitment to fall back to renders
Occurrences = "Ongoing" and Subtotal = "—"; if ANY contributing stream is
non-finite, Total Contract Value itself renders "—" rather than a
false finite sum — it is never silently treated as 0 or skipped while
still summing the rest.

## Authoritative files

| Area | Files |
|---|---|
| Popup | `PlanDetailsModal.tsx` |
| Target/trigger/lifecycle | `FamilyTierAdapter.tsx` |
| Shared Period/component helpers | `commercialLegPresentation.ts` |
| Reused scroll-lock/focus-trap precedent | `PdfModal.tsx` |
| Admin Payment Category precedent | `TierPricingRulesEditor.tsx`, `TierEditionOverviewFields.tsx` |

## Related Code Maps

[Package Builder Focused Shell](package-builder-focused-shell.md),
[Commercial Legs](commercial-legs.md), and [Cost Builder](cost-builder.md).
