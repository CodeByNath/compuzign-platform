// Single-footer, scope-aware lifecycle command model — pure menu-composition
// function (correction plan Phase 3). No rendering, no state, no endpoint
// calls of its own: every entry's onSelect is a caller-supplied handler
// (Tier's own from useTierDrawerController/TierDrawerFooter, the selected
// Edition's own from useTierEditions via TierDrawerContent's lifted
// controller). This module only decides WHICH scoped rows exist and in
// WHAT ORDER — the exact ordering approved for the Tier drawer's pinned
// footer (§E of the audit, resolved per option (b)):
//
//   1. selected Edition's immediate valid transition
//   2. selected Edition's next valid travel action — its own independent
//      Archive while Active/Disabled (ctl.archive, NOT the Tier cascade —
//      archiving only this Edition never touches the Tier), or Move
//      Edition to Bin once already Archived/Trashed (never a disabled
//      ghost row either way)
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
//   5. destructive actions, separated last (Edition's own Trash/Permanently
//      delete once archived/trashed)
//
// No Publish All / Enable All / Disable All / Restore All / Trash All row
// is ever produced — none of those exist as an established backend
// operation (see the audit's §D), and this module must not fabricate one.
//
// The Tier occupant's OWN Archived/Trashed states are never represented
// here: archiving the occupant physically removes it from its slot into
// occupant_bin[] (PackageSchema::archiveTierOccupant empties the shell), so
// a Tier being viewed through this footer is by construction never itself
// in an archived/trashed state — that presentation lives exclusively in
// TierBinList.tsx, unchanged and out of scope for this menu.
//
// An earlier draft of this module omitted Edition's own independent
// Archive row entirely, reasoning that "Archive Tier" already covers
// archiving a live Edition — but that cascade ALSO archives and displaces
// the whole parent Tier occupant, which is not an acceptable substitute for
// archiving just the Edition. Removing the independent row would have
// silently deleted real, previously-tested capability (reaching Trashed →
// guarded permanent delete for one Edition without touching its Tier), so
// it is restored here even though it makes the two originally-approved
// worked examples five rows rather than three — see this module's own
// contract (tier-lifecycle-menu-contract.ts) for the corrected examples and
// the reasoning recorded there.

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
  onTrash:        () => void;
  onDelete:       () => void;
  onRestore:      () => void;
  onMoveToBin:    () => void;
}

function tierTopVerb(tier: TierLifecycleInputs): { label: string; tone: TierLifecycleTone } {
  if (!tier.hasBeenPublished) return { label: 'Move to Trash', tone: 'danger' };
  return tier.enabled ? { label: 'Disable', tone: 'danger' } : { label: 'Enable', tone: 'secondary' };
}

// Mirrors CanonicalEntityFooter's own prior non-binned formula EXACTLY:
// `isNewNeverPublished ? 'Move to Trash' : disabledMasked ? 'Enable' :
// 'Disable'` — deliberately never branches on platformStatus === 'active'
// directly (an earlier draft did, and got this wrong: after Enable,
// platform_status stays 'disabled' with previous_platform_status cleared to
// null — genuinely "Pending" per tierEditionDisabledMasked, not "Active" —
// so branching on raw platformStatus instead of hasBeenPublished/
// disabledMasked disagreed with the established, previously-verified label).
function editionTopVerb(edition: SelectedEditionLifecycleInputs): { label: string; tone: TierLifecycleTone } {
  const ps = edition.platformStatus;
  if (ps === 'archived' || ps === 'trashed') return { label: 'Restore', tone: 'secondary' };
  if (!edition.hasBeenPublished) return { label: 'Move to Trash', tone: 'danger' };
  return edition.disabledMasked ? { label: 'Enable', tone: 'secondary' } : { label: 'Disable', tone: 'danger' };
}

