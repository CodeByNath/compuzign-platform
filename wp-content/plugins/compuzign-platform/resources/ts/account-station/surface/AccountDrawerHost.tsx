// AccountDrawerHost — the Admin Station host adapter for the Account drawer.
//
// Mirrors ServiceDrawerHost: a thin translator mounting the neutral
// AccountDrawerContent composition. The drawer's own read is separate from
// the wall's (useAccountProfileCard) — the same two-instance rule Service and
// Package Family keep, so refreshing one cannot disturb the other.

import { useMemo, useRef } from 'preact/hooks';
import type { VNode } from 'preact';
import { useApi } from '@/hooks/useApi';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { fetchAccountDetail } from '../api';
import { AccountDrawerContent } from '../drawer/AccountDrawerContent';
import type { DrawerContentProps } from '@/station-manager/drawerTypes';

export function AccountDrawerHost({ mode, onClose, onSaved, setFooter, setCloseGuard }: DrawerContentProps): VNode {
  const { data, loading, error } = useApi(fetchAccountDetail);

  const closeRef  = useRef(onClose);         closeRef.current  = onClose;
  const footerRef = useRef(setFooter);       footerRef.current = setFooter;
  const guardRef  = useRef(setCloseGuard);   guardRef.current  = setCloseGuard;
  const savedRef  = useRef(onSaved);         savedRef.current  = onSaved;

  const bridge = useMemo<EntityDrawerHostBridge>(() => ({
    close:         () => closeRef.current(),
    setFooter:     (footer) => footerRef.current?.(footer),
    setCloseGuard: (guard)  => guardRef.current?.(guard),
    onMutationComplete: () => savedRef.current(),
  }), []);

  if (loading && !data) return <div class="cz-station-drawer__state">Loading Account Profile…</div>;
  if (error)             return <div class="cz-station-drawer__state">{error}</div>;
  if (!data)             return <div class="cz-station-drawer__state">Account Profile is not available.</div>;

  return (
    <AccountDrawerContent
      account={data}
      initialTab="details"
      initialEdit={mode === 'edit'}
      bridge={bridge}
    />
  );
}
