// Tier drawer derived models — pure builders, no state and no rendering.
//
// buildTierDetail assembles the individual-tier presentation model (draft-
// preferred detail, the resolved rate-sheet catalogue, and the three shell
// bindings) from the package station's view; buildTierFooterModel derives the
// record footer's mode and flags. The controller calls both per render and
// passes the results through unchanged, so presentation reads the same shapes
// as before the split.

import type { PackageManagerItem, PackageRateSheet, TierResolvedRateSheetSelection } from '../../types';
import type { PackageStation } from '../../usePackageStation';
import type { ShellBinding } from '@/drawer-kit/schema/types';
import type {
  TierOverviewShellData,
  TierFeaturesShellData,
  TierFaqsShellData,
} from '../schema/bindings/tier';
import { relationshipDisplayLabel } from '../../rateSheetLabels';
import { buildOccupantRateSheetCatalogue } from '../../tierRateSheetCatalogue';
import { TIER_LABELS } from '../../vocabulary';

// Whether a shell holds SETTLED content (an occupant). Client-side heuristic over
// the settled fields — the backend is authoritative and rejects with
// target_occupied / no_occupant when this misjudges an all-empty occupant.
export function slotOccupied(slot: { label: string; price: number | null; contact: boolean; billing_cycle: string | null; inclusions_override: unknown[]; faq_refs: unknown[] } | undefined | null): boolean {
  return !!slot && (
    slot.price !== null
    || slot.contact
    || !!slot.billing_cycle
    || !!slot.label.trim()
    || slot.inclusions_override.length > 0
    || slot.faq_refs.length > 0
  );
}

export interface TierFooterModel {
  footerMode:          'close-only' | 'none' | 'tier-actions';
  footerEnabled:       boolean;
  footerHasContent:    boolean;
  // Whether this persisted occupant has ever been settled/activated by a real
  // Publish. Drives the mature lifecycle split: never-published offers Move
  // to Trash; explicitly disabled offers Enable; otherwise Disable.
  footerHasBeenPublished: boolean;
}

export function buildTierFooterModel(
  pkg: PackageStation,
  editingTierId: string | null,
  // Focused Drawer Task signal (useTierDrawerController's focusedTaskActive):
  // the parent Tier's own module editing, the selected Edition's own module
  // editing (reported up from TierEditionDeclarationSwitcher), OR the
  // Edition Bin being active. Any one of these means a focused task shell
  // (InlineEditorShell or TierEditionBinFocusedView) owns the whole drawer
  // body and carries its own footer — this function does not care which one
  // is active, only that the pinned lifecycle footer must get out of the way.
  focusedTaskActive: boolean,
): TierFooterModel {
  const station = pkg.station;
  const svc     = pkg.service;
  const footerView = editingTierId ? pkg.tierView(editingTierId) : null;
  // The footer's Disable/Enable toggle reflects the explicit Disabled mask,
  // not the published/active flag — a Pending, never-yet-published occupant
  // still offers Disable, and after Enable the footer offers Disable again.
  const footerEnabled = footerView ? !footerView.detail.is_explicitly_disabled : false;
  const footerHasContent = !!footerView && Object.values(footerView.moduleStatus).some((s) => s !== 'not-configured');
  const footerHasBeenPublished = !!footerView && (
    footerView.detail.enabled || footerView.moduleStatus.overview === 'settled'
  );
  const footerMode: TierFooterModel['footerMode'] =
    (!pkg.detailLoaded || !station || !svc) ? 'close-only'
    : focusedTaskActive ? 'none'
    : !editingTierId ? 'close-only'
    : 'tier-actions';
  return { footerMode, footerEnabled, footerHasContent, footerHasBeenPublished };
}

export interface TierDetailHandlers {
  onEditSection:  (section: 'tier-overview' | 'tier-inclusions' | 'tier-faqs') => void;
  onRevertModule: (module: 'overview' | 'features' | 'faqs') => void;
}

/**
 * Resolve the selectable-row catalogue for an arbitrary bound Rate Sheet id
 * — pure, and independent of which occupant-shaped record owns the binding.
 * Extracted so the Tier occupant's own Overview/Features editor and a Tier
 * Edition's own Rate Sheet binding (a DIFFERENT `rate_sheet_id`, its own
 * `rate_sheet_items`) resolve rows through the exact same logic rather than
 * two copies that could drift. `existingSelections` carries forward any
 * already-selected row the bound sheet itself no longer lists (matching the
 * occupant's own "never silently drop a stored selection" behaviour).
 */
