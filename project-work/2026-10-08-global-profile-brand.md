# Manager → Settings → Tools → Profile — Active Work

## Status
**BUILDER ACTION REQUIRED — Phase 0 cleanup ACCEPTED; next design checkpoint only.**
Reviewer verdict: **Proceed with safeguards**. Builder Claude; Reviewer ChatGPT; Owner Nath.
`main` `8d1f0185811e69214c0fd85c29819eef0c5d9226`; existing topic `global-profile-platform-settings` `125502d9ce1206548bfaa8d954746d7d4ac7dc74`. No implementation/release approval.

## Verified cleanup — 2026-10-08
Independently compared topic with `main`: **zero file differences**, matching Git tree `e0da141f44ca2304e5f02d2092afcd4650fcc2c8`. All previous Phase 1B candidate source, tests, policy entries and documentation changes were reverted with history preserved. No candidate dependency/lockfile changes. **Cleanup accepted.** Builder's local Node runtime issue was not independently reproduced and does not invalidate the exact tree check.

## Binding Owner model
**Manager → Settings → Tools → Profile**, with permanent Platform ID families:
- Manager: `CZMXXXXX`
- Manager Settings: `CZMSXXXXX`
- Manager Settings Tools: `CZMSTXXXXX`
- Manager Settings Tools Profile: `CZMSTPXXXXX`

The four prefix requirements are binding; do **not** silently delete levels or substitute `CZPS`/`CZPSP`. `XXXXX` is the existing five-character Policy suffix. All four are distinct by full anchored length. **Settings is not a Station.** The existing `station-manager/` frontend coordinator remains coordinator-only, and Admin Station remains presentation-only. Do not claim either already owns a durable Manager record.

## Next Builder task — design only, no source changes
Using [locked handover](2026-10-08-global-profile-brand-handover.md), `AGENTS.md`, `docs/ai-index.md`, `docs/code-map/station-manager.md`, `docs/code-map/admin-station.md`, `docs/code-map/platform-identifier-station.md` and current source:
1. Specify **one coherent Manager-owned configuration domain** with four *genuine*, permanently addressable identities. Explain what each record authoritatively owns (Manager root, Settings index, Tool registry/section, Profile content) and their explicit immutable parent-child links. Do not implement four separate databases or pretend navigation labels alone are records. Explain how `CZM` differs from existing frontend `station-manager/`.
2. Propose **minimal WordPress-backed storage** using existing product conventions, authenticated CompuZign API, and existing Platform Identifier Station for all mint/bind/lookup. Evaluate single aggregate versus multiple records by failure/recovery simplicity, not imagined future requirements. No bespoke CAS engine, added packages, new peer Station, WEX adapter, or generic media manager.
3. Profile begins with Brand: logo, square favicon, name ≤60, code uppercase A–Z ≤6, single Save. Future About/Locations/Contact/Social are *sections*, not automatically new Stations or IDs. Manager Settings presentation is hosted through existing Admin/Station Manager registration without transferring domain authority.
4. Provide minimal proposed files, safe bootstrap and lookup tests, and a no-dead-code implementation/verification plan. **Flag any true unresolved authority conflict** rather than minting placeholder records.

Report this design briefly **in this same work file**, set `AWAITING REVIEWER REVIEW`, push coordination branch and stop. No source edits, production push or deployment until independent design approval. Code ≤600 lines/file, Code Maps ≤600 words, work file ≤600 words.
