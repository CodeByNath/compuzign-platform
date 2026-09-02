import type { TierId } from '@/api/types/cost-builder';

export const TIER_KEYS: TierId[] = ['basic', 'standard', 'premium', 'enterprise', 'ultimate'];
export const PRIMARY_TIER_INSTANCE_ID = 'ti_primary';

export const TIER_LABELS: Record<string, string> = {
  basic: 'Basic', standard: 'Standard', premium: 'Premium', enterprise: 'Enterprise', ultimate: 'Ultimate',
};

// Phase 1B — the subordinate composable occupant's own address, threaded
// through the SAME tierId-keyed navigation/editing/footer/Edition
// machinery every normal occupant already uses (usePackageStation,
// useTierModuleEditing, useTierBinTravel, useTierEditions all key purely
// on this string). Deliberately NOT a member of TIER_KEYS/ALLOWED_TIERS —
// it can never enter normal Tier navigation/counting/popular/select-one
// semantics, which are all built by iterating TIER_KEYS, never by checking
// "is this id known." See docs/code-map/tier-composable-occupant.md.
export const COMPOSABLE_TIER_ID = 'composable';
TIER_LABELS[COMPOSABLE_TIER_ID] = 'Build Your Own';

// Single source of truth for "is this address the composable occupant" —
// every branch point (usePackageStation's tierId-keyed methods, the
// bindings/tier.tsx Overview editor's hideAddonAndPopular extra) reads this
// rather than repeating the raw string comparison, so there is exactly one
// place a future rename/typo could break instead of several.
export function isComposableOccupant(tierId: string | null | undefined): boolean {
  return tierId === COMPOSABLE_TIER_ID;
}

// The Tier drawer's shell chrome (AdminStationDrawer.tsx) renders a single
// static per-template title ("Package Tier", registered in register.ts) --
// right for a normal Tier/Add-on, wrong for the subordinate composable
// occupant, which is neither. TierDrawerContent.tsx calls this to resolve
// the shell's optional setHeaderTitle override: non-null only while
// editingTierId addresses the composable occupant, null (falling back to
// the shell's own registered title) for package overview and every normal
// Tier/Add-on screen. Extracted as a pure function, rather than inlined in
// the effect, so the composable-occupant-workspace contract can assert it
// directly. Exported for that contract.
export function resolveTierDrawerHeaderTitle(editingTierId: string | null): string | null {
  return isComposableOccupant(editingTierId) ? TIER_LABELS[COMPOSABLE_TIER_ID] : null;
}

// Mirrors PackageSchema::COMPOSABLE_OCCUPANT_ORIGIN — the occupant_bin
// entry's own origin_tier sentinel, used to resolve which occupant a bin_id
// belongs to (never guessed from whichever occupant happens to be open).
// Deliberately a different string from COMPOSABLE_TIER_ID above (one
// addresses the live slot, the other labels a displaced bin entry's
// origin) — both resolve to the same display label below.
export const COMPOSABLE_OCCUPANT_ORIGIN = 'composable_occupant';
TIER_LABELS[COMPOSABLE_OCCUPANT_ORIGIN] = 'Build Your Own';
