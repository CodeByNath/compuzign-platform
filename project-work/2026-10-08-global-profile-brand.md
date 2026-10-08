# Global Settings → Profile / Brand

## Status
**READY FOR BUILDER — Phase 1A identity/storage/API design gate only (Owner prefixes supplied).**
Builder: Claude; Reviewer: ChatGPT; Owner/live validator: Nath.
**Verdict: Proceed with safeguards** for Phase 0 architecture. No Phase 1 source implementation until Phase 1A review.
Base `main`: `8d1f0185811e69214c0fd85c29819eef0c5d9226`; previous topic branch cleaned. Current coordination only.

## Binding authority
Read `project-work/AGENTS.md`, [locked full handover](2026-10-08-global-profile-brand-handover.md), root `AGENTS.md`, `docs/ai-index.md`, source and focused Code Maps, **especially `docs/code-map/platform-identifier-station.md` and `src/PlatformIdentifier/PlatformIdentifierPolicy.php`**. CompuZign owns platform Profile, storage, media, permissions, validation, identity and API. Service Settings is only its temporary presentation entry. Never infer data ownership from runtime or host APIs.

## Owner decisions
- **Image Option A approved (2026-10-08):** accept image selection regardless of extension, securely decode/inspect; convert to browser-safe image when possible; otherwise clear error and no partial save. Square favicon verified on Pick and Save.
- **New explicit requirement:** Profile MUST have durable platform-owned storage, **Platform ID integrated with the existing Platform Identifier Station**, and documented working API routes. This supersedes Phase 0's suggestion that a singleton should have no Platform ID. Do NOT invent a prefix in consumer code. The Identifier Policy is a closed vocabulary and neither Settings nor Profile type is registered today. **Owner selected `CZPSXXXXX` for Platform Settings and `CZPSPXXXXX` for child Profile**. Both pass existing five-suffix anchored-format compatibility in source. Prefixes require central Policy registration by Builder after design approval; never coin IDs elsewhere.

## Phase 1A — authorised design task (NO source changes)
Provide a concise contract proposal, with actual source evidence:
1. **Identity:** Review Owner's `CZPS` parent Settings and `CZPSP` child Profile prefixes against the Policy and global uniqueness. Design genuine durable singleton **Platform Settings** parent + **Profile** child records, separate immutable IDs, stable native references, parent relationship, bootstrap/reservation/binding/lookup/rollback and recovery; both IDs must be minted by the existing Platform Identifier Station, never reminted on Save. Ensure the parent is a real authoritative Settings root, not a placeholder or a new frontend Station. Flag any mismatch with current source before coding.
2. **Storage:** stable global Profile record/schema/version/revision plus linked platform asset keys, durable adapter and atomic/consistent file + metadata lifecycle across upgrades/redeploy; conflict/crash recovery, permission and concurrency proof. Profile never uses Service or user records.
3. **APIs:** propose exact authenticated **GET + Save** Profile endpoints and read-by-Platform-ID route for `CZPSP`, plus minimal parent Settings read/lookup contract for `CZPS`; define payloads exposing correct parent/child IDs and relation, ETag/revision or equivalent, MIME/upload validation, permissions, nonce, errors/409, and asset URL policy. Do not expose editable settings anonymously. No routes that expose editable profile data to anonymous users.
4. Test matrix for creation/reload, parent+child singleton identity stability, parent-to-profile linkage, both ID lookups, immutability, permission denial, missing image, clear, conversion error, conflicting Save, storage/registry mismatch, partial bootstrap and recovery.
5. Mark minimal exact changed files/code maps, proposed identity prefix and any owner decision needed. Report **in this same work file** with `AWAITING REVIEWER REVIEW`; stop.

## Next gated phases
**1B:** only after Phase 1A approval, implement platform Profile identity, persistence, safe asset storage/conversion and APIs + backend tests on one topic branch; independent source review required.
**2:** Settings UI (four fields, one Save).
**3:** favicon 64×64 on main colour, code/name defaults, safe public read seam.
**4:** full tests, source/release verification and Nath live validation.

## Exclusions
No WEX implementation, new Station, general media framework, host profile/media ownership, Service-owned profile, pricing/Tier/Package/quote changes, autosave or unrelated redesign. Keep one work file; no phase advance without reviewer acceptance.
