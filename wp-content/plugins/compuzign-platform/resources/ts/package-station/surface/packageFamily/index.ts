// Package Family station — public barrel.
//
// The Admin Station's read/edit boundary for the Package-owned commercial bucket
// (cz_package_station, string group_id). Consumers import from here, never the
// files behind it. State and endpoints stay inside; the presentation kit stays
// pure and unaware of the source.

export { usePackageFamilyCards } from './usePackageFamilyCards';
export type { PackageFamilyCardsResult } from './usePackageFamilyCards';
export { usePackageFamilyRecord } from './usePackageFamilyRecord';
export type { PackageFamilyRecordResult } from './usePackageFamilyRecord';
export { usePackageFamilyRelationships } from './usePackageFamilyRelationships';
export type { PackageFamilyRelationshipsResult } from './usePackageFamilyRelationships';
export { packageFamiliesForService } from './relationships';
export type { PackageFamilyRelationship } from './relationships';
export { toPackageFamilyCard, resolvePackageFamilyCardStatus } from './cardAdapter';
export { PackageFamilyDrawerContent } from './PackageFamilyDrawerContent';
export { usePackageFamilyCapabilities, projectPackageFamilyCapabilities } from './usePackageFamilyCapabilities';
