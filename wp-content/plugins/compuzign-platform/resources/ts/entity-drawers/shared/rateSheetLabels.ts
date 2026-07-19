// Rate-sheet relationship display label — the single resolution rule for
// showing a package relationship item (inclusion or FAQ source) by name.
// Previously duplicated between usePackageStation.tierView and the tier
// drawer's detail model.

import type { PackageManagerItem } from '@/api/types/admin';

export function relationshipDisplayLabel(item: PackageManagerItem): string {
  return item.decorated_label
    ?? (item.resolved && 'label' in item.resolved ? item.resolved.label
      : item.resolved && 'question' in item.resolved ? item.resolved.question
      : '(missing source)');
}
