// Package Manager capability registry — composition metadata only.
//
// A definition joins one real capability's read source, presentation kit,
// drawer, native authority, supported Package owner types, and default order.
// It contains no lifecycle, endpoint, or mutation implementation. Definitions
// generate ordinary rows in the existing Admin Station surface binding table;
// this is not a second surface registry.

import type { PackageCapabilityOwnerType } from '@/api/types/admin';
import type { DataSourceKey, TemplateKitKey } from '../surfaceBindings';
import type { DrawerTemplateKey } from '../drawers/drawerTypes';

export const PACKAGE_CAPABILITY_OWNER = {
  ownerType: 'package-manager' as const,
  ownerId: 'package-station',
  ownerLabel: 'Package Manager',
};

export interface PackageCapabilityDefinition {
  capabilityKey: string;
  label: string;
  dataSourceKey: DataSourceKey;
  templateKitKey: TemplateKitKey;
  drawerTemplateKey: DrawerTemplateKey;
  authorityKey: string;
  supportedOwnerTypes: readonly PackageCapabilityOwnerType[];
  order: number;
  available: boolean;
}

// Only real, end-to-end capability systems belong here. Promotion has domain
// authority but no Admin Station source/template/drawer composition yet;
// Bundle and Campaign do not have complete capability systems. None is faked.
export const PACKAGE_CAPABILITIES = [
  {
    capabilityKey: 'tiers',
    label: 'Tiers',
    dataSourceKey: 'package-tiers',
    templateKitKey: 'tier-list',
    drawerTemplateKey: 'tier',
    authorityKey: 'package-tier',
    supportedOwnerTypes: ['package-manager'],
    order: 10,
    available: true,
  },
] as const satisfies readonly PackageCapabilityDefinition[];

export type PackageCapabilityKey = typeof PACKAGE_CAPABILITIES[number]['capabilityKey'];

export function resolvePackageCapability(capabilityKey: string): PackageCapabilityDefinition | null {
  return PACKAGE_CAPABILITIES.find((definition) => definition.capabilityKey === capabilityKey) ?? null;
}
