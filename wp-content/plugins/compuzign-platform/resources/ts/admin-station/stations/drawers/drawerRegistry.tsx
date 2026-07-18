// Drawer template registry — the declarative drawer resolution layer.
//
// The counterpart to the surface binding table, for the drawer axis. A resolved
// template intent names a drawer template KEY; this registry resolves that key to
// the entity-specific content, the modes it supports, and a neutral title. The
// shared drawer shell and the drawer controller read only this contract — they
// never name an entity, so the shell stays generic and adding a drawer is one
// registration plus its content component.
//
//   intent → drawerTemplateKey → { supportedModes, content } + numeric recordId
//
// Entity-specific content is allowed to know its own record load and mutation
// provider (that is what "entity-specific" means); only the shell and controller
// stay entity-agnostic. The contracts live in ./drawerTypes so this registry can
// value-import the content without a cycle back through it.

import { ServiceCategoryGroupDrawerContent } from '../serviceCategoryGroup/ServiceCategoryGroupDrawerContent';
import { PackageFamilyDrawerContent } from '../packageFamily/PackageFamilyDrawerContent';
import type { DrawerTemplateKey, DrawerTemplateRegistration } from './drawerTypes';

export type { DrawerMode, DrawerTemplateKey, DrawerContentProps, DrawerContent, DrawerTemplateRegistration } from './drawerTypes';

export const DRAWER_TEMPLATES: Record<DrawerTemplateKey, DrawerTemplateRegistration> = {
  'service-category-group': {
    key:            'service-category-group',
    title:          'Service Category Group',
    supportedModes: ['view', 'edit'],
    content:        ServiceCategoryGroupDrawerContent,
  },
  // The second template. Adding it changed nothing outside this map and its own
  // content file — the shell, controller, tabs, and identity path were already
  // generic enough to carry a string-keyed entity without an edit.
  'package-family': {
    key:            'package-family',
    title:          'Package Family',
    supportedModes: ['view', 'edit'],
    content:        PackageFamilyDrawerContent,
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
