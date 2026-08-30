# Package bundle service/inclusion projection parity

## Status
- **AWAITING CHATGPT REVIEW** — correction implemented, tested, and pushed to a review branch.
- Production `main` remains at `79a7d99c63970e61add450907282cedc2af4d664` (unchanged; deploy run `33301750395` succeeded for that commit — the shell-as-one-Inclusion defect, not the expansion correction below).
- Source push: **NOT APPROVED** — correction stays on the review branch until audited.
- Auditor verdict carried over: **Proceed with safeguards**.

## Confirmed root cause
OMNIA — Banking selects one self-priced Bundle commercial Rate Sheet row. The previous patch correctly stopped dropping that row and correctly derives Services/Categories from `row.includes[]`, but it then made the Bundle shell itself the displayed/countable Inclusion.

## Live validation failure — 2026-08-30
Nath validated production and confirmed it is **not fixed**: Focused inclusions renders the **Foundation Bundle as one Inclusion** instead of the real inclusions the Bundle supplies.

This conflicts with established Bundle presentation semantics already used by the customer Cost Builder: the Bundle remains one commercial Rate Sheet row for pricing/selection, while its `includes[]` are expanded into the visible inclusion rows. `FamilyTierAdapter.tsx` explicitly preserves this split; do not redesign it.

## Claude — correction required
1. Re-read the existing Bundle-aware Cost Builder path and the existing admin Inclusion/Bundle drawer/projection behavior before editing. Reuse the established semantic rule; do not invent another Bundle model.
2. Keep the Bundle shell as the Tier's **commercial selection/pricing row**. Do not split pricing, quantity ownership, Leg assignment, or persistence into child selections.
3. For **read/display inclusion projection**, expand a selected Bundle through its already-resolved `includes[]` and show the real supplied inclusion rows. Do **not** render the Bundle shell as an Inclusion row.
4. Inclusion counts on Package Family, Family Group, Group/Rate Sheet connection surfaces and focused Details must reflect the actual resolved inclusion children. For current OMNIA Foundation, derive the count from its live `includes[]`; never hard-code `3`.
5. Ordinary non-Bundle inclusion rows remain one visible/countable inclusion. FAQ/non-inclusion rows remain excluded. Deduplicate only by the authoritative supplied row identity where the same inclusion is genuinely reached twice; do not suppress intentional cross-Leg/commercial duplication outside this admin projection.
6. Preserve the previous correct Service/Category provenance fix from the compiled Bundle children.
7. No schema migration, pricing change, Rate Sheet mutation, identity change, customer UI redesign, or persistence change.

## Acceptance
Add focused regression coverage proving a Tier selecting only one Bundle commercial row projects its supplied inclusion children (not the Bundle shell), with counts derived from `includes[]`; ordinary inclusion and empty-state behavior must remain unchanged. Confirm KAIROS/APTOS unchanged. Update affected Code Map only if current documented behavior/responsibility needs correction. Push correction to a review branch, record exact SHA/tests/files here, set **AWAITING CHATGPT REVIEW**, and stop.

## Claude Report — correction — 2026-08-30

**What was wrong.** The prior fix stopped dropping a self-priced Bundle row
from Family/Group composition, but then counted/displayed the Bundle SHELL
itself as one Inclusion. Re-read `PricingTiers.tsx`'s `TierCard` (the
established customer Cost Builder precedent) before touching anything: it
renders a Bundle row as a non-checkable section header (never counted),
while its own `includes[]` render as the real checkable inclusion rows
beneath it — the Bundle is the commercial selection/pricing vehicle only,
never an Inclusion in its own right. Applied that same split to the admin
projections, per instruction #3 ("do not render the Bundle shell as an
Inclusion row" in Details > Focused inclusions specifically — distinct from
`PoolInclusionsEditor.tsx`'s own unrelated Bundle sub-list, which is an
editing surface out of scope here and untouched).

**Backend** (`PackageRepository::composeTierGroup()`): a self-priced row's
own identity is no longer added to the inclusions dedup/count set. Instead
it walks `row.includes[]` and counts/dedupes each real supplied row by THAT
row's own `(rate_sheet_id, item_id)` identity — exactly like a directly
selected row, including correctly deduping when the same underlying row is
reached both directly and via a Bundle (new regression case added).

**Frontend** (`deck.ts`): `projectTierInclusions()` now expands a Bundle
selection into one `DeckInclusion` per supplied child (never the shell), with
no per-child unit price (a Bundle's own commercial price is independent of
what its ingredients sum to — matches existing `PackageManagerSchema` rule).
`projectTierRateSheetGroups`/`projectTierRateSheet`'s `connectedInclusions`
now use a shared `inclusionCountFor()` (1 for an ordinary row,
`includes.length` for a Bundle) instead of a boolean check; `connectedRows`
is untouched (a Bundle is still ONE physical connected row).

**Regression coverage.**
- `tests/tier-group-composition.php`: OMNIA fixture now asserts
  `inclusions=2` (its two real supplied rows: SOC + Desk) rather than 1 (the
  shell); services/categories unchanged (2/2, already correct). New case:
  a Tier directly selecting the same row (`row_soc`) the Bundle already
  supplies dedupes to 2 total, not 3 — proven and reverted cleanly so later
  assertions (including the batch/wall path, updated to `inclusions=2`) are
  unaffected. KAIROS/APTOS assertions untouched and still pass.
- `scripts/package-tier-workspace-contract.ts`: asserts the Bundle shell
  itself never appears as a row, its child does (with the child's own
  category enrichment and `unitPrice: null`), and group/sheet
  `connectedInclusions` reflect the child count.

**Validated:** `php tests/tier-group-composition.php`,
`php tests/tier-pricing-parity.php`, `php tests/rate-sheet-bundle.php`,
`php tests/tier-instance-schema.php`, `php tests/tier-occupant-compatibility.php`,
`php tests/active-package-contract.php`, `npm run contract:package-tier-workspace`,
`npm run contract:tier-connections`, `npm run contract:package-family-card-metrics`,
`npm run contract:tier-settings`, `npx tsc --noEmit`, `npm run build`,
`npm run docs:check` — all pass. Same five files touched as the prior round
(no scope drift); no Code Map change (no ownership/path/responsibility
change, only an internal projection-rule correction).

**Review branch:** `review/package-bundle-inclusion-expansion-correction`
(branched from `main@79a7d99c`) at commit
`4935f2b9b994b06ad9175bfaa99ed8fa7f89d158`, pushed to origin. Not merged/
pushed to `main`. Files changed: `dist/js/admin-station.js`,
`resources/ts/package-station/surface/packageTierWorkspace/deck.ts`,
`scripts/package-tier-workspace-contract.ts`,
`src/Modules/SurfacePackages/Repositories/PackageRepository.php`,
`tests/tier-group-composition.php` (all under
`wp-content/plugins/compuzign-platform/`).
