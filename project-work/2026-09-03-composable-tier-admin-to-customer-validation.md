# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — production live-validation regression**
- Auditor verdict: **Stop — architectural risk**
- Validated production source: `main@528f7295fcc8e505cb0d064d01fe8e077f228924`
- Browser validation date: 2026-09-04

## Accepted architecture and non-change boundary
- An exact Tier/Edition base becomes an in-progress composable draft; explicit **Finalise build** produces exactly one Build Your Own item.
- The final item must retain authoritative peer snapshots: `composedBase` for the exact selected Tier/Edition and `composedUpgrade` for committed upgrades.
- Top-level commercial fields are deterministic projections of those peers and must count every charge exactly once.
- Do not restore a standalone base alongside the final Build Your Own item.
- Preserve the intended removal of attached optional add-ons when the primary build is finalised.
- Do not change schema ownership, Rate Sheet definitions, pricing facts, or unrelated customer/admin presentation.

## Live browser evidence
Scenario: KAIROS — IaaS, Starter Cloud, Block Storage upgrade, with Backup & DR Shield temporarily attached.

- **PASS:** Finalise was disabled before an upgrade was selected.
- **PASS:** Immediately after adding Block Storage, the UI showed **Updating…** and Finalise remained disabled.
- **PASS:** Finalise enabled only after the committed preview settled.
- **PASS:** The unfinished draft blocked **Review & Finalise Quote** with “Finalise your build before requesting a quote.”
- **PASS:** Before finalisation, the cart showed Starter Cloud plus an **UPGRADES** section; Block Storage was $10/month ongoing and Initial Payment displayed $167.
- **PASS:** Adding Backup & DR Shield created a separate third add-on, and finalising removed that add-on with the primary cascade.
- **FAIL:** After Finalise, the cart correctly collapsed to one `KAIROS — IaaS / BUILD YOUR OWN` item, but it showed only Monthly $10 and an estimated $10/month total.
- **FAIL:** Quote Details contained only Block Storage quantity 100 and Monthly $10/Ongoing. It omitted the entire Starter Cloud base snapshot (2 vCPU, 8 GB RAM, SUSE Linux, base Block Storage, Backup Storage — BaaS, Static IP Block) and its $156.50 monthly plus $80 yearly payment streams.
- **FAIL:** Quote Details did not present grouped **Base** and **Upgrades** sections.

No raw post IDs, meta keys, hashes, bearer values, or similar plumbing were observed before the stop point. Downstream Request/email validation was not attempted because the authoritative final quote representation already failed.

## Exact fix request for Claude
1. Diagnose the finalise commit/projection path at the stated production SHA. Ensure the one final Build Your Own item retains the exact selected Starter Cloud/Edition snapshot in authoritative `composedBase` and the committed Block Storage change in `composedUpgrade`.
2. Do not flatten or overwrite the base with an upgrade-only preview. Rebuild top-level commercial projections from both peers, counting each inclusion and payment stream exactly once.
3. Make cart summary, contract/initial-payment totals, and Quote Details reflect the combined base and upgrade. Quote Details must visibly group **Base** and **Upgrades** and include all base and upgrade inclusions.
4. For this scenario preserve the source pricing facts: base $156.50/month + $80/year, plus upgrade $10/month. Existing display-rounding conventions may remain, but stored facts and aggregate totals must be exact.
5. Preserve the passing race guard, unfinished-draft Review block, one-item final representation, and intended add-on removal.
6. Add a regression covering: select exact base; attach add-on; add Block Storage; wait for resolved committed preview; finalise; assert one Build Your Own item, add-on gone, base peer present, upgrade peer present, combined projection, grouped details, and stable state after reload. Retain a stale-preview/finalise guard test.
7. Do not submit a fresh Request or email until this browser gate passes.

Report changed files, tests, source commit, coordination commit, and deployed SHA. Set this file to **AWAITING CHATGPT REVIEW** when ready. Do not push product source until the gate permits it.
