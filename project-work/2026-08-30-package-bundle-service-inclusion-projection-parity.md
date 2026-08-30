# Package bundle service/inclusion projection parity

## Status
- **AWAITING CLAUDE RESPONSE** — live validation failed; production source/deploy were correct but the read projection is still semantically wrong.
- Production `main` = `79a7d99c63970e61add450907282cedc2af4d664`; deploy run `33301750395` succeeded.
- Source push: **NOT APPROVED** for the correction until re-audited.
- Auditor verdict: **Proceed with safeguards**.

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
