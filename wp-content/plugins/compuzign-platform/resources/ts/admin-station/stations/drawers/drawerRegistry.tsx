// Drawer template registry — the declarative drawer resolution layer.
//
// The counterpart to the surface binding table, for the drawer axis. A resolved
// template intent names a drawer template KEY; this registry resolves that key to
// the entity-specific content, the modes it supports, and a neutral title. The
// shared drawer shell and the drawer controller read only this contract — they
// never name an entity, so the shell stays generic and adding a drawer is one
// registration plus its content component.
//
//   intent → drawerTemplateKey → { supportedModes, content } + native recordId
//
// Entity-specific content is allowed to know its own record load and mutation
// provider (that is what "entity-specific" means); only the shell and controller
// stay entity-agnostic. The contracts live in ./drawerTypes so this registry can
// value-import the content without a cycle back through it.

import { PackageFamilyDrawerContent } from '../packageFamily/PackageFamilyDrawerContent';
import { CategoryDrawerHost } from '../serviceCategory/CategoryDrawerHost';
import { ServiceDrawerHost } from '../serviceSurface/ServiceDrawerHost';
import { TierDrawerHost } from '../tierSurface/TierDrawerHost';
import { PackageCapabilityDrawerHost } from '../packageCapabilities/PackageCapabilityDrawerHost';
import type { DrawerTemplateKey, DrawerTemplateRegistration } from './drawerTypes';

export type { DrawerMode, DrawerTemplateKey, DrawerContentProps, DrawerContent, DrawerTemplateRegistration } from './drawerTypes';

// Registering or retiring a template touches nothing outside this map and the
// template's own content file — the shell, controller, tabs, and identity path
// are generic enough to carry a string- or number-keyed entity without an edit.
// All four entity registrations resolve through the same path.
export const DRAWER_TEMPLATES: Record<DrawerTemplateKey, DrawerTemplateRegistration> = {
  'package-family': {
    key:            'package-family',
    title:          'Package Family',
    supportedModes: ['view', 'edit'],
    content:        PackageFamilyDrawerContent,
  },
  'category': {
    key:            'category',
    title:          'Category',
    supportedModes: ['view', 'edit'],
    content:        CategoryDrawerHost,
  },
  // The mature Service drawer, mounted through a thin host adapter. Like the
  // Category and Package Family registrations above, this is the SAME neutral
  // composition the Command Centre mounts.
  'service': {
    key:            'service',
    title:          'Service',
    supportedModes: ['view', 'edit'],
    content:        ServiceDrawerHost,
  },
  // The mature Package Station tier drawer, likewise the same composition the
  // Command Centre mounts — including the occupant bin and its restore conflict
  // resolution. Keyed by the occupant's own stable id.
  'tier': {
    key:            'tier',
    title:          'Package Tier',
    supportedModes: ['view', 'edit'],
    content:        TierDrawerHost,
  },
  'package-capability': {
    key:            'package-capability',
    title:          'Package capabilities',
    supportedModes: ['view', 'edit'],
    content:        PackageCapabilityDrawerHost,
  },
};

// Authoring guard — runs once at load. A registration whose map key and `key`
// disagree, or that supports no mode, could never resolve or open correctly, so
// it fails loudly here rather than surfacing as a blank drawer.
export function assertDrawerTemplatesWellFormed(
  templates: Record<string, DrawerTemplateRegistration>,
): void {
  const problems: string[] = [];
  for (const [mapKey, reg] of Object.entries(templates)) {
    if (reg.key !== mapKey) problems.push(`key mismatch: '${mapKey}' registers '${reg.key}'`);
    if (reg.supportedModes.length === 0) problems.push(`'${mapKey}' supports no modes`);
  }
  if (problems.length) {
    throw new Error(`[AdminStation] drawer template registry is malformed — ${problems.join('; ')}.`);
  }
}

assertDrawerTemplatesWellFormed(DRAWER_TEMPLATES);

// Resolve a drawer template by key. Returns null for an unknown key so the shell
// can render its neutral unresolved state rather than throw at open time.
export function resolveDrawerTemplate(key: string | null | undefined): DrawerTemplateRegistration | null {
  if (!key) return null;
  return (DRAWER_TEMPLATES as Record<string, DrawerTemplateRegistration>)[key] ?? null;
}
