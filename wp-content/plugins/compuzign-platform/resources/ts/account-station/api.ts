/*
 * Account Station — the endpoint functions for the singleton Account/
 * Settings/Tools/Profile chain.
 *
 * OWNERSHIP TEST: a function belongs here iff it calls one of the 4 routes
 * owned by the backend Account module (src/Modules/Account AccountController).
 */

import { apiClient } from '@/api/client';
import type {
  AccountBrandPayload,
  AccountBrandSaveResponse,
  AccountBrandSettleResponse,
  AccountDetail,
  AccountNodeKey,
  AccountNodes,
  AccountStatusPayload,
  AccountStatusResponse,
} from './types';

type WireNode = { platform_id: string; parent_platform_id: string | null };
type WireAccountDetail = Omit<AccountDetail, 'nodes'> & { nodes: Record<AccountNodeKey, WireNode> };

function mapNodes(nodes: Record<AccountNodeKey, WireNode>): AccountNodes {
  const entries = Object.entries(nodes) as Array<[AccountNodeKey, WireNode]>;
  return entries.reduce((out, [key, node]) => {
    out[key] = { platformId: node.platform_id, parentPlatformId: node.parent_platform_id };
    return out;
  }, {} as AccountNodes);
}

export async function fetchAccountDetail(): Promise<AccountDetail> {
  const response = await apiClient.get<WireAccountDetail>('admin/account-station');
  return { ...response, nodes: mapNodes(response.nodes) };
}

export function saveAccountBrand(payload: AccountBrandPayload): Promise<AccountBrandSaveResponse> {
  return apiClient.post<AccountBrandSaveResponse>('admin/account-station/profile', payload);
}

export function settleAccountBrand(): Promise<AccountBrandSettleResponse> {
  return apiClient.post<AccountBrandSettleResponse>('admin/account-station/profile/settle');
}

export function updateAccountStatus(payload: AccountStatusPayload): Promise<AccountStatusResponse> {
  return apiClient.post<AccountStatusResponse>('admin/account-station/status', payload);
}

export function publishAccount(): Promise<AccountStatusResponse> {
  return updateAccountStatus({ platform_status: 'active' });
}

export function disableAccount(): Promise<AccountStatusResponse> {
  return updateAccountStatus({ action: 'disable' });
}

export function enableAccount(): Promise<AccountStatusResponse> {
  return updateAccountStatus({ action: 'enable' });
}
