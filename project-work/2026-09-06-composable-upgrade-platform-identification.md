# Composable Upgrade Platform Identification — CZTU / CZTEU

## Status
- **READY FOR CLAUDE — ownership interpretation corrected; audit only, no source changes approved**
- Auditor verdict: **Proceed with safeguards**.
- Production remains `main@28f716b1bde85717787418e29efbbf8dce978d3c`.

## Nath's correction — locked
“Keep both” does **not** mean an Upgrade belongs to a Tier occupant.

The Rate Sheet Bundle is the precedent:
- the Bundle participates in the normal Rate Sheet ecosystem/pipeline through a real Rate Sheet row with its normal Rate Sheet native identity and `CZPRCI`;
- the same commercial thing also carries Bundle identity (`bundle_id` + `CZPRCB`) declaring that it is a Bundle;
- Bundle identity does not replace the Rate Sheet identity, and the Bundle does not become a child of the row merely because both identities travel together.

Therefore the prior proposal to define Upgrade identity as an occupant-owned `upgrade_pairings[]` child keyed by a base occupant is **not accepted**. It conflated relationship/context with ownership.

## Correct audit question
Audit Upgrade as a dual-identity participant in the existing Tier/Edition commercial pipeline, analogous to Bundle inside Rate Sheet:
- preserve the existing Tier/Edition ecosystem identity and routing needed for the established Tier pipeline;
- add an Upgrade-specific stable native identity + `CZTU` / `CZTEU` to declare that this commercial entity is an Upgrade;
- neither identity replaces the other;
- do not make CZTU/CZTEU a child identity of the base occupant merely because a customer Upgrade is applied relative to a base plan;
- any base-plan association required by a quote is composition/transaction context and must not silently redefine catalog ownership.

## Claude next action — audit only
1. Map Bundle exactly: which stored record owns `bundle_id`/CZPRCB, which Rate Sheet row carries `item_id`/CZPRCI, and how the same Bundle traverses ordinary Rate Sheet projector/resolver/routes while retaining Bundle identity.
2. Map the current composable Upgrade candidate to the Tier/Edition equivalent: identify the existing Tier/Edition pipeline record and identities it already carries, and determine where a sibling Upgrade native ID + CZTU/CZTEU can live without changing that ownership.
3. Do **not** introduce `upgrade_pairings[]`, base-occupant-qualified native Upgrade IDs, or a new occupant-owned child model unless hard source evidence proves they are required.
4. Separate three things explicitly: (a) ecosystem identity/routing, (b) Upgrade type identity, (c) quote-time relationship to a selected base Tier/Edition.
5. Show how the customer quote/Request can carry all relevant identities together without flattening or substituting them.
6. Give the smallest implementation phase after this ownership audit. No implementation yet. Set **AWAITING CHATGPT REVIEW**.
