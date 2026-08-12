// Platform Identifier migration — the ONE client for the existing migration
// boundary (`compuzign/v1/admin/platform-identifiers/migration`).
//
// Owned here rather than by a station peer because route ownership decides:
// the endpoint belongs to `src/PlatformIdentifier/TemporaryMigrationController`,
// not to Package, Service, or Admin's own entities. A station that wants to
// offer a repair control hosts the shared control below; it never calls this
// module itself and never acquires the endpoint.
//
// This module generates NO identity. It is a typed wrapper over an existing
// backend action: the engine owns reservation, generation, binding, collision
// detection, and every completion rule. Nothing here decides what a Platform ID
// is or when one may be minted.

import { apiClient } from '@/api/client';

/** The Package-owned scopes the migration boundary accepts. */
export type PlatformIdentifierEntityType =
  | 'package_family_group'
  | 'tier_group'
  | 'tier'
  | 'tier_addon'
  | 'package_rate_card_group'
  | 'package_rate_card'
  | 'package_rate_card_item';

/** One record the engine refused to act on. Never repaired from the browser. */
export interface PlatformIdentifierConflict {
  native_reference?: string;
  platform_id?: string;
  message: string;
}

/**
 * A zero-write dry check over one scope. `would_assign` is what a repair would
 * mint; `would_preserve` is what it would leave exactly as-is.
 */
export interface PlatformIdentifierReport {
  processed: number;
  would_assign: number;
  would_preserve: number;
  conflicts: PlatformIdentifierConflict[];
}

export interface PlatformIdentifierStatus {
  complete: boolean;
  progress: Partial<Record<PlatformIdentifierEntityType, { complete?: boolean }>>;
}

export interface PlatformIdentifierDryRun {
  dry_run: boolean;
  entity_type: PlatformIdentifierEntityType;
  report: PlatformIdentifierReport;
}

/** One assignment batch. The engine pages; `entity_complete` ends the loop. */
export interface PlatformIdentifierBatch {
  entity_type: PlatformIdentifierEntityType;
  processed: number;
  assigned: number;
  preserved: number;
  conflicts: PlatformIdentifierConflict[];
  entity_complete: boolean;
  complete: boolean;
}

const MIGRATION_PATH = 'admin/platform-identifiers/migration';

export function fetchPlatformIdentifierStatus(): Promise<PlatformIdentifierStatus> {
  return apiClient.get<PlatformIdentifierStatus>(MIGRATION_PATH);
}

/** Zero-write check. Safe to run at any time, including after completion. */
export function dryRunPlatformIdentifiers(
  entityType: PlatformIdentifierEntityType,
): Promise<PlatformIdentifierDryRun> {
  return apiClient.post<PlatformIdentifierDryRun>(MIGRATION_PATH, {
    action: 'dry-run',
    entity_type: entityType,
  });
}

/**
 * One assignment batch for one scope. Idempotent by the engine's own contract:
 * a record that already holds a valid Platform ID is preserved, never
 * reassigned, so re-running only ever fills genuine gaps.
 */
export function assignPlatformIdentifiers(
  entityType: PlatformIdentifierEntityType,
): Promise<PlatformIdentifierBatch> {
  return apiClient.post<PlatformIdentifierBatch>(MIGRATION_PATH, {
    action: 'assign',
    entity_type: entityType,
  });
}
