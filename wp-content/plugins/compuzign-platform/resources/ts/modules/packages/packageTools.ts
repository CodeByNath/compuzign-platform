// Package Family / Group Tool / Skill registry — presentation metadata only.
//
// A "tool" is an optional system a Package Family or Group may activate from
// its drawer Settings → Tools / Skills surface. This registry says WHICH tools
// exist, how to describe them, and whether each is a real available system. It
// holds NO business rules, endpoints, lifecycle, or mutation logic — each tool
// keeps its own authority (Tier authority stays in the Package Station:
// usePackageStation / PackageStationController / PackageSchema).
//
// Ownership: an assignment is owned by the Package Family / Group (stable
// `group_id`) and persisted on its row as `tools[key] = { enabled }`. There is
// no global "enable Tier" — activation is always owner-specific.
//
// Future tools (Promotion, Bundle, Campaign) are registry-compatible but
// declared unavailable: they have no Family-owned activation authority yet, so
// they render as read-only "coming soon" rows and can never be enabled. They
// are documentation of the extension seam, not fake runtime systems.

export type PackageToolKey = 'tier' | 'promotion' | 'bundle' | 'campaign';

// The one owner type this phase supports. Family and Group are the same
// `category_groups` entity, so a single owner type covers both.
export type PackageToolOwnerType = 'package-family';

export interface PackageToolDefinition {
  key: PackageToolKey;
  label: string;
  description: string;
  // True only when a real runtime authority backs the tool. Must mirror
  // PackageToolRegistry::isAvailable on the backend.
  available: boolean;
  supportedOwnerType: PackageToolOwnerType;
  // The system that actually owns the tool's data and lifecycle. Shown on the
  // Station-level catalogue so a reader knows registration and presentation are
  // Station-owned while the tool's records live with their own authority.
  authority: string;
  // Shown on the row when the tool cannot be activated.
  unavailableReason?: string;
}

export const PACKAGE_TOOLS: PackageToolDefinition[] = [
  {
    key: 'tier',
    label: 'Tier',
    description: 'Fixed-slot Package Tiers with pricing, inclusions, FAQs, and lifecycle.',
    available: true,
    supportedOwnerType: 'package-family',
    authority: 'Package Tier system',
  },
  {
    key: 'promotion',
    label: 'Promotion',
    description: 'Time-boxed promotional offers layered over Package pricing.',
    available: false,
    supportedOwnerType: 'package-family',
    authority: 'Promotions',
    unavailableReason: 'Promotion is not yet available as a Family-activated tool.',
  },
  {
    key: 'bundle',
    label: 'Bundle',
    description: 'Curated multi-service bundles sold as one commercial unit.',
    available: false,
    supportedOwnerType: 'package-family',
    authority: 'Bundle system',
    unavailableReason: 'Bundle is not yet available as a Family-activated tool.',
  },
  {
    key: 'campaign',
    label: 'Campaign',
    description: 'Coordinated go-to-market campaigns spanning Packages and Promotions.',
    available: false,
    supportedOwnerType: 'package-family',
    authority: 'Campaign system',
    unavailableReason: 'Campaign is not yet available as a Family-activated tool.',
  },
];

// Count the Families whose assignment map has a given tool enabled. Pure — the
// Station-level catalogue projects this from the same Family list the Home reads.
export function countFamiliesWithTool(
  families: { tools?: Record<string, { enabled: boolean }> }[],
  key: PackageToolKey,
): number {
  return families.reduce((n, family) => (isToolEnabled(family.tools, key) ? n + 1 : n), 0);
}

export function isToolEnabled(
  tools: Record<string, { enabled: boolean }> | undefined,
  key: PackageToolKey,
): boolean {
  return Boolean(tools?.[key]?.enabled);
}