// Publish Tier's own availability mirrors the ORIGINAL flat Publish
// button's exact semantics (TierDrawerFooter's prior `disabled: !hasContent`)
// — hasContent alone, independent of hasBeenPublished. It is not exclusive
// to the never-published case: an already-Active/Disabled Tier that picks
// up a new pending module draft (Save without Publish) must still be able
// to re-Publish/settle it — the same republish capability
// tier-occupant-lifecycle-regression.mjs already exercises. Scoping this to
// `!hasBeenPublished` would silently remove real, existing capability.
function tierEntries(tier: TierLifecycleInputs): TierLifecycleMenuEntry[] {
  const entries: TierLifecycleMenuEntry[] = [];
  if (tier.hasContent) entries.push({ id: 'tier-publish', label: 'Publish Tier', onSelect: tier.onPublish });
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

function editionEntries(edition: SelectedEditionLifecycleInputs): {
  primary: TierLifecycleMenuEntry[];
  destructive: TierLifecycleMenuEntry[];
} {
  const name = edition.title.trim() || '(untitled)';
  const ps = edition.platformStatus;

  if (ps === 'archived' || ps === 'trashed') {
    return {
      primary: [
        { id: 'edition-restore', label: `Restore Edition — ${name}`, onSelect: edition.onRestore },
        // Rises near the top of the Edition entries whenever it becomes
        // valid (§F) — distinct from Archive, never conflated with it.
        { id: 'edition-move-to-bin', label: 'Move Edition to Bin', onSelect: edition.onMoveToBin },
      ],
      destructive: ps === 'archived'
        ? [{ id: 'edition-trash', label: `Move Edition to Trash — ${name}`, onSelect: edition.onTrash, danger: true }]
        : [{ id: 'edition-delete', label: `Permanently Delete Edition — ${name}`, onSelect: edition.onDelete, danger: true }],
    };
  }

  const primary: TierLifecycleMenuEntry[] = [];
  // Publish Edition's own availability mirrors the ORIGINAL primary Publish
  // button's exact semantics (`disabled: !canPublish`) — canPublish alone,
  // independent of hasBeenPublished/disabledMasked, never a ghost row when
  // the Edition genuinely isn't publishable yet.
  if (edition.canPublish) primary.push({ id: 'edition-publish', label: `Publish Edition — ${name}`, onSelect: edition.onPublish });

  if (!edition.hasBeenPublished) {
    // Mirrors CanonicalEntityFooter's own isNewNeverPublished branch: the
    // one live transition a never-published Edition offers goes straight to
    // Trashed (ctl.trash targets 'trashed' directly) — there is no Archived
    // stop for a record that was never live.
    primary.push({ id: 'edition-trash-never-published', label: `Move Edition to Trash — ${name}`, onSelect: edition.onTrash, danger: true });
    return { primary, destructive: [] };
  }

  primary.push(
    edition.disabledMasked
      ? { id: 'edition-enable', label: `Enable Edition — ${name}`, onSelect: edition.onEnable }
      : { id: 'edition-disable', label: `Disable Edition — ${name}`, onSelect: edition.onDisable },
    // Independent of the Tier's own cascading "Archive Tier" — archives
    // only this Edition.
    { id: 'edition-archive', label: `Archive Edition — ${name}`, onSelect: edition.onArchive },
  );
  return { primary, destructive: [] };
}

export function buildTierLifecycleMenu(
  tier: TierLifecycleInputs,
  selectedEdition: SelectedEditionLifecycleInputs | null,
): TierLifecycleMenuModel {
  const { label: splitLabel, tone: splitTone } = selectedEdition ? editionTopVerb(selectedEdition) : tierTopVerb(tier);

  if (!selectedEdition) {
    return { splitLabel, splitTone, entries: tierEntries(tier) };
  }

  const { primary, destructive } = editionEntries(selectedEdition);
  return {
    splitLabel,
    splitTone,
    entries: [...primary, ...tierEntries(tier), ...destructive],
  };
}
