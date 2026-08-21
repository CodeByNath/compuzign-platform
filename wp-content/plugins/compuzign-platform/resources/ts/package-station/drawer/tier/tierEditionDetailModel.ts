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
import { resolveRateSheetSelection } from '../../rateSheetLabels';
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

  // Resolved rows — the SAME per-selection resolution rule
  // usePackageStation.tierView() uses for the occupant's own live price and
  // inclusions_override (resolveRateSheetSelection, rateSheetLabels.ts).
  // Previously this Edition model built its own weaker resolution via
  // buildRateSheetCatalogue()'s generic candidate rows (always quantity: 1,
  // always Default Price) — that never reflected THIS Edition's own
  // selected quantity/price_option_id, and dropped Bundle-backed/unresolved
  // rows outright. Sharing the one rule fixes both: Price below is now
  // live from these same resolved lines instead of a stored snapshot that
  // only a full page reload could refresh, and Inclusions (below) stops
  // silently losing rows the occupant's own equivalent card would show.
  const boundRateSheet = svc.rate_sheets.find((sheet) => sheet.rate_sheet_id === edition.rate_sheet_id) ?? null;
  const sourceById = new Map(svc.package_relationships.map((item) => [item.item_id, item]));
  const rateById = new Map((boundRateSheet?.items ?? []).map((item) => [item.item_id, item]));
  const resolvedSelections = edition.rate_sheet_items.map((selection) => (
    resolveRateSheetSelection(selection, rateById, sourceById)
  ));
  // Same formula as usePackageStation.ts's own dp.price: the resolved total
  // when at least one line resolves, else null (Contact/"Not configured"
  // branching happens at the shell binding's own text render, not here).
  const price = resolvedSelections.some((item) => item.resolved)
    ? resolvedSelections.reduce((total, item) => total + (item.line_total ?? 0), 0)
    : null;

  const overviewBinding: ShellBinding<TierEditionOverviewShellData> = {
    data: {
      title:             edition.title,
      adminDescription:  edition.admin_description,
      price,
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

  const pricingRulesBinding: ShellBinding<TierEditionPricingRulesShellData> = {
    data: {
      rateSheetId:      edition.rate_sheet_id,
      rateSheetName:    boundRateSheet?.title ?? null,
      billingCycle:     edition.billing_cycle,
      minimumTermValue: edition.minimum_term_value,
      minimumTermUnit:  edition.minimum_term_unit,
      fromMonth: edition.from_month,
      toMonth:   edition.to_month,
      legsCount: edition.legs?.length ?? 0,
    },
    state: moduleState,
    hasDraft,
    handlers: {
      edit: () => onEdit('pricing-rules'),
    },
  };

  // Same rule usePackageStation.ts's own inclusions_override uses: a
  // Bundle-backed row carries no source_type at all (no Manager source
  // stands behind a combination — see self_priced), so the filter must
  // recognize it by bundle_id too, or it silently vanishes here even
  // though it resolves fine. Unresolved rows are kept (missing: true)
  // rather than dropped outright — a selection whose row later became
  // unavailable should still show as a gap, not disappear entirely.
  const items = resolvedSelections
    .filter((item) => item.source_type === 'inclusion' || !!item.bundle_id)
    .map((item) => ({ id: item.item_id, label: item.label, missing: !item.resolved }));

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
