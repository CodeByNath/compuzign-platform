# Composable Tier — Admin UX restructuring + customer validation

## Status
- **CLOSED — live Admin validation accepted on 2026-09-03.**
- Auditor verdict: **Proceed.**
- Production `main@bb86513c38fb4e0eea39c290ddf07961e6ecfd1a`.
- GitHub Actions **Deploy to Hostinger #936**, run `33735371697`, completed **Success** for the exact production SHA.
- Validation coordination commit: `9f91df33250bf1525b8ed029790d2af47926bc2e`.

## Independent source/deploy audit
The reviewed production commit is a direct child of prior `41884a41...`. Scope remains Admin presentation/contracts/docs plus built assets only; no PHP, schema, API, quote, or cart changes.

Accepted invariants remain intact:
- five backend Tier slots;
- composable is a separate subordinate workspace destination;
- normal focus path unchanged;
- composable focus reuses the standard focused summary and existing lower deck;
- composable middle shell appears only for composable focus;
- Customer Options opens the standalone Customer Selection Rules drawer;
- inclusion and Rate Sheet routing remain unchanged except for the explicit composable sentinel.

## Live browser validation results
Read-only checks completed against the deployed CompuZign Admin Studio after a hard refresh. No Package, WordPress, or runtime data was changed.

- **Step 3 — PASS:** Focus navigation shows five normal Tier destinations, then a visual separator and **Package Build Your Own**. Family summary remains **Tiers 5**.
- **Step 4 — PASS:** Selecting normal **Starter Cloud** restores the normal focused experience; no composable middle shell is present.
- **Step 5 — PASS:** Selecting **Build Your Own** shows the standard summary, then the composable-only middle shell before the lower deck. Featured inclusions shows **Block Storage** only. Metrics render: Always included 0; Customer Add/Remove 1; Selected by default 0 of 1; Adjustable quantity 0; Featured 0. **View/Edit Customer Options** is visible.
- **Step 6 — PASS:** Customer Options opens the standalone **Customer Selection Rules** drawer (Overview/Connections, Active, “0 always included · 1 customer Add/Remove”), not the shared Tier drawer. Closed without saving.
- **Step 7 — PASS:** Details shows the three composable inclusions (2 vCPU, Block Storage, Backup Storage — BaaS). Connections shows Family Group KAIROS, Groups 3, Rate Sheet 1; KAIROS opens the correct read-only Package Family drawer. Settings remains the shared Tier Engine settings/pool experience.
- **Step 8 — PASS:** Switching back to Starter Cloud removes the middle shell completely and restores normal context.
- **Step 9 — PASS:** Grid contains five normal Tier cards. A separately labelled subordinate section states **“Composable occupant — subordinate to this Tier system, not one of the 5 Tiers”** and contains Package Build Your Own. Family summary remains **Tiers 5**.

Required browser screenshots were captured for normal Focus, Build Your Own Focus and middle shell, Customer Selection Rules drawer, lower-deck Connections, and Grid subordinate presentation.

## Customer boundary
Previously proven customer state remains accepted: published Block Storage Customer Add/Remove policy reaches `/pricing/`, and Add/Remove plus server preview `$10/mo Ongoing` work. Quote/cart persistence remains intentionally absent and was not retested or changed.

## Closure
No further Claude source action is requested for this work item. Do not start quote/cart work.
