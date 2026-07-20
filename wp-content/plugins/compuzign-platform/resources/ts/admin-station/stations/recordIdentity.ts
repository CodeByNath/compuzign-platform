// Station record identity — the one shared identity type for the whole shell.
//
// The rule, stated once and imported everywhere: EVERY ENTITY KEEPS ITS OWN REAL
// ID. Nothing is converted, coerced, or re-keyed at any boundary, and the shell
// never mints a surrogate id of its own.
//
//   Service                → numeric ID
//   Category               → numeric ID
//   Service Category Group → numeric term_id
//   Package Family         → string group_id
//
// So the shell's transport type is the union of both native forms. This is not a
// loosening of the numeric contract — it is that contract generalised: a record's
// id travels EXACTLY as its own data source and its own backend routes express
// it. A term_id stays a number the whole way (its routes are numeric); a
// group_id stays a string the whole way (its routes are string-keyed). The
// forbidden thing is a round-trip — stringifying a term_id, or Number()-ing a
// group_id — because that is where identity silently breaks.
//
// One id flows the whole path unchanged:
//
//   API record → card.id → action event cardId → resolved intent recordId
//     → open drawer state → drawer content recordId → that entity's own read
//
// Consumers resolve their record by matching their OWN native id field
// (`item.id === recordId`, `item.group_id === recordId`). A foreign id shape
// simply fails to match and the content renders its neutral "not available"
// state — no conversion is ever attempted to force a match.
//
// Zero-dependency by design: this module imports nothing, so every layer of the
// chain (presentation, stations, drawer) can type-import it without forming a
// cycle, and it is fully erased at build.

export type StationRecordId = string | number;

// Opaque, serialisable parent/mutation context carried beside an identity.
// Context never replaces recordId: an occupied Tier still dispatches its
// occupant_id, while slotId and parent Service/Family context travel here.
// A create intent has no Tier record yet, so it carries the native owner id as
// recordId and the requested authoring slot in this separate context.
export type StationIntentContext = Readonly<Record<string, string | number | boolean | null>>;
