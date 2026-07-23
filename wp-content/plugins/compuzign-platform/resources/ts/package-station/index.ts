/*
 * Package Station — public frontend boundary.
 *
 * External consumers import Package contracts, endpoints, and state through
 * this barrel. Sibling Package Station modules import './types' and './api'
 * directly so the station does not close a dependency cycle through itself.
 */

// ── Contracts ────────────────────────────────────────────────────────────────

export * from './types';

// ── Endpoints ────────────────────────────────────────────────────────────────

export * from './api';

// ── State ────────────────────────────────────────────────────────────────────

export { usePackageStation } from './usePackageStation';
export type {
  PackageStation,
  PackageStationTier,
  PackageStationTierView,
} from './usePackageStation';

export { usePackageFamilyStation } from './usePackageFamilyStation';
export type {
  PackageFamilyOverviewDraft,
  PackageFamilyStation,
} from './usePackageFamilyStation';

export { useSurfacePackages } from './useSurfacePackages';

// Package-owned display label shared with the Tier drawer composition.
export { relationshipDisplayLabel } from './rateSheetLabels';

// ── Vocabulary ───────────────────────────────────────────────────────────────

export { TIER_KEYS, TIER_LABELS } from './vocabulary';

// Package Family relationship projection shared with the Service catalogue.
export {
  packageFamiliesForService,
  usePackageFamilyRelationships,
} from './surface/packageFamily';
export type { PackageFamilyRelationship } from './surface/packageFamily';
