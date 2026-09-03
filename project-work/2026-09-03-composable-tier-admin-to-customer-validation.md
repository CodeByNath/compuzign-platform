# Composable Tier — Admin UX restructuring + customer validation

## Status
- **AWAITING LIVE VALIDATION — pushed to `main` and deployed successfully.**
- Auditor verdict: **Proceed with safeguards.**
- Production `main@bb86513c38fb4e0eea39c290ddf07961e6ecfd1a`.
- GitHub Actions **Deploy to Hostinger #936**, run `33735371697`, completed **Success**, exact head SHA `bb86513c38fb4e0eea39c290ddf07961e6ecfd1a`.

## Independent source/deploy audit
Actual reviewed commit is production verbatim, direct child of prior `41884a41...`. Diff remains Admin presentation/contracts/docs + built assets only; no PHP/schema/API/quote/cart changes.

Accepted invariants:
- five backend Tier slots unchanged;
- composable is separate workspace destination only;
- normal focus path unchanged;
- composable focus reuses `TierDetailPanel` + existing `TierLowerDeck`;
- middle shell only on composable focus;
- normal slots have `customerPolicy: null`;
- Customer Options still opens standalone `tier-customer-policy` drawer;
- inclusion/Rate Sheet routing stays closed except explicit composable sentinel.

## Browser Agent — exact live validation
Read-only validation only. Do not change Package/WordPress/runtime data.

1. Open CompuZign Admin Studio and hard-refresh once.
2. Open the KAIROS Package Tier Engine used in the prior live test.
3. In **Focus** view, confirm the left Tier navigation still shows the existing five Tier destinations plus a visually separated **Build Your Own / composable** destination. It may visually be sixth, but normal Tier/Family counts must still read **5**, never 6.
4. Click a normal Tier first. Confirm its focused experience is unchanged and there is **no composable middle shell**.
5. Click **Build Your Own**. Confirm:
   - standard focused Tier summary appears using the same shell as normal occupants;
   - new composable-only middle shell appears **between the focused summary and lower deck**;
   - left side shows policy-backed/featured inclusion highlights only, max 6 (current KAIROS policy may show Block Storage only);
   - right side shows Customer Selection Rules metrics: Always included / Customer Add-Remove / Selected by default / Adjustable quantity / Featured;
   - **View/Edit Customer Options** is visible.
6. Click **View/Edit Customer Options** and confirm it opens the existing standalone **Customer Selection Rules** drawer, not the shared Tier Details/Options/Connections/Support drawer. Close without saving.
7. Back on focused Build Your Own, validate reused lower deck:
   - **Details** shows the composable occupant inclusion list;
   - **Connections** shows the composable occupant's existing Family/Rate Sheet/Tier relationships and opens the correct read-only target drawers;
   - **Settings** is the existing Tier Engine settings/pool experience, not a composable-specific duplicate.
8. Switch back to a normal Tier and confirm the middle shell disappears completely and lower-deck context returns to that normal Tier.
9. Switch to **Grid** view and confirm the existing subordinate composable box still appears as before; it must not be counted/presented as a normal sixth Tier.
10. Stop and capture screenshots if any of these occur: count becomes 6; normal Tier gets composable shell; Build Your Own opens wrong occupant/drawer; Customer Options route changes; Details/Connections actions fail; composable visually reads as a peer normal Tier rather than subordinate.

## Existing live customer state
Previously proven: published Block Storage Customer Add/Remove policy reaches `/pricing/`; Add/Remove + server preview `$10/mo Ongoing` work. Quote/cart persistence remains intentionally absent and is **not part of this validation**.

## Acceptance gate
Browser Agent should report PASS/FAIL for steps 3-9 and provide screenshots for: normal Focus, Build Your Own Focus + middle shell, Customer Options drawer, lower-deck tabs, and Grid view. Do not close this work file until those live checks pass.

Do not start quote/cart work.