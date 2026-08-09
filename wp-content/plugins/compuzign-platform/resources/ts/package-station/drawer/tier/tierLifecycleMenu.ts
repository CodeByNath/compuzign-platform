// Single-footer, scope-aware lifecycle command model — pure menu-composition
// functions (correction plan Phase 3; UI refinement Phase 1 split the single
// menu below into two independently-mounted split controls). No rendering,
// no state, no endpoint calls of their own: every entry's onSelect is a
// caller-supplied handler (Tier's own from useTierDrawerController/
// TierDrawerFooter, the selected Edition's own from useTierEditions via
// TierDrawerContent's lifted controller).
//
// Two menus, two footer splits:
//
//   buildTierLifecycleMenu — backward/travel actions only (Disable/Enable/
//     Archive/Restore/Move to Bin). Mounted on the footer's LEFT split.
//   buildTierPublishMenu   — forward/publication actions only (Publish
//     Edition, Publish Tier). Mounted on the footer's RIGHT split
//     (`splitForward`).
//
// This is a presentation grouping only — the same ordering priority (scope
// before entity: selected Edition before Tier) applies within each menu
// independently. buildTierLifecycleMenu's ordering — the exact ordering
// approved for the Tier drawer's pinned footer (§E of the audit, resolved
// per option (b)):
//
//   1. selected Edition's immediate valid transition (Enable/Disable, or
//      Restore once Archived/Trashed)
//   2. selected Edition's next valid travel action — its own independent
//      Archive while Active/Disabled (ctl.archive, NOT the Tier cascade —
//      archiving only this Edition never touches the Tier)
//   3. Tier's own currently-valid action, even when its verb differs from
//      the split's own top-level label
//   4. Tier's genuine cascade/travel action (Archive Tier — archiving the
//      Tier ALSO cascade-archives every live Edition; see
//      PackageSchema::cascadeArchiveTierEditions — there is no separate
//      "Archive All" because that cascade IS what "Archive Tier" does. This
//      is deliberately a DIFFERENT operation from row 2's own Archive
//      Edition: one archives only the Edition, the other archives the
//      Tier — and displaces it into occupant_bin[] — plus every live
//      Edition with it.)
//   5. Move Edition to Bin, always last, always danger-toned — the ONE
//      action that leaves the active workspace, from ANY Edition status
//      (Pending/Active/Disabled/Archived/Trashed alike). Edition lifecycle/
//      Bin UX cleanup: this replaces what were three separate, confusing
//      rows in earlier revisions of this menu ("Move Edition to Trash" for
//      a live/pending Edition, "Move Edition to Bin" for an
//      already-archived/trashed one, and "Permanently Delete Edition" once
//      trashed) with the single visible admin intent the audit approved.
//      The backend (PackageStationController::moveTierEditionToBinCommand)
//      composes the trash-if-needed transition and the bin relocation into
//      one request with one persist, so there is no visible intermediate
//      "Trashed but still in the workspace" state to represent here at
//      all — this menu needed no branching of its own to collapse the
//      three rows into one; the single onMoveToBin handler is simply
//      correct unconditionally. Permanent delete is no longer reachable
//      from this menu at all — it lives exclusively in the Edition Bin
//      (TierEditionBinList.tsx) now, alongside Restore and Move to Trash
//      for an already-binned entry, neither of which this menu represents.
//
// No Publish All / Enable All / Disable All / Restore All / Trash All row
// is ever produced — none of those exist as an established backend
// operation (see the audit's §D), and these modules must not fabricate one.
//
// The Tier occupant's OWN Archived/Trashed states are never represented
// here: archiving the occupant physically removes it from its slot into
// occupant_bin[] (PackageSchema::archiveTierOccupant empties the shell), so
// a Tier being viewed through this footer is by construction never itself
// in an archived/trashed state — that presentation lives exclusively in
// TierBinList.tsx, unchanged and out of scope for these menus.
//
// An earlier draft of this module omitted Edition's own independent
// Archive row entirely, reasoning that "Archive Tier" already covers
// archiving a live Edition — but that cascade ALSO archives and displaces
// the whole parent Tier occupant, which is not an acceptable substitute for
// archiving just the Edition. Removing the independent row would have
// silently deleted real, previously-tested capability, so it is restored
// here — see this module's own contract (tier-lifecycle-menu-contract.ts)
// for worked examples and reasoning.

import type { TierEdition } from '../../types';

export interface TierLifecycleMenuEntry {
  id:       string;
  label:    string;
  onSelect: () => void;
  danger?:  boolean;
}

export type TierLifecycleTone = 'danger' | 'secondary';

