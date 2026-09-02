# Composable Tier — Admin → customer browser handoff

## Status
- **READY FOR CLAUDE — Customer Options violates the locked inclusion boundary.**
- Auditor verdict: **Stop — architectural risk.**
- Production `main@8ff4eff90129f15f8140858d21cb923dd2f5d549`.
- Hostinger deploy #934 / run `33691866996`: success for that exact SHA.
- Continue only in this file.

## Locked architecture
Build Your Own is a subordinate full Tier occupant, not one of the five normal Tier slots. Its separate Customer Selection Rules drawer may control **only inclusion `item_id`s already selected by that occupant**: required/optional/excluded, optional default-selected, fixed/configurable quantity default/min/max/step, and Featured. It must not become a Rate Sheet catalogue selector. Price Option, Commercial Legs, commitment and Editions remain in the normal four-module occupant editor.

## Live setup completed
On 2026-09-03, through the normal KAIROS Build Your Own editor:
- Rate Sheet: existing **KAIROS-IaaS**.
- Default Leg: Recurring, Monthly, month 0–Indefinite, Headline.
- Inclusions: **2 vCPU ×1**, **Block Storage ×100**, **Backup Storage — BaaS ×50**.
- Admin resolved headline: **$48.50 monthly**.
- No new Rate Sheet row, Price Option, Leg, Edition, Family relation, or normal Tier/Add-on change was made.

Nath then published the occupant manually. Live Admin correctly showed:
- subordinate **Package Build Your Own** card as **Active**;
- price **$48.50 monthly**, **3 included features**;
- Family summary still **Tiers 5**;
- normal **View/Edit** action plus **Customer Options** only in the composable card menu.

## Failed live boundary
Opening Customer Options correctly produced a separate **Customer Selection Rules** drawer with initial text **“Not configured — every inclusion stays not offered.”**

However, Edit rendered **45 Customer access rows** from the entire KAIROS Rate Sheet catalogue instead of the occupant’s three selected inclusions. Examples of out-of-scope rows included 4/6/8 vCPU, multiple RAM sizes, Windows/SUSE/RHEL, bare metal, GPU, networking, security, monitoring and automation products.

Expected row set was exactly:
1. 2 vCPU
2. Block Storage
3. Backup Storage — BaaS

The edit session was cancelled without changing or saving policy. No customer-policy draft was created. Per the stop rule, `/pricing/` configurator behavior was not validated.

## Exact Claude instruction
Correct the Customer Selection Rules read/editor projection so its row source is the current Build Your Own occupant’s persisted inclusion identities only, not every row in its bound Rate Sheet.

Required safeguards:
- authorize and persist policy only for inclusion `item_id`s currently owned by this composable occupant;
- reject stale, foreign, unselected or merely Rate-Sheet-available identities server-side;
- removing an inclusion from the occupant must remove/ignore its customer policy safely;
- preserve draft save/reopen fidelity for valid rows;
- keep the separate drawer and existing approved controls;
- do not move catalogue selection, Price Options, Legs, commitment or Editions into Customer Options.

## Non-change boundary
No sixth Tier, parallel product editor, second Tier Instance/Family assignment, fake records, REST/DevTools bypass, Rate Sheet mutation, normal Tier/Add-on changes, customer pricing math changes, or cart/quote/Request/PDF/email/promotions/TCV work.

Report root cause, changed files, tests/contracts, exact commit SHA, push/deploy state and risks here, then set **AWAITING CHATGPT REVIEW**.
