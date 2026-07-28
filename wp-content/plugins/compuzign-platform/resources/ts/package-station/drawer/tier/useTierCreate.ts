// Tier system creation — the Package-owned state behind the `tier` drawer's
// `tier-instance:new[:familyId]` address.
//
// Creating is composed entirely from the SAME authoritative mutations the
// ordinary empty-slot cycle already uses: minting the instance
// (createTierInstance), the optional Family link (createTierAssignment), and
// the per-module draft save + settle that already turns an empty fixed slot
// into a real occupant (saveServicePackageStationTierModule /
// settleServicePackageStationTier). Nothing here is a second creation
// mechanism — it is the one authoritative sequence, triggered exactly once by
// the drawer's own footer, never by a module's inline editor Save.
//
// `committed` is what the readable Tier Overview module shows — untouched
// until Save closes an edit session, exactly like the ordinary occupant's
// draft-preferred detail. `editDraft` only exists while the section edits; it
// seeds from `committed` (plus the same field defaults openSection already
// uses for an existing tier) and is discarded on Cancel.
//
// The Tier Overview module's price is derived from Rate Sheet row selections
// (Included Features), which need the parent Service's resolved catalogue —
// unavailable before an instance exists to read it through. So creation's one
// gate is a non-empty label, the same minimum bar Package Family creation and
// the retired registration form both used; Included Features and Common
// Questions render in their ordinary empty/Pending state and become editable
// immediately after hand-off, through the ordinary occupant cycle.

import { useCallback, useState } from 'preact/hooks';
import {
  createTierAssignment,
  createTierInstance,
  saveServicePackageStationTierModule,
  settleServicePackageStationTier,
} from '../../api';
import type { TierOverviewEditDraft } from '../editors/TierOverviewEditor';

/** The new system's first occupant. Fixed by convention, like any other
 * first-configured slot — creation fills no other slot. */
export const TIER_CREATE_SLOT_ID = 'basic';

export interface TierCreateDraft {
  label: string;
  ideal_for: string;
  billing_cycle: string | null;
}

const EMPTY_TIER_CREATE_DRAFT: TierCreateDraft = { label: '', ideal_for: '', billing_cycle: null };

export interface TierCreateResult {
  instanceId: string;
  occupantId: string;
}

export function useTierCreate(
  serviceId: number,
  pendingFamilyId: string | null,
  onMutationComplete?: () => void,
) {
  const [committed, setCommitted] = useState<TierCreateDraft>(EMPTY_TIER_CREATE_DRAFT);
  const [editDraft, setEditDraft] = useState<TierOverviewEditDraft | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Remembers a successfully minted instance across a failed retry, so a
  // second Create click never mints a second orphan instance.
  const [mintedInstanceId, setMintedInstanceId] = useState<string | null>(null);

  const openSection = useCallback(() => {
    setEditDraft({
      label:         committed.label,
      ideal_for:     committed.ideal_for,
      price:         null,
      contact:       false,
      billing_cycle: committed.billing_cycle ?? 'monthly',
      rate_sheet_id: null,
      popular:       false,
      popular_label: '',
    });
    setError(null);
  }, [committed]);

  const saveSection = useCallback(() => {
    setEditDraft((current) => {
      if (current) {
        setCommitted({ label: current.label, ideal_for: current.ideal_for, billing_cycle: current.billing_cycle });
      }
      return null;
    });
  }, []);

  const cancelSection = useCallback(() => setEditDraft(null), []);

  const hasContent = committed.label.trim().length > 0;

  const create = useCallback(async (): Promise<TierCreateResult | null> => {
    if (!hasContent || creating) return null;
    setCreating(true);
    setError(null);
    try {
      let instanceId = mintedInstanceId;
      if (instanceId === null) {
        const response = await createTierInstance({ title: committed.label.trim() });
        if (!response.success) {
          setError('Could not create the Tier system.');
          return null;
        }
        instanceId = response.tier_instance.tier_instance_id;
        setMintedInstanceId(instanceId);
      }

      if (pendingFamilyId) {
        const assigned = await createTierAssignment({
          consumer_type: 'package_family',
          consumer_id: pendingFamilyId,
          tier_instance_id: instanceId,
        });
        // The instance is authoritative either way — a failed ledger write
        // leaves a created, unassigned Tier system rather than blocking the
        // creation that already succeeded.
        if (!assigned.success) {
          setError('The Tier system was created, but it could not be given to that Package Family. Attach it from the Family’s Capabilities panel.');
        }
      }

      const overviewRes = await saveServicePackageStationTierModule(
        serviceId, instanceId, TIER_CREATE_SLOT_ID, 'overview',
        {
          label:         committed.label.trim(),
          ideal_for:     committed.ideal_for,
          price:         null,
          contact:       false,
          billing_cycle: committed.billing_cycle ?? 'monthly',
          rate_sheet_id: null,
        },
      );
      if (!overviewRes.success) {
        setError('The Tier system was created, but its Overview could not be saved.');
        return null;
      }

      const settleRes = await settleServicePackageStationTier(serviceId, instanceId, TIER_CREATE_SLOT_ID);
      if (!settleRes.success) {
        setError('The Tier system was created, but the new tier could not be published.');
        return null;
      }

      onMutationComplete?.();
      return { instanceId, occupantId: TIER_CREATE_SLOT_ID };
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the Tier system.');
      return null;
    } finally {
      setCreating(false);
    }
  }, [committed, creating, hasContent, mintedInstanceId, onMutationComplete, pendingFamilyId, serviceId]);

  return {
    committed,
    editDraft, setEditDraft,
    openSection, saveSection, cancelSection,
    hasContent, creating, error, create,
  };
}

export type TierCreateState = ReturnType<typeof useTierCreate>;
