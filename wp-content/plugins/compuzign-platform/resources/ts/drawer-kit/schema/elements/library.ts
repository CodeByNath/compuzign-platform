// Platform Element library (Schema architecture S2).
//
// The content vocabulary of a shell's Content Group: each Platform Element id
// has one bound-value contract here — the shape a ContentElement's `bind`
// closure must project station data into. Mode renderers
// (elements/modeRenderers.tsx) consume these shapes; a bind closure is a
// synchronous projection of station data (Boundary Test) and may weave in
// declarative copy (fallbacks, placeholders, empty-state text), exactly as
// ModuleDefinition problem generators carry note copy. What a bind closure
// never does: decide how or whether the element appears — that is the mode
// renderer's job (Separation Rule).
//
// Launch library (v1.0, locked): text, rich-text, term, item-collection,
// qa-collection, custom. New elements join by the Governance Rule — short
// Amendment Log entry + mode renderers + one non-hypothetical consumer.

// `text` — a single-line textual value (e.g. a name/title instance).
export interface TextValue {
  value: string;
  fallback?: string;    // shown when value is empty (e.g. 'New Service')
}

// `rich-text` — a multi-line prose value (e.g. a description instance).
export interface RichTextValue {
  value: string;
  placeholder: string;  // muted action prompt shown when value is empty
}

// `term` — a resolved taxonomy term display value (e.g. Category).
export interface TermValue {
  value: string;        // resolved display name, incl. 'Not selected' fallback
}

// `item-collection` — a labelled item pool (e.g. Included Features chips).
export interface ItemCollectionValue {
  items: Array<{ id: string; label: string }>;
  empty: { title: string; copy: string };
}

// `qa-collection` — a question/answer list (e.g. Common Questions).
// `answer` is a data-contract distinction, not a render flag: an owned Q&A
// item carries a string answer (possibly empty — surfaced as a gap); a
// reference item without an answer relation carries `undefined` and the
// answer line is absent entirely (Tier/Promotion FAQ Refs).
export interface QaCollectionValue {
  items: Array<{ id: string; question: string; answer?: string }>;
  empty: { title: string; copy: string };
}

// `relation-summary` — compact counts of a station's child relations
// (S3a amendment; e.g. "3 features | 2 common questions"). Labels arrive
// bound so pluralisation stays a data projection.
export interface RelationSummaryValue {
  relations: Array<{ count: number; label: string }>;
}

// `metrics` — an at-a-glance headline + supporting copy (S3a amendment;
// e.g. the Commercial group's "2 tiers configured" summary block).
export interface MetricsValue {
  headline: string;
  copy: string;
}

// `custom` — first-class permanent escape hatch. No bound-value contract and
// no registered renderer yet: the first real consumer registers its renderers
// and is logged as a candidate element (promotion needs 2+ consumers).
//
// Amendment Log: 2026-08 presentation pass — Tier Overview (the Label row's
// inline Popular badge, which the plain `text` element cannot compose),
// Tier Pricing Rules (Rate Sheet/Commitment/per-leg read composition,
// replacing two floating `text` rows), and Default Tier Inclusions (the
// richer per-item qty/leg-assignment/price read composition) are its first
// real consumers — Tier occupant and Tier Edition alike. Payload shapes and
// the shared renderer switch live in elements/modeRenderers.tsx (`CustomValue`).
