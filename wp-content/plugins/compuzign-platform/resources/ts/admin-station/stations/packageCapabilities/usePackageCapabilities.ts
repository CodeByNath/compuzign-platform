import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import {
  fetchPackageCapabilities,
  savePackageCapabilityAssignment,
} from '@/api/endpoints/admin';
import type {
  PackageCapabilitiesResponse,
  PackageCapabilityOwnerType,
} from '@/api/types/admin';

interface CapabilityState {
  data: PackageCapabilitiesResponse | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

export interface PackageCapabilitiesStore extends CapabilityState {
  isEnabled: (
    ownerType: PackageCapabilityOwnerType,
    ownerId: string,
    capabilityKey: string,
  ) => boolean;
  setEnabled: (args: {
    ownerType: PackageCapabilityOwnerType;
    ownerId: string;
    capabilityKey: string;
    enabled: boolean;
  }) => Promise<boolean>;
  refetch: () => void;
}

/** Package-owned assignment state and mutation boundary. */
export function usePackageCapabilities(): PackageCapabilitiesStore {
  const [retryKey, setRetryKey] = useState(0);
  const [state, setState] = useState<CapabilityState>({
    data: null,
    loading: true,
    saving: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null }));
    fetchPackageCapabilities()
      .then((data) => {
        if (!cancelled) setState((current) => ({ ...current, data, loading: false, error: null }));
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load Package capabilities.',
          }));
        }
      });
    return () => { cancelled = true; };
  }, [retryKey]);

  const isEnabled = useCallback((
    ownerType: PackageCapabilityOwnerType,
    ownerId: string,
    capabilityKey: string,
  ): boolean => state.data?.assignments.some((assignment) => (
    assignment.owner_type === ownerType
    && assignment.owner_id === ownerId
    && assignment.capability_key === capabilityKey
    && assignment.enabled
  )) ?? false, [state.data]);

  const setEnabled = useCallback(async ({
    ownerType,
    ownerId,
    capabilityKey,
    enabled,
  }: {
    ownerType: PackageCapabilityOwnerType;
    ownerId: string;
    capabilityKey: string;
    enabled: boolean;
  }): Promise<boolean> => {
    setState((current) => ({ ...current, saving: true, error: null }));
    try {
      const data = await savePackageCapabilityAssignment({
        owner_type: ownerType,
        owner_id: ownerId,
        capability_key: capabilityKey,
        enabled,
      });
      setState((current) => ({ ...current, data, saving: false, error: null }));
      return data.success;
    } catch (error) {
      setState((current) => ({
        ...current,
        saving: false,
        error: error instanceof Error ? error.message : 'Failed to update Package capability.',
      }));
      return false;
    }
  }, []);

  return useMemo(() => ({
    ...state,
    isEnabled,
    setEnabled,
    refetch: () => setRetryKey((key) => key + 1),
  }), [state, isEnabled, setEnabled]);
}
