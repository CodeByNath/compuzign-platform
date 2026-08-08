// Tier Edition derived model — pure builder, no state and no rendering.
// Projects one selected TierEdition row into the ShellBinding shapes
// tierEditionOverviewShell/tierEditionInclusionsShell expect. Additive and
// unwired until Phase 5 (drawer refinement blueprint) calls it from
// TierEditionDeclarationSwitcher.
//
// Both bindings share the SAME ModuleState — computed once here — because
// Edition has one consolidated backend module, not a parent-style
// Overview/Features split (see docs/code-map/tier-edition.md and
// tierEditionOverviewModule's own comment).

import type { PackageManagerItem, PackageRateSheet, TierEdition } from '../../types';
import type { ShellBinding } from '@/drawer-kit/schema/types';
import type { TierEditionOverviewShellData, TierEditionInclusionsShellData } from '../schema/bindings/tierEdition';
import { evaluateModule, tierEditionOverviewModule } from '@/drawer-kit/utils/moduleNotifications';
import { buildRateSheetCatalogue } from './tierDetailModel';

export interface TierEditionDetailHandlers {
  onEdit:         (initialTab: 'overview' | 'inclusions') => void;
  onDiscardDraft: () => void;
}

export function buildTierEditionDetail(
  edition: TierEdition,
  svc: { rate_sheets: PackageRateSheet[]; package_relationships: PackageManagerItem[] },
  { onEdit, onDiscardDraft }: TierEditionDetailHandlers,
) {
  const hasDraft = edition.drafts.overview !== null;

  // Explicit-mask-first, same ordering as tierView's own occupantDisabled
  // check — is_explicitly_disabled is Edition's own canonical Disabled fact,
  // never inferred from platform_status alone.
  const moduleState = evaluateModule(tierEditionOverviewModule, {
    title:         edition.title,
    price:         edition.price,
    contact:       edition.contact,
    billing_cycle: edition.billing_cycle,
  }, {
    platformStatus:   edition.platform_status,
    moduleTransition: edition.module_status.overview,
    hasDraft,
    disabled:         edition.is_explicitly_disabled,
    platformLabel:    'Edition',
  });

  const overviewBinding: ShellBinding<TierEditionOverviewShellData> = {
    data: {
      title:             edition.title,
      adminDescription:  edition.admin_description,
      price:             edition.price,
      contact:           edition.contact,
      billingCycle:      edition.billing_cycle,
      minimumTermValue:  edition.minimum_term_value,
      minimumTermUnit:   edition.minimum_term_unit,
      editionPlatformId: edition.edition_platform_id,
    },
    state:    moduleState,
    hasDraft,
    handlers: {
      edit:             () => onEdit('overview'),
      'discard-draft':  () => onDiscardDraft(),
    },
  };

  // Resolved rows for display — the SAME buildRateSheetCatalogue resolver
  // the occupant's own Default Tier Inclusions card and this Edition's own
  // editor both use (tier-edition-admin-contract.ts already audits that
  // reuse), filtered to inclusion-type sources exactly like
  // usePackageStation.tierView derives the occupant's own inclusions_override
  // from its resolvedSelections.
  const catalogue = buildRateSheetCatalogue(svc, edition.rate_sheet_id, []);
  const items = catalogue
    .filter((item) => item.resolved && item.source_type === 'inclusion')
    .map((item) => ({ id: item.item_id, label: item.label }));

  const inclusionsBinding: ShellBinding<TierEditionInclusionsShellData> = {
    data: { items },
    state: moduleState,
    hasDraft,
    handlers: {
      edit: () => onEdit('inclusions'),
    },
  };

  return { overviewBinding, inclusionsBinding };
}
