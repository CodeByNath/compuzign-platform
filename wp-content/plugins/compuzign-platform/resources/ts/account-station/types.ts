/*
 * Account Station — frontend contracts for the singleton Account/Settings/
 * Tools/Profile chain owned by src/Modules/Account (AccountController's 4
 * routes).
 *
 * DELIBERATELY ZERO IMPORTS, mirroring service-station/types.ts: if a shape
 * here ever needs to be shared, resolve the shared type's ownership rather
 * than importing a cross-boundary module here.
 *
 * There is no numeric/string record id: the record IS the singleton,
 * addressed by nothing but its own fixed native references. `bootstrapped`
 * is the frontend's only "does this record exist yet" signal, replacing the
 * create/new-sentinel ambiguity every other Station's drawer carries.
 */

// ── Identity nodes ────────────────────────────────────────────────────────────

export type AccountNodeKey = 'account_station' | 'settings' | 'tools' | 'profile';

export interface AccountNode {
  platformId: string;
  parentPlatformId: string | null;
}

export type AccountNodes = Record<AccountNodeKey, AccountNode>;

// ── Brand (Profile's first and only section) ─────────────────────────────────

export interface AccountBrand {
  name: string;
  code: string;
  logo_attachment_id: number | null;
  favicon_attachment_id: number | null;
}

// ── DETAIL: GET /admin/account-station ───────────────────────────────────────

export interface AccountDetail {
  success: boolean;
  bootstrapped: boolean;
  nodes: AccountNodes;
  platform_status: 'active' | 'disabled';
  previous_platform_status: 'active' | 'disabled' | '';
  module_status: { brand: 'not-configured' | 'pending' | 'settled' };
  brand: AccountBrand;
  drafts: { brand: AccountBrand | null };
}

// ── MODULE I/O: Brand save/settle ─────────────────────────────────────────────

export interface AccountBrandPayload {
  name: string;
  code: string;
  logo_attachment_id: number | null;
  favicon_attachment_id: number | null;
}

export interface AccountBrandSaveResponse {
  success: boolean;
  draft: AccountBrand;
  module_status: AccountDetail['module_status'];
  nodes: AccountNodes;
}

export interface AccountBrandSettleResponse {
  success: boolean;
  brand: AccountBrand;
  module_status: AccountDetail['module_status'];
}

// ── LIFECYCLE: status ─────────────────────────────────────────────────────────

export interface AccountStatusPayload {
  platform_status?: 'active';
  action?: 'disable' | 'enable';
}

export interface AccountStatusResponse {
  success: boolean;
  platform_status: AccountDetail['platform_status'];
  previous_platform_status: AccountDetail['previous_platform_status'];
  module_status: AccountDetail['module_status'];
}
