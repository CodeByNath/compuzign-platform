# Composable Tier — Admin → customer browser handoff

## Status
- **READY FOR CLAUDE — fix Customer Options inclusion boundary first.**
- Auditor verdict: **Stop — architectural risk.**
- Production `main@8ff4eff90129f15f8140858d21cb923dd2f5d549`; deploy #934 succeeded.

## Live evidence
KAIROS Build Your Own was configured/published through the normal occupant flow using existing `KAIROS-IaaS` data:
- 2 vCPU ×1
- Block Storage ×100
- Backup Storage — BaaS ×50
- Default Leg Recurring / Monthly / indefinite; headline $48.50 monthly.

Family remains Tiers 5; composable card is Active; Customer Options appears only there.

Opening Customer Options correctly opens the separate Customer Selection Rules drawer, but Edit shows **45 Rate Sheet rows** instead of the occupant's **3 selected inclusion rows**. No policy was saved; customer `/pricing/` validation stopped.

## Required correction
Customer Options must read the **current composable occupant selection identities**, not the bound Rate Sheet catalogue.

Expected rows are exactly the occupant-owned selections above. The Rate Sheet remains upstream catalogue authority but is never the Customer Options row source.

Claude must:
- derive policy rows from persisted `rate_sheet_selections`/occupant inclusion identities only;
- use Rate Sheet resolution only to enrich those selected identities with labels/pricing metadata;
- reject policy item IDs that are stale, foreign, unselected, or merely available on the Rate Sheet;
- ensure removing an inclusion from the occupant makes its prior policy invalid/non-public safely;
- preserve valid policy draft save/reopen;
- keep Customer Options separate from the normal four-module occupant editor.

Add a contract with a Rate Sheet containing many rows but an occupant selecting exactly three; the policy drawer and server validation must expose/accept only those three.

## Approved follow-up direction — NOT the bug fix
Nath wants the normal Build Your Own inclusion setup eventually to support two convenient authoring choices:
1. **Select inclusions** — current granular selection.
2. **Import all current Rate Sheet inclusions** — bulk-select every eligible row into the occupant.

Important safeguard: “Import all” must be a **snapshot/bulk selection into the occupant**, not a persistent wildcard binding. Future Rate Sheet additions must not silently become occupant/customer offerings. Once imported, the occupant owns the explicit selected identities and Admin may remove/edit them normally. Customer Options still sees only occupant-owned selections.

Do not implement this bulk-import enhancement in the current correction unless the inclusion-boundary fix genuinely requires the same primitive. Record a proposed smallest follow-up after the bug is corrected.

## Non-change boundary
No Rate Sheet mutation, new pricing/Legs, normal Tier/Add-on changes, cart/quote/Request/PDF/email/promotions/TCV work, fake data or REST/DevTools bypass.

## Claude next action
Patch the existing review branch for the inclusion-boundary defect only, add focused contracts, report exact SHA/files/tests and a small follow-up proposal for the snapshot bulk-import option, set **AWAITING CHATGPT REVIEW**, and stop. Do not push `main`.