export interface TierLifecycleMenuModel {
  splitLabel: string;
  splitTone:  TierLifecycleTone;
  entries:    TierLifecycleMenuEntry[];
}

// Mirrors TierDrawerFooter's existing statusLabel formula exactly (see its
// own comment: the toggle reflects the explicit Disable mask, not the
// published/active flag) — this module changes nothing about how that fact
// is derived, only how it is presented alongside a selected Edition.
export interface TierLifecycleInputs {
  hasBeenPublished: boolean;
  enabled:          boolean;
  hasContent:       boolean;
  onPublish:        () => void;
  onToggleEnabled:  () => void;
  onArchive:        () => void;
}

export interface SelectedEditionLifecycleInputs {
  id:             string;
  title:          string;
  platformStatus: TierEdition['platform_status'];
  // tierEditionDisabledMasked(edition) — the single frontend authority; this
  // module never re-derives it.
  disabledMasked: boolean;
  // deriveTierEditionFooterState(...).hasBeenPublished/canPublish — both
  // sourced from that SAME function, never re-derived here. hasBeenPublished
  // drives the top verb exactly like CanonicalEntityFooter's own
  // isNewNeverPublished branch did; canPublish gates the independent
  // Publish Edition row exactly like its own prior primary Publish button's
  // `disabled: !canPublish` did — unconditional on hasBeenPublished.
  hasBeenPublished: boolean;
  canPublish:     boolean;
  onPublish:      () => void;
  onDisable:      () => void;
  onEnable:       () => void;
  onArchive:      () => void;
  onRestore:      () => void;
  // The one action that leaves the active workspace, from ANY status — see
  // this module's own header comment. onTrash/onDelete no longer exist as
  // separate lifecycle-menu inputs: Trash is folded into this handler
  // (server-composed, see useTierEditions.moveToBin), and Permanent Delete
  // moved exclusively into the Edition Bin (TierEditionBinList.tsx).
  onMoveToBin:    () => void;
}

function tierTopVerb(tier: TierLifecycleInputs): { label: string; tone: TierLifecycleTone } {
  if (!tier.hasBeenPublished) return { label: 'Move to Trash', tone: 'danger' };
  return tier.enabled ? { label: 'Disable', tone: 'danger' } : { label: 'Enable', tone: 'secondary' };
}

// Mirrors CanonicalEntityFooter's own prior non-binned formula, with one
// deliberate change from the pre-cleanup version: the never-published
// fallback now reads "Move to Bin", not "Move to Trash" — a never-published
// Edition's one live transition still goes straight to the bin (via the
// same server-composed onMoveToBin below), but Trash was never the real
// destination; the Bin always was. Otherwise unchanged: never branches on
// platformStatus === 'active' directly (an earlier draft did, and got this
// wrong: after Enable, platform_status stays 'disabled' with
// previous_platform_status cleared to null — genuinely "Pending" per
// tierEditionDisabledMasked, not "Active" — so branching on raw
// platformStatus instead of hasBeenPublished/disabledMasked disagreed with
// the established, previously-verified label).
function editionTopVerb(edition: SelectedEditionLifecycleInputs): { label: string; tone: TierLifecycleTone } {
  const ps = edition.platformStatus;
  if (ps === 'archived' || ps === 'trashed') return { label: 'Restore', tone: 'secondary' };
  if (!edition.hasBeenPublished) return { label: 'Move to Bin', tone: 'danger' };
  return edition.disabledMasked ? { label: 'Enable', tone: 'secondary' } : { label: 'Disable', tone: 'danger' };
}

// Backward/travel entries only — Publish moved to buildTierPublishMenu's own
// tierPublishEntries below (UI refinement, Phase 1: the footer's forward and
// backward actions are two independent split controls).
function tierEntries(tier: TierLifecycleInputs): TierLifecycleMenuEntry[] {
  const entries: TierLifecycleMenuEntry[] = [];
  if (!tier.hasBeenPublished) {
    entries.push({ id: 'tier-move-to-trash', label: 'Move Tier to Trash', onSelect: tier.onArchive });
    return entries;
  }
  entries.push(
    tier.enabled
      ? { id: 'tier-disable', label: 'Disable Tier', onSelect: tier.onToggleEnabled }
      : { id: 'tier-enable', label: 'Enable Tier', onSelect: tier.onToggleEnabled },
    { id: 'tier-archive', label: 'Archive Tier', onSelect: tier.onArchive },
  );
  return entries;
}

