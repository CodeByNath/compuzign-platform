// Package Station Tools / Skills catalogue — the presentation contract.
//
// One item per registry tool, projected from the tool registry plus the current
// Package Family list. It is pure presentation data: WHICH tools the Package
// Station offers, whether each is real, its owning authority, and how many
// Families have enabled it. It carries no mutation handle and no drawer id — the
// Station catalogue reads; assignment is edited from a Family's Settings.

import type { PackageToolKey } from '@/modules/packages/packageTools';

export interface PackageToolCatalogueItem {
  key: PackageToolKey;
  label: string;
  description: string;
  // A real runtime authority backs the tool and it may be assigned. Mirrors the
  // registry's `available` (and PackageToolRegistry::isAvailable on the backend).
  available: boolean;
  // The system that owns the tool's data and lifecycle (e.g. "Package Tier
  // system"). Registration and this catalogue are Station-owned; the records are
  // not — this names where they live.
  authority: string;
  // How many Package Families currently have this tool enabled. Always 0 for an
  // unavailable tool, which can never be enabled.
  assignedFamilyCount: number;
  // Present only for an unavailable tool: why it cannot be assigned yet.
  unavailableReason?: string;
}
