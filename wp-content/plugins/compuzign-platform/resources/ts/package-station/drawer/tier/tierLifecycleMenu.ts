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
//   2. selected Edition's next valid travel action (Move Edition to Bin,
//      only once archived/trashed — never a disabled ghost row)
//   3. Tier's own currently-valid action, even when its verb differs from
//      the split's own top-level label
//   4. Tier's genuine cascade/travel action (Archive Tier — archiving the
//      Tier already cascade-archives every live Edition; see
//      PackageSchema::cascadeArchiveTierEditions — there is no separate
//      "Archive All" because that cascade IS what "Archive Tier" does)
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
// Explicitly NOT reused/duplicated here: an "Archive Edition" row
// independent of "Archive Tier" for an Active/Disabled selected Edition —
// approved example composition (Edition Active + Tier Disabled → Disable ▾
// / Disable Edition / Enable Tier / Archive Tier) has exactly three rows,
// not four; the cascade "Archive Tier" already provides is treated as the
// one legitimate archive path for a live Edition from this menu. An
// Edition's own independent (non-cascading) Archive remains reachable
// through its own record if the drawer is ever extended to expose it
// again — not invented here without approval.

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
  // deriveTierEditionFooterState(...).canPublish — Publish is only ever
  // offered here when it is genuinely actionable, never a disabled ghost row.
  canPublish:     boolean;
  onPublish:      () => void;
  onDisable:      () => void;
  onEnable:       () => void;
  onTrash:        () => void;
  onDelete:       () => void;
  onRestore:      () => void;
  onMoveToBin:    () => void;
}

function tierTopVerb(tier: TierLifecycleInputs): { label: string; tone: TierLifecycleTone } {
  if (!tier.hasBeenPublished) return { label: 'Move to Trash', tone: 'danger' };
  return tier.enabled ? { label: 'Disable', tone: 'danger' } : { label: 'Enable', tone: 'secondary' };
}

function editionTopVerb(edition: SelectedEditionLifecycleInputs): { label: string; tone: TierLifecycleTone } {
  const ps = edition.platformStatus;
  if (ps === 'archived' || ps === 'trashed') return { label: 'Restore', tone: 'secondary' };
  if (ps === 'active') return { label: 'Disable', tone: 'danger' };
  if (ps === 'disabled' && edition.disabledMasked) return { label: 'Enable', tone: 'secondary' };
  return { label: 'Publish', tone: 'secondary' };
}

function tierEntries(tier: TierLifecycleInputs): TierLifecycleMenuEntry[] {
  if (!tier.hasBeenPublished) {
    const entries: TierLifecycleMenuEntry[] = [];
    if (tier.hasContent) entries.push({ id: 'tier-publish', label: 'Publish Tier', onSelect: tier.onPublish });
    entries.push({ id: 'tier-move-to-trash', label: 'Move Tier to Trash', onSelect: tier.onArchive });
    return entries;
  }
  return tier.enabled
    ? [
        { id: 'tier-disable', label: 'Disable Tier', onSelect: tier.onToggleEnabled },
        { id: 'tier-archive', label: 'Archive Tier', onSelect: tier.onArchive },
      ]
    : [
        { id: 'tier-enable', label: 'Enable Tier', onSelect: tier.onToggleEnabled },
        { id: 'tier-archive', label: 'Archive Tier', onSelect: tier.onArchive },
      ];
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
  if (ps === 'active') {
    return { primary: [{ id: 'edition-disable', label: `Disable Edition — ${name}`, onSelect: edition.onDisable }], destructive: [] };
  }
  if (ps === 'disabled' && edition.disabledMasked) {
    return { primary: [{ id: 'edition-enable', label: `Enable Edition — ${name}`, onSelect: edition.onEnable }], destructive: [] };
  }
  // Pending (never published) — only offer Publish when it is genuinely
  // actionable; an incomplete Edition gets no row here at all rather than a
  // disabled ghost entry.
  return {
    primary: edition.canPublish
      ? [{ id: 'edition-publish', label: `Publish Edition — ${name}`, onSelect: edition.onPublish }]
      : [],
    destructive: [],
  };
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