// Non-destructive Edition rows only (its own immediate transition and its
// own independent travel action) — Move to Bin is always appended
// separately, last, by buildTierLifecycleMenu below, regardless of status.
function editionEntries(edition: SelectedEditionLifecycleInputs): TierLifecycleMenuEntry[] {
  const name = edition.title.trim() || '(untitled)';
  const ps = edition.platformStatus;

  if (ps === 'archived' || ps === 'trashed') {
    return [{ id: 'edition-restore', label: `Restore Edition — ${name}`, onSelect: edition.onRestore }];
  }

  // Backward/travel entries only — Publish moved to buildTierPublishMenu's
  // own editionPublishEntries below (UI refinement, Phase 1).
  if (!edition.hasBeenPublished) {
    // A never-published Edition has no Enable/Disable/Archive of its own —
    // its only live transition is Move to Bin, appended below.
    return [];
  }

  return [
    edition.disabledMasked
      ? { id: 'edition-enable', label: `Enable Edition — ${name}`, onSelect: edition.onEnable }
      : { id: 'edition-disable', label: `Disable Edition — ${name}`, onSelect: edition.onDisable },
    // Independent of the Tier's own cascading "Archive Tier" — archives
    // only this Edition.
    { id: 'edition-archive', label: `Archive Edition — ${name}`, onSelect: edition.onArchive },
  ];
}

// Always the last entry, always danger-toned, always present — the single
// admin-intent action that leaves the active workspace from ANY status. See
// this module's own header comment for why this replaced three prior rows.
function editionMoveToBinEntry(edition: SelectedEditionLifecycleInputs): TierLifecycleMenuEntry {
  const name = edition.title.trim() || '(untitled)';
  return { id: 'edition-move-to-bin', label: `Move Edition to Bin — ${name}`, onSelect: edition.onMoveToBin, danger: true };
}

export function buildTierLifecycleMenu(
  tier: TierLifecycleInputs,
  selectedEdition: SelectedEditionLifecycleInputs | null,
): TierLifecycleMenuModel {
  const { label: splitLabel, tone: splitTone } = selectedEdition ? editionTopVerb(selectedEdition) : tierTopVerb(tier);

  if (!selectedEdition) {
    return { splitLabel, splitTone, entries: tierEntries(tier) };
  }

  return {
    splitLabel,
    splitTone,
    entries: [...editionEntries(selectedEdition), ...tierEntries(tier), editionMoveToBinEntry(selectedEdition)],
  };
}

// Forward/publication entries only, for the footer's RIGHT split
// (`splitForward`). Scope priority matches the lifecycle menu: the selected
// Edition's own Publish first, the Tier's own Publish second — never merged
// into a single fabricated "Publish All" row (see this module's own header
// comment / the audit's §D).
function editionPublishEntries(edition: SelectedEditionLifecycleInputs): TierLifecycleMenuEntry[] {
  const ps = edition.platformStatus;
  // Archived/Trashed Editions have no Publish transition — Restore is the
  // one live action available to them, already covered by the lifecycle menu.
  if (ps === 'archived' || ps === 'trashed') return [];
  const name = edition.title.trim() || '(untitled)';
  // Mirrors the ORIGINAL primary Publish button's exact semantics
  // (`disabled: !canPublish`) — canPublish alone, independent of
  // hasBeenPublished/disabledMasked, never a ghost row when the Edition
  // genuinely isn't publishable yet.
  return edition.canPublish ? [{ id: 'edition-publish', label: `Publish Edition — ${name}`, onSelect: edition.onPublish }] : [];
}

// Mirrors the ORIGINAL flat Publish button's exact semantics (TierDrawerFooter's
// prior `disabled: !hasContent`) — hasContent alone, independent of
// hasBeenPublished. It is not exclusive to the never-published case: an
// already-Active/Disabled Tier that picks up a new pending module draft
// (Save without Publish) must still be able to re-Publish/settle it — the
// same republish capability tier-occupant-lifecycle-regression.mjs already
// exercises. Scoping this to `!hasBeenPublished` would silently remove real,
// existing capability.
function tierPublishEntries(tier: TierLifecycleInputs): TierLifecycleMenuEntry[] {
  return tier.hasContent ? [{ id: 'tier-publish', label: 'Publish Tier', onSelect: tier.onPublish }] : [];
}

export function buildTierPublishMenu(
  tier: TierLifecycleInputs,
  selectedEdition: SelectedEditionLifecycleInputs | null,
): TierLifecycleMenuModel {
  const entries: TierLifecycleMenuEntry[] = [
    ...(selectedEdition ? editionPublishEntries(selectedEdition) : []),
    ...tierPublishEntries(tier),
  ];
  return { splitLabel: 'Publish', splitTone: 'secondary', entries };
}
