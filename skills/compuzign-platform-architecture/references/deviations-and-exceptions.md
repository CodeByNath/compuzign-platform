# Deviations and Exceptions

Two categories: places the platform deliberately does not follow the
"give it its own identity" instinct (not violations — documented
boundaries), and the real historical violations this work found and
fixed (genuine deviations, now corrected).

## Deliberate non-identity boundaries

These look like they might deserve rung-3 treatment but are intentionally
capped lower. Do not use them as precedent for minting a new family
without first checking whether the concept genuinely needs independent
addressability (see the rung-2-vs-3 test in
`identity-composition-model.md`).

- **Price Option (`CZPRCIO`) stays rung 2.** It is real, addressable, and
  Platform-identified, but only ever within its own row's scope. It has
  never needed to be referenced independently of its row, so it never
  received a rung-3 family.
- **`default_price_label` stays rung 1.** Pure display naming of an
  existing `unit_price`; explicitly "no `option_id`, no Platform ID, no
  identity work of any kind."
- **Bundle-inclusion (`CZPRCBI`) and its own option (`CZPRCBIO`) stay
  rung 2.** Real identity, but scoped entirely to their owning Bundle's
  `supplied_content[]`; never composed elsewhere.
- **`Promotion` (`CZTP`) is reserved but unwired.** The prefix exists in
  the closed vocabulary with no adapter yet — the discipline of reserving
  a slot in the policy *before* wiring the domain, rather than coining an
  identity ad hoc when the feature ships.
- **A higher layer intentionally stays blind to a lower layer's own
  composition history.** Tier storage/selection is `{item_id, quantity,
  price_option_id}` whether the row is ordinary or Bundle-backed — "NO
  consumer learns Bundles exist." This is not a violation of identity
  preservation; the atom's identity (`CZPRCI`) is exactly what's
  preserved, and the higher layer correctly doesn't need more than that.

## Real historical violations (found and fixed in this body of work)

- **`'default'` exposed as a Leg's commercial identity instead of its
  real `CZTL`/`CZTEL`.** The literal string `'default'` is a legitimate
  *internal* bucketing/matching key (`commercialLegTimelineChildren()`),
  but it was leaking into the resolver's *emitted* output — a genuine
  identity-drift violation, live until `113be1d7`/`f4952a50` fixed it.
  Lesson: an internal role name and an exposed Platform ID must never be
  the same value once a real identity exists; a role name is only a
  legitimate fallback for data that predates identity.
- **Cross-Leg suppression treating shared source id as shared identity**
  (`dc150a4e`) — see `architecture-examples.md` #6. A genuine violation of
  "shared source identity does not make two compositions the same
  object," live until fixed.
- **Commitment cap derived from a child's own field** (`98e89bf7`) — see
  `architecture-examples.md` #7. A genuine ownership-boundary violation,
  live until fixed, and worth remembering as the ownership-drift
  counterpart to the identity-drift violation above: not every bug in
  this space is an identity bug.

Both real violations were caught by a live-behavior discrepancy noticed
downstream (a debug tool showing a wrong value; a commitment cap of 52
instead of 48) — not by a rule check at design time. That is exactly what
this Skill's audit-before-proposing step exists to catch earlier, before
the same class of bug ships again in a new subsystem.
