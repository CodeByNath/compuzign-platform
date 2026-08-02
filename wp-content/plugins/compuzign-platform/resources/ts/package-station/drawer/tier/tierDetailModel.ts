// Tier drawer derived models — pure builders, no state and no rendering.
//
// buildTierDetail assembles the individual-tier presentation model (draft-
// preferred detail, the resolved rate-sheet catalogue, and the three shell
// bindings) from the package station's view; buildTierFooterModel derives the
// record footer's mode and flags. The controller calls both per render and
// passes the results through unchanged, so presentation reads the same shapes
// as before the split.

import type { TierResolvedRateSheetSelection } from '../../types';
import type { PackageStation } from '../../usePackageStation';
import type { ShellBinding } from '@/drawer-kit/schema/types';
import type {
  TierOverviewShellData,
  TierFeaturesShellData,
  TierFaqsShellData,
} from '../schema/bindings/tier';
import { relationshipDisplayLabel } from '../../rateSheetLabels';
import { TIER_LABELS } from '../../vocabulary';
import type { TierEditingSection } from './tierDrawerTypes';

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
  footerOccupied:      boolean;
  // Whether this persisted occupant has ever been settled/activated by a real
  // Publish — distinct from footerOccupied (which is true the moment first
  // Save mints current_occupant). Drives the overflow lifecycle-removal
  // action's label: a never-published occupant has nothing settled worth
  // preserving, so it offers Move to Trash; a previously-published one keeps
  // the existing Archive action.
  footerHasBeenPublished: boolean;
}

export function buildTierFooterModel(
  pkg: PackageStation,
  editingTierId: string | null,
  editingSection: TierEditingSection,
): TierFooterModel {
  const station = pkg.station;
  const svc     = pkg.service;
  const footerView = editingTierId ? pkg.tierView(editingTierId) : null;
  // The footer's Disable/Enable toggle reflects the explicit Disabled mask,
  // not the published/active flag — a Pending, never-yet-published occupant
  // still offers Disable, and after Enable the footer offers Disable again.
  const footerEnabled = footerView ? !footerView.detail.is_explicitly_disabled : false;
  const footerHasContent = !!footerView && Object.values(footerView.moduleStatus).some((s) => s !== 'not-configured');
  // The authoritative persisted-occupant fact — current_occupant/occupant_id
  // — not slotOccupied's settled-content-completeness heuristic (that stays
  // in use for bin swap/target conflict checks in TierBinList, unchanged).
  // A first-Save pending occupant is a real, persisted, addressable record
  // with empty settled fields; it must not read as unoccupied.
  const footerOccupied = !!footerView?.detail.occupant_id;
  const footerHasBeenPublished = !!footerView && (
    footerView.detail.enabled || footerView.moduleStatus.overview === 'settled'
  );
  const footerMode: TierFooterModel['footerMode'] =
    (!pkg.detailLoaded || !station || !svc) ? 'close-only'
    : editingSection != null ? 'none'
    : !editingTierId ? 'close-only'
    : 'tier-actions';
  return { footerMode, footerEnabled, footerHasContent, footerOccupied, footerHasBeenPublished };
}

export interface TierDetailHandlers {
  onEditSection:  (section: 'tier-overview' | 'tier-inclusions' | 'tier-faqs') => void;
  onRevertModule: (module: 'overview' | 'features' | 'faqs') => void;
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

  const relationshipLabels = new Map(svc.package_relationships.map((item) => [item.item_id, relationshipDisplayLabel(item)]));
  const relationshipsById = new Map(svc.package_relationships.map((item) => [item.item_id, item]));
  // The selectable rows are those of the sheet this Tier is bound to.
  const boundSheet = svc.rate_sheets.find((sheet) => sheet.rate_sheet_id === detail.rate_sheet_id) ?? null;
  const rateSheetCatalogue: TierResolvedRateSheetSelection[] = (boundSheet?.items ?? []).map((item) => ({
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
  }));
  for (const selected of detail.rate_sheet_selections) {
    if (!rateSheetCatalogue.some((item) => item.item_id === selected.item_id)) rateSheetCatalogue.push(selected);
  }
  const isPopular = pkg.popularTier === editingTierId;
  const tierBusy = pkg.saving ? 'discard-draft' : null;

  const overviewBinding: ShellBinding<TierOverviewShellData> = {
    data: {
      label:        detail.label,
      idealFor:     detail.ideal_for,
      tierName:     TIER_LABELS[editingTierId],
      contact:      detail.contact,
      price:        detail.price,
      billingCycle: detail.billing_cycle,
      isAddon:      detail.is_addon,
      popular:      isPopular,
      platformId:   detail.platform_id,
      addonPlatformId: detail.addon_platform_id,
    },
    state:    view.modules.overview,
    hasDraft: view.drafts.overview !== null,
    handlers: { edit: () => onEditSection('tier-overview'), 'discard-draft': () => onRevertModule('overview') },
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
