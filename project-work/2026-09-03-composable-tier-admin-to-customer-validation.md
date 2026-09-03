# Composable Tier — continuous work track

## Status
- **AWAITING LIVE VALIDATION — Request/PDF/email deployed.**
- Auditor verdict: **Proceed with safeguards.**
- Production `main@f9035e82cda9ce7a0f1a65e36d761f8524aa058c`.
- GitHub Actions **Deploy to Hostinger #938**, run `33762478987`, exact `head_sha=f9035e82cda9ce7a0f1a65e36d761f8524aa058c`, completed **success**.

## Accepted chain before this phase
Admin/customer composable workflow and aggregate quote/cart line are already accepted live. Architecture remains locked: one subordinate composable occupant, one aggregate composable quote line, explicit `primary | addon | composable`, no `is_addon` reuse, no second CZTG/entity.

## Deployed Request/PDF/email implementation
The approved source is now exact production main. It:
- persists optional `isComposable` through Request storage/readback;
- does **not** persist `composableSelection`;
- normalizes impossible composable+Add-on input to composable / `isAddon=false`;
- reconstructs the stored line as composable, preserving unique quote key/role;
- renders **Build Your Own** distinctly in proposal/print/PDF/customer email;
- reuses stored `inclusionItems` + `legPaymentSummaries`, never live re-resolution;
- includes composable once in combined Family commercial totals;
- preserves legacy Requests when `isComposable` is absent.

No pricing/resolver/Rate Sheet/entity/identity/occurrence-month math changes were included.

## Live browser validation — read-only first
Use deployed Hostinger/customer/Admin surfaces only. Do **not** alter WordPress/platform configuration or source.

Prefer an **existing submitted Request containing a composable Build Your Own line** if one already exists. Validate the complete durable chain:
1. Admin Request displays Build Your Own as a distinct aggregate Family line, not primary/Add-on.
2. Stored selected inclusion names and quantities are present and match the submitted snapshot.
3. Stored per-Leg payment streams display correctly.
4. Proposal/Print/PDF shows exactly one Build Your Own line and no raw Platform IDs customer-facing.
5. If the same Request contains a normal primary, primary + composable both appear separately with no duplicate/collapsed identity.
6. Combined totals/TCV include composable exactly once.
7. Customer email for that Request shows Build Your Own distinctly with the same stored inclusion quantities/payment streams and customer-safe labels.
8. Re-open/reload the Request and confirm values remain snapshot-stable; do not compare/re-resolve against current Rate Sheet state.

Capture screenshots/evidence for Admin Request, proposal/PDF, and customer email.

### Mutation boundary
If no existing composable Request/email exists and validation requires **submitting a new production Request or sending a new customer email**, stop before that action and ask Nath for explicit authorization for that exact runtime mutation. Do not create test Requests/emails without it.

After validation, record PASS/FAIL evidence here. If all pass, mark this representation chain accepted but **keep the overall composable work open** for the final Admin/customer UI/UX refinement pass.