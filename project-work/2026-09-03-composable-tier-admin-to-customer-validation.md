# Composable Tier — Admin → customer browser handoff

## Status
- **AWAITING LIVE VALIDATION — NATH PUBLISH APPROVAL REQUIRED.**
- Auditor verdict: **Proceed with safeguards.**
- Production `main@8ff4eff90129f15f8140858d21cb923dd2f5d549`; review branch byte-identical.
- Hostinger deploy #934 / run `33691866996`: success for the exact production SHA.
- Continue in this file; no new work file.

## Locked architecture
Build Your Own is a subordinate full Tier occupant for product definition/lifecycle and is not one of the five normal Tier slots. Customer Selection Rules are a separate external drawer exposed from the composable shell only after the occupant is active/published. The shared four-module Tier drawer remains the product editor.

Customer Options may control only existing occupant inclusion `item_id`s: required/optional/excluded, optional default-selected, fixed/configurable quantity default/min/max/step, and Featured. Price Option, Commercial Legs, commitment and Editions remain occupant-authored and outside that drawer.

## Live Admin round — 2026-09-03
Route: `/studio/` → Packages → KAIROS — IaaS.

Pre-configuration checks passed:
- Family summary remained **Tiers 5** and the five normal cards were unchanged.
- Separate subordinate **Build Your Own** card rendered below them.
- Card was **Empty** and exposed **Configure Build Your Own**; **Customer Options was absent**, as required before publication.
- Configure opened the normal Tier editor with Details, Options, Connections and Support.

Authorized real changes saved through the normal editor:
- Rate Sheet: existing **KAIROS-IaaS**.
- Commercial Leg: existing Default leg; Recurring, Monthly, month 0–Indefinite, Headline.
- Inclusions:
  - **2 vCPU** — quantity 1;
  - **Block Storage** — quantity 100;
  - **Backup Storage — BaaS** — quantity 50.
- Resolved headline shown by Admin: **$48.50 monthly**.
- No new Rate Sheet row, Price Option, Leg, Edition, catalogue record, Family relation, or normal Tier/Add-on change was made.

Saved state is Pending and the drawer’s **Publish** action is enabled. After closing, the shell remains gated as Empty/Configure and still has no Customer Options. No Publish/Activate action was taken.

## Customer boundary
The open `/pricing/` page continues to show the existing normal KAIROS offers. No Build Your Own customer offer is expected before publication; no customer configurator claim is made yet.

## Exact next step
Nath must explicitly authorize publishing/activating this real KAIROS Build Your Own occupant. After approval, browser validation will:
1. Publish through the normal occupant lifecycle.
2. Verify the shell becomes active and Customer Options appears only there.
3. Confirm View/Edit still opens the normal four-module editor.
4. Open the separate Customer Selection Rules drawer; verify only the three existing inclusions and approved policy controls.
5. Save/reopen a minimal policy and request any separately required settle/publish approval.
6. Only after active policy, validate Build Your Own / Upgrade your build on Pricing.

## Hard boundaries
No fake records, REST/DevTools bypass, sixth Tier, second Tier Instance/Family assignment, new pricing structures, changes to normal occupants, or cart/quote/Request/PDF/email/promotions/TCV expansion. Stop on any unexpected mutation.