export function buildRateSheetCatalogue(
  svc: { rate_sheets: PackageRateSheet[]; package_relationships: PackageManagerItem[] },
  rateSheetId: string | null,
  existingSelections: TierResolvedRateSheetSelection[],
): TierResolvedRateSheetSelection[] {
  const relationshipLabels = new Map(svc.package_relationships.map((item) => [item.item_id, relationshipDisplayLabel(item)]));
  const relationshipsById = new Map(svc.package_relationships.map((item) => [item.item_id, item]));
  const boundSheet = svc.rate_sheets.find((sheet) => sheet.rate_sheet_id === rateSheetId) ?? null;
  const catalogue: TierResolvedRateSheetSelection[] = (boundSheet?.items ?? []).map((item) => ({
    item_id: item.item_id,
    source_type: relationshipsById.get(item.source_item_id)?.source_type ?? null,
    source_id: relationshipsById.get(item.source_item_id)?.source_id ?? null,
    quantity: 1,
    resolved: relationshipLabels.has(item.source_item_id),
    label: relationshipLabels.get(item.source_item_id) ?? '(unresolved Rate Sheet item)',
    unit_price: item.unit_price,
    per: item.per,
    group_id: item.group_id,
    line_total: item.unit_price,
    price_options: item.price_options,
  }));
  for (const selected of existingSelections) {
    if (!catalogue.some((item) => item.item_id === selected.item_id)) catalogue.push(selected);
  }
  return catalogue;
}

// Individual-tier derived model (null unless a tier is open).
export function buildTierDetail(
  pkg: PackageStation,
  editingTierId: string | null,
  { onEditSection, onRevertModule }: TierDetailHandlers,
) {
  const svc = pkg.service;
  if (!editingTierId || !svc) return null;
  const view = pkg.tierView(editingTierId);
  if (!view) return null;
  const detail = view.detail;

  const rateSheetCatalogue = buildOccupantRateSheetCatalogue(
    svc,
    detail.rate_sheet_ids,
    detail.rate_sheet_bundles,
    detail.rate_sheet_id,
    detail.rate_sheet_selections,
  );
  const isPopular = pkg.popularTier === editingTierId;
  const tierBusy = pkg.saving ? 'discard-draft' : null;

  const overviewBinding: ShellBinding<TierOverviewShellData> = {
    data: {
      label:        detail.label,
      idealFor:     detail.ideal_for,
      audienceGroups: detail.audience_groups,
      tierName:     TIER_LABELS[editingTierId],
      contact:      detail.contact,
      price:        detail.price,
      billingCycle: detail.billing_cycle,
      isAddon:      detail.is_addon,
      popular:      isPopular,
      platformId:   detail.platform_id,
      addonPlatformId: detail.addon_platform_id,
      // 1 (the occupant's own permanent Default) + however many additional
      // Edition child records already exist — always derived, never a
      // separately stored count. See docs/code-map/tier-edition.md.
      tierEditionsCount: 1 + (detail.tier_editions?.length ?? 0),
    },
    state:    view.modules.overview,
    hasDraft: view.drafts.overview !== null,
    handlers: {
      edit: () => onEditSection('tier-overview'),
      'discard-draft': () => onRevertModule('overview'),
    },
    busy: tierBusy,
  };
  const featuresBinding: ShellBinding<TierFeaturesShellData> = {
    data:     { items: detail.inclusions_override },
    state:    view.modules.features,
    hasDraft: view.drafts.features !== null,
    handlers: { edit: () => onEditSection('tier-inclusions'), 'discard-draft': () => onRevertModule('features') },
    busy: tierBusy,
  };
  const faqsBinding: ShellBinding<TierFaqsShellData> = {
    data:     { refs: detail.faq_refs, pool: svc.faqs },
    state:    view.modules.faqs,
    hasDraft: view.drafts.faqs !== null,
    handlers: { edit: () => onEditSection('tier-faqs'), 'discard-draft': () => onRevertModule('faqs') },
    busy: tierBusy,
  };

  return { view, detail, rateSheetCatalogue, isPopular, overviewBinding, featuresBinding, faqsBinding };
}

export type TierDetailModel = ReturnType<typeof buildTierDetail>;
