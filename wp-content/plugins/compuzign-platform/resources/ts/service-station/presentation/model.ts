import type { ServiceCatalogueItem } from './types';

export interface ServiceCatalogueFilterOption {
  value: string;
  label: string;
}

export function packageFamilyOptions(items: ServiceCatalogueItem[]): ServiceCatalogueFilterOption[] {
  const families = new Map<string, string>();
  items.forEach((item) => item.packageFamilies.forEach((family) => families.set(family.id, family.name)));

  return [...families]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function serviceMatchesPackageFamily(
  item: ServiceCatalogueItem,
  selectedFamilyId: string,
): boolean {
  return selectedFamilyId === 'all'
    || item.packageFamilies.some((family) => family.id === selectedFamilyId);
}

export function serviceMatchesCategory(
  item: ServiceCatalogueItem,
  selectedCategorySlug: string,
): boolean {
  return selectedCategorySlug === 'all'
    || item.categories.some((category) => category.slug === selectedCategorySlug);
}
