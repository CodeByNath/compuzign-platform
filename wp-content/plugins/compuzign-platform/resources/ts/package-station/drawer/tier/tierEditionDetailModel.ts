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
import type { TierEditionOverviewShellData, TierEditionPricingRulesShellData, TierEditionInclusionsShellData } from '../schema/bindings/tierEdition';
import { evaluateModule, tierEditionOverviewModule } from '@/drawer-kit/utils/moduleNotifications';
import type { ModuleState } from '@/drawer-kit/utils/moduleNotifications';
import { buildRateSheetCatalogue } from './tierDetailModel';
import { tierEditionDisabledMasked } from './tierEditionModel';

export interface TierEditionDetailHandlers {
  onEdit:         (initialTab: 'overview' | 'pricing-rules' | 'inclusions') => void;
  onDiscardDraft: () => void;
}

// Extracted so a caller that only needs the 5-state status (e.g. the pinned
// Tier footer's lifecycle menu, deciding whether Publish is actionable via
// deriveTierEditionFooterState) doesn't have to pull in a full
// buildTierEditionDetail() call — and its own rate-sheet-catalogue
// resolution — just to read one field. buildTierEditionDetail below is the
// only caller building the read-mode cards; both share this SAME
// computation rather than two copies that could drift.
//
// Explicit-mask-first, same compound Package Family/Category derive it
// with — see tierEditionDisabledMasked's own comment for why Edition cannot
// use a raw is_explicitly_disabled field the way the Tier occupant does.
export function tierEditionModuleState(edition: TierEdition): ModuleState {
  return evaluateModule(tierEditionOverviewModule, {
    title:         edition.title,
    price:         edition.price,
    contact:       edition.contact,
    billing_cycle: edition.billing_cycle,
  }, {
    platformStatus:   edition.platform_status,
    moduleTransition: edition.module_status.overview,
    hasDraft:         edition.drafts.overview !== null,
    disabled:         tierEditionDisabledMasked(edition),
    platformLabel:    'Edition',
  });
}

export function buildTierEditionDetail(
  edition: TierEdition,
  svc: { rate_sheets: PackageRateSheet[]; package_relationships: PackageManagerItem[] },
  { onEdit, onDiscardDraft }: TierEditionDetailHandlers,
) {
  const hasDraft = edition.drafts.overview !== null;
  const moduleState = tierEditionModuleState(edition);

  const overviewBinding: ShellBinding<TierEditionOverviewShellData> = {
    data: {
      title:             edition.title,
      adminDescription:  edition.admin_description,
      price:             edition.price,
      contact:           edition.contact,
      editionPlatformId: edition.edition_platform_id,
    },
    state:    moduleState,
    hasDraft,
    handlers: {
      edit:             () => onEdit('overview'),
      'discard-draft':  () => onDiscardDraft(),
    },
  };

  const boundRateSheet = svc.rate_sheets.find((sheet) => sheet.rate_sheet_id === edition.rate_sheet_id) ?? null;
  const pricingRulesBinding: ShellBinding<TierEditionPricingRulesShellData> = {
    data: {
      rateSheetId:      edition.rate_sheet_id,
      rateSheetName:    boundRateSheet?.title ?? null,
      billingCycle:     edition.billing_cycle,
      minimumTermValue: edition.minimum_term_value,
      minimumTermUnit:  edition.minimum_term_unit,
    },
    state: moduleState,
    hasDraft,
    handlers: {
      edit: () => onEdit('pricing-rules'),
    },
  };

  // Resolved rows for display — the SAME buildRateSheetCatalogue resolver
  // the occupant's own Default Tier Inclusions card and this Edition's own
  // editor both use (tier-edition-admin-contract.ts already audits that
  // reuse). Selection-first: resolve edition.rate_sheet_items (the Edition's
  // OWN persisted selection) against the catalogue, THEN filter to
  // inclusion-type sources — exactly the direction usePackageStation.tierView
  // derives the occupant's own inclusions_override from its
  // resolvedSelections. Filtering the catalogue directly (the prior code
  // here) rendered every inclusion-type row the bound Rate Sheet has, not
  // just the ones this Edition actually selected.
  const catalogue = buildRateSheetCatalogue(svc, edition.rate_sheet_id, []);
  const resolvedSelections = edition.rate_sheet_items.map((selection) => (
    catalogue.find((item) => item.item_id === selection.item_id) ?? {
      item_id: selection.item_id, source_type: null, source_id: null, quantity: selection.quantity,
      resolved: false, label: '(unresolved Rate Sheet item)', unit_price: null, per: null, group_id: null, line_total: null,
    }
  ));
  const items = resolvedSelections
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

  return { overviewBinding, pricingRulesBinding, inclusionsBinding };
}
