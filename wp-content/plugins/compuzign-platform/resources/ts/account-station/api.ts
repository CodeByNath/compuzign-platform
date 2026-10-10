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
  AccountMediaUploadResponse,
  AccountNodeKey,
  AccountNodes,
  AccountStatusPayload,
  AccountStatusResponse,
} from './types';

type WireNode = { platform_id: string; parent_platform_id: string | null };
type WireAccountDetail = Omit<AccountDetail, 'nodes'> & { nodes: Record<AccountNodeKey, WireNode> };
type WireAccountBrandSaveResponse = Omit<AccountBrandSaveResponse, 'nodes'> & { nodes: Record<AccountNodeKey, WireNode> };

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

export async function saveAccountBrand(payload: AccountBrandPayload): Promise<AccountBrandSaveResponse> {
  // Explicit field whitelist: the caller's draft object may also carry the
  // read-only logo_url/favicon_url presentation fields (AccountBrand), which
  // are never part of the writable Save contract.
  const body: AccountBrandPayload = {
    name: payload.name,
    code: payload.code,
    logo_attachment_id: payload.logo_attachment_id,
    favicon_attachment_id: payload.favicon_attachment_id,
  };
  const response = await apiClient.post<WireAccountBrandSaveResponse>('admin/account-station/profile', body);
  return { ...response, nodes: mapNodes(response.nodes) };
}

/**
 * Uploads one Logo/Favicon image through Account's own platform-owned picker
 * (AccountBrandEditor.tsx) — never the WordPress Media Library admin dialog.
 * Returns the bound attachment id and its URL; the id is only persisted once
 * the caller includes it in an ordinary saveAccountBrand() call.
 */
export function uploadAccountBrandMedia(file: File): Promise<AccountMediaUploadResponse> {
  const form = new FormData();
  form.append('file', file);
  return apiClient.postForm<AccountMediaUploadResponse>('admin/account-station/profile/media', form);
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
