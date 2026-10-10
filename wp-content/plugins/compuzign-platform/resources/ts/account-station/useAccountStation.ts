// useAccountStation — the authoritative Account Station hook.
//
// Mirrors useServiceStation/usePackageFamilyStation: owns the local record,
// draft-preferred reads, mutations, and lifecycle, and advances itself from
// each mutation's response. There is no numeric/string record id and no
// create/new-sentinel branch — `detail.bootstrapped` is the one "does this
// singleton already have a Save behind it" signal, and every route is always
// addressable (the record IS the singleton).
//
// Publish is one user action that performs settle-then-activate internally,
// exactly as Package Family's publishFamily does — never a second user-facing
// Settle control.

import { useCallback, useMemo, useState } from 'preact/hooks';
import { disableAccount, enableAccount, publishAccount, saveAccountBrand, settleAccountBrand } from './api';
import type { AccountBrandPayload, AccountDetail } from './types';
import { accountBrandModule, evaluateModule } from '@/drawer-kit/utils/moduleNotifications';

export function useAccountStation(seed: AccountDetail, onMutationComplete?: () => void) {
  const [detail, setDetail] = useState(seed);
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const platformStatus = detail.platform_status;
  const isActive = platformStatus === 'active';
  const isDisabledMasked = platformStatus === 'disabled' && detail.previous_platform_status !== '';
  const hasDraft = detail.drafts.brand !== null;

  const brandModuleState = useMemo(() => evaluateModule(
    accountBrandModule,
    { bootstrapped: detail.bootstrapped },
    {
      platformStatus,
      platformLabel: 'Account Profile',
      moduleTransition: detail.module_status.brand,
      hasDraft,
      disabled: isDisabledMasked,
    },
  ), [detail.bootstrapped, detail.module_status.brand, hasDraft, isDisabledMasked, platformStatus]);

  const canPublish = brandModuleState.status === 'pending-full' || (isActive && hasDraft);

  const saveBrand = useCallback(async (payload: AccountBrandPayload) => {
    setSaving(true);
    try {
      const response = await saveAccountBrand(payload);
      if (!response.success) throw new Error('Could not save the Account Profile Brand.');
      setDetail((current) => ({
        ...current,
        bootstrapped: true,
        nodes: response.nodes,
        drafts: { brand: response.draft },
        module_status: response.module_status as AccountDetail['module_status'],
      }));
      onMutationComplete?.();
      return response;
    } finally {
      setSaving(false);
    }
  }, [onMutationComplete]);

  const settleBrand = useCallback(async () => {
    const response = await settleAccountBrand();
    if (!response.success) throw new Error('Could not settle the Account Profile Brand.');
    setDetail((current) => ({
      ...current,
      brand: response.brand,
      drafts: { brand: null },
      module_status: response.module_status as AccountDetail['module_status'],
    }));
    onMutationComplete?.();
    return response;
  }, [onMutationComplete]);

  const publish = useCallback(async () => {
    setStatusSaving(true);
    try {
      await settleBrand();
      const activated = await publishAccount();
      if (!activated.success) throw new Error('Could not publish the Account Profile.');
      setDetail((current) => ({
        ...current,
        platform_status: activated.platform_status,
        previous_platform_status: activated.previous_platform_status,
        module_status: activated.module_status,
      }));
      onMutationComplete?.();
      return activated;
    } finally {
      setStatusSaving(false);
    }
  }, [onMutationComplete, settleBrand]);

  const toggleActive = useCallback(async () => {
    setStatusSaving(true);
    try {
      const response = isDisabledMasked ? await enableAccount() : await disableAccount();
      if (!response.success) throw new Error(`Could not ${isDisabledMasked ? 'enable' : 'disable'} the Account Profile.`);
      setDetail((current) => ({
        ...current,
        platform_status: response.platform_status,
        previous_platform_status: response.previous_platform_status,
        module_status: response.module_status,
      }));
      onMutationComplete?.();
      return response;
    } finally {
      setStatusSaving(false);
    }
  }, [isDisabledMasked, onMutationComplete]);

  return {
    detail,
    platformStatus,
    isActive,
    isDisabledMasked,
    hasDraft,
    canPublish,
    modules: { brand: brandModuleState },
    loading: { saving, status: statusSaving },
    saveBrand,
    settleBrand,
    publish,
    toggleActive,
  };
}

export type AccountStation = ReturnType<typeof useAccountStation>;
