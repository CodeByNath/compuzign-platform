import { useEffect, useState } from 'preact/hooks';
import { useAdminOverview } from '@/hooks/useAdminOverview';
import { useApi } from '@/hooks/useApi';
import { fetchMigrationAudit, runPhaseOneMigration, runPhaseTwoMigration, runPhaseFourMigration } from '@/api/endpoints/admin';
import type { MigrationAudit, MigrationRunResult, MigrationPhase2Result, MigrationPhase4Result } from '@/api/types/admin';
import { Spinner } from '@/components/ui/Spinner';

interface Props {
  refreshKey: number;
}

const CHECK_META: Record<string, { label: string; description: string }> = {
  cost_builder: { label: 'Service Catalog',    description: 'XLSX importer and catalog river' },
  requests:     { label: 'Requests River',     description: 'Quote submission and notification pipeline' },
  mail:         { label: 'Mail / SMTP',        description: 'CZ_SMTP_HOST constant is configured' },
  admin:        { label: 'Admin Module',       description: 'Command Centre runtime registered' },
};

export function HealthWorkstation({ refreshKey }: Props) {
  const { data, loading, error, refetch } = useAdminOverview();
  const { data: audit, loading: auditLoading, error: auditError, refetch: auditRefetch } =
    useApi<MigrationAudit>(fetchMigrationAudit);

  const [migrating,       setMigrating]       = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationRunResult | null>(null);
  const [migrationError,  setMigrationError]  = useState<string | null>(null);

  const [migratingP2,       setMigratingP2]       = useState(false);
  const [migrationP2Result, setMigrationP2Result] = useState<MigrationPhase2Result | null>(null);
  const [migrationP2Error,  setMigrationP2Error]  = useState<string | null>(null);

  const handleRunMigration = async () => {
    setMigrating(true);
    setMigrationError(null);
    setMigrationResult(null);
    try {
      const result = await runPhaseOneMigration();
      setMigrationResult(result);
      auditRefetch();
    } catch (err) {
      setMigrationError(err instanceof Error ? err.message : 'Migration failed.');
    } finally {
      setMigrating(false);
    }
  };

  const handleRunP2Migration = async () => {
    setMigratingP2(true);
    setMigrationP2Error(null);
    setMigrationP2Result(null);
    try {
      const result = await runPhaseTwoMigration();
      setMigrationP2Result(result);
    } catch (err) {
      setMigrationP2Error(err instanceof Error ? err.message : 'Phase 2 migration failed.');
    } finally {
      setMigratingP2(false);
    }
  };

  const [migratingP4,       setMigratingP4]       = useState(false);
  const [migrationP4Result, setMigrationP4Result] = useState<MigrationPhase4Result | null>(null);
  const [migrationP4Error,  setMigrationP4Error]  = useState<string | null>(null);

  const handleRunP4Migration = async () => {
    setMigratingP4(true);
    setMigrationP4Error(null);
    setMigrationP4Result(null);
    try {
      const result = await runPhaseFourMigration();
      setMigrationP4Result(result);
    } catch (err) {
      setMigrationP4Error(err instanceof Error ? err.message : 'Phase 4 migration failed.');
    } finally {
      setMigratingP4(false);
    }
  };

  useEffect(() => {
    if (refreshKey > 0) { refetch(); auditRefetch(); }
  }, [refreshKey]);

  if (loading) {
    return (
      <div class="cz-admin-loading">
        <Spinner label="Loading health…" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div class="cz-admin-error-msg">{error}</div>
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" style="margin-top:12px" onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const checks = Object.entries(data.health);
  const allOk = checks.every(([, ok]) => ok);
  const failCount = checks.filter(([, ok]) => !ok).length;

  const multiClear = audit?.multi_service_packages.result === 'CLEAR';
  const auditBlocked =
    audit && (
      audit.packages_empty_refs.count > 0 ||
      audit.packages_broken_refs.count > 0 ||
      audit.multi_service_packages.result === 'BLOCKED'
    );

  return (
    <div>
      <div class="cz-ws-header">
        <div>
          <h2 class="cz-ws-title">Health & System Status</h2>
          <p class="cz-ws-subtitle">
            {allOk
              ? `All ${checks.length} modules healthy`
              : `${failCount} of ${checks.length} module${checks.length !== 1 ? 's' : ''} degraded`}
          </p>
        </div>
        <div class="cz-ws-actions">
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => { refetch(); auditRefetch(); }}>
            Refresh
          </button>
        </div>
      </div>

      <div class="cz-health-status-banner" data-ok={allOk ? 'true' : 'false'}>
        <span class="cz-health-status-banner__icon">{allOk ? '✓' : '!'}</span>
        <div>
          <p class="cz-health-status-banner__title">
            {allOk ? 'Platform Healthy' : 'Platform Degraded'}
          </p>
          <p class="cz-health-status-banner__sub">
            {allOk
              ? 'All modules are operating normally.'
              : `${failCount} module${failCount !== 1 ? 's require' : ' requires'} attention.`}
          </p>
        </div>
        {data.platform_version && (
          <span class="cz-health-status-banner__version">v{data.platform_version}</span>
        )}
      </div>

      <div class="cz-health-module-grid">
        {checks.map(([name, ok]) => {
          const meta = CHECK_META[name] ?? { label: name, description: '' };
          return (
            <div key={name} class={`cz-health-module-card cz-health-module-card--${ok ? 'ok' : 'fail'}`}>
              <div class="cz-health-module-card__indicator">
                {ok ? '✓' : '✕'}
              </div>
              <div class="cz-health-module-card__body">
                <p class="cz-health-module-card__name">{meta.label}</p>
                {meta.description && (
                  <p class="cz-health-module-card__desc">{meta.description}</p>
                )}
              </div>
              <span class={`cz-health-module-card__status-text cz-health-module-card__status-text--${ok ? 'ok' : 'fail'}`}>
                {ok ? 'Healthy' : 'Degraded'}
              </span>
            </div>
          );
        })}
      </div>

      {!allOk && (
        <div class="cz-ws-card">
          <p class="cz-ws-card__title">Remediation</p>
          <div class="cz-health-remediation">
            {checks.filter(([, ok]) => !ok).map(([name]) => (
              <div key={name} class="cz-health-remediation__item">
                <span class="cz-health-remediation__module">{CHECK_META[name]?.label ?? name}</span>
                {name === 'mail' && (
                  <p class="cz-health-remediation__guidance">
                    Add <code>define('CZ_SMTP_HOST', '...')</code> to <code>wp-config.php</code>.
                    Also required: <code>CZ_SMTP_PORT</code>, <code>CZ_SMTP_USER</code>, <code>CZ_SMTP_PASS</code>.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Temporary — Phase 0 migration readiness audit. Remove after migration is validated. */}
      <div class="cz-ws-card" style="margin-top: var(--cz-space-6)">
        <p class="cz-ws-card__title">Migration Audit — Phase 0</p>

        {auditLoading && (
          <div style="padding: var(--cz-space-4) 0">
            <Spinner label="Running audit…" />
          </div>
        )}

        {auditError && (
          <div class="cz-admin-error-msg" style="margin-top: var(--cz-space-3)">
            Audit failed: {auditError}
          </div>
        )}

        {audit && (
          <div style="margin-top: var(--cz-space-4); display: flex; flex-direction: column; gap: var(--cz-space-5)">

            {/* Multi-service result banner */}
            <div class="cz-health-status-banner" data-ok={multiClear ? 'true' : 'false'}>
              <span class="cz-health-status-banner__icon">{multiClear ? '✓' : '!'}</span>
              <div>
                <p class="cz-health-status-banner__title">
                  Multi-Service Check: {audit.multi_service_packages.result}
                </p>
                <p class="cz-health-status-banner__sub">
                  {multiClear
                    ? 'All packages reference exactly one service. Phase 1 is unblocked.'
                    : `${audit.multi_service_packages.count} package${audit.multi_service_packages.count !== 1 ? 's reference' : ' references'} multiple services. Resolve before Phase 1.`}
                </p>
              </div>
            </div>

            {/* Baseline counts */}
            <div>
              <p style="margin: 0 0 var(--cz-space-2); font-size: var(--admin-fs-label); font-weight: var(--admin-fw-strong); color: var(--admin-text)">
                Baseline Counts
              </p>
              <div class="cz-health-module-grid">
                {[
                  { label: 'Service Stations', value: audit.counts.services },
                  { label: 'Package Posts',    value: audit.counts.packages },
                  { label: 'Promotions Total', value: audit.counts.promotions },
                ].map(({ label, value }) => (
                  <div key={label} class="cz-health-module-card cz-health-module-card--ok">
                    <div class="cz-health-module-card__body">
                      <p class="cz-health-module-card__name">{label}</p>
                    </div>
                    <span class="cz-health-module-card__status-text cz-health-module-card__status-text--ok">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Promotion status breakdown */}
            {Object.keys(audit.promotions_by_status).length > 0 && (
              <div>
                <p style="margin: 0 0 var(--cz-space-2); font-size: var(--admin-fs-label); font-weight: var(--admin-fw-strong); color: var(--admin-text)">
                  Promotions by Status
                </p>
                <div class="cz-health-module-grid">
                  {Object.entries(audit.promotions_by_status).map(([status, count]) => (
                    <div key={status} class={`cz-health-module-card cz-health-module-card--${status === 'unknown' ? 'fail' : 'ok'}`}>
                      <div class="cz-health-module-card__body">
                        <p class="cz-health-module-card__name" style="text-transform: capitalize">{status}</p>
                      </div>
                      <span class={`cz-health-module-card__status-text cz-health-module-card__status-text--${status === 'unknown' ? 'fail' : 'ok'}`}>
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
                {(audit.promotions_by_status['unknown'] ?? 0) > 0 && (
                  <p style="margin: var(--cz-space-2) 0 0; font-size: var(--admin-fs-s-label); color: var(--admin-error)">
                    Promotions with unknown status indicate schema inconsistencies. Investigate before Phase 4.
                  </p>
                )}
              </div>
            )}

            {/* Relationship integrity */}
            <div>
              <p style="margin: 0 0 var(--cz-space-2); font-size: var(--admin-fs-label); font-weight: var(--admin-fw-strong); color: var(--admin-text)">
                Relationship Integrity
              </p>
              <div class="cz-health-module-grid">
                <div class={`cz-health-module-card cz-health-module-card--ok`}>
                  <div class="cz-health-module-card__body">
                    <p class="cz-health-module-card__name">Services without a package</p>
                    <p class="cz-health-module-card__desc">Expected — migrator handles these</p>
                  </div>
                  <span class="cz-health-module-card__status-text cz-health-module-card__status-text--ok">
                    {audit.services_without_package.count}
                  </span>
                </div>
                <div class={`cz-health-module-card cz-health-module-card--${audit.packages_empty_refs.count > 0 ? 'fail' : 'ok'}`}>
                  <div class="cz-health-module-card__body">
                    <p class="cz-health-module-card__name">Packages with empty refs</p>
                    <p class="cz-health-module-card__desc">{audit.packages_empty_refs.count > 0 ? 'Resolve before Phase 1' : 'None found'}</p>
                  </div>
                  <span class={`cz-health-module-card__status-text cz-health-module-card__status-text--${audit.packages_empty_refs.count > 0 ? 'fail' : 'ok'}`}>
                    {audit.packages_empty_refs.count}
                  </span>
                </div>
                <div class={`cz-health-module-card cz-health-module-card--${audit.packages_broken_refs.count > 0 ? 'fail' : 'ok'}`}>
                  <div class="cz-health-module-card__body">
                    <p class="cz-health-module-card__name">Packages with broken refs</p>
                    <p class="cz-health-module-card__desc">{audit.packages_broken_refs.count > 0 ? 'Resolve before Phase 1' : 'None found'}</p>
                  </div>
                  <span class={`cz-health-module-card__status-text cz-health-module-card__status-text--${audit.packages_broken_refs.count > 0 ? 'fail' : 'ok'}`}>
                    {audit.packages_broken_refs.count}
                  </span>
                </div>
              </div>

              {/* Detail lists for any issues found */}
              {audit.packages_empty_refs.count > 0 && (
                <p style="margin: var(--cz-space-2) 0 0; font-size: var(--admin-fs-s-label); color: var(--admin-error)">
                  Empty ref package IDs: {audit.packages_empty_refs.ids.join(', ')}
                </p>
              )}
              {audit.packages_broken_refs.count > 0 && (
                <div style="margin-top: var(--cz-space-2)">
                  {audit.packages_broken_refs.items.map((item) => (
                    <p key={item.package_id} style="font-size: var(--admin-fs-s-label); color: var(--admin-error); margin: 0">
                      Package {item.package_id} → missing service {item.missing_service}
                    </p>
                  ))}
                </div>
              )}
              {audit.multi_service_packages.count > 0 && (
                <div style="margin-top: var(--cz-space-2)">
                  {audit.multi_service_packages.items.map((item) => (
                    <p key={item.package_id} style="font-size: var(--admin-fs-s-label); color: var(--admin-error); margin: 0">
                      Package {item.package_id} → services: {item.service_ids.join(', ')}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Overall readiness */}
            {!auditBlocked && (
              <p style="font-size: var(--admin-fs-s-label); color: var(--admin-success); font-weight: var(--admin-fw-strong)">
                ✓ No blockers found. Safe to proceed to Phase 1.
              </p>
            )}
            {auditBlocked && (
              <p style="font-size: var(--admin-fs-s-label); color: var(--admin-error); font-weight: var(--admin-fw-strong)">
                Resolve the issues above before beginning Phase 1 migration.
              </p>
            )}

            {/* Phase 4 migration run */}
            <div style="border-top: 1px solid var(--admin-border-blue); padding-top: var(--cz-space-4); display: flex; flex-direction: column; gap: var(--cz-space-3)">
              <div>
                <p style="margin: 0 0 4px; font-size: var(--admin-fs-label); font-weight: var(--admin-fw-strong); color: var(--admin-text)">
                  Phase 4 Migration — Promotion Station
                </p>
                <p style="margin: 0; font-size: var(--admin-fs-s-label); color: var(--admin-text-faint)">
                  Copies promotion instances from legacy package meta into
                  cz_service_promotion_station on each Service Station.
                  Run Phase 1 migration first. Idempotent — safe to run multiple times.
                </p>
              </div>
              <div style="display: flex; align-items: center; gap: var(--cz-space-3)">
                <button
                  type="button"
                  class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm"
                  onClick={handleRunP4Migration}
                  disabled={migratingP4}
                >
                  {migratingP4 ? 'Running…' : 'Run Phase 4 Migration'}
                </button>
                {migrationP4Error && (
                  <span style="font-size: var(--admin-fs-s-label); color: var(--admin-error)">{migrationP4Error}</span>
                )}
              </div>
              {migrationP4Result && (
                <div class="cz-health-module-grid">
                  {[
                    { label: 'Services with promotions migrated', value: migrationP4Result.results.migrated,         ok: true },
                    { label: 'Already migrated',                  value: migrationP4Result.results.already_migrated, ok: true },
                    { label: 'Services with no promotions',       value: migrationP4Result.results.born_empty,       ok: true },
                    { label: 'Errors',                            value: migrationP4Result.results.errors.length,    ok: migrationP4Result.results.errors.length === 0 },
                  ].map(({ label, value, ok }) => (
                    <div key={label} class={`cz-health-module-card cz-health-module-card--${ok ? 'ok' : 'fail'}`}>
                      <div class="cz-health-module-card__body">
                        <p class="cz-health-module-card__name">{label}</p>
                      </div>
                      <span class={`cz-health-module-card__status-text cz-health-module-card__status-text--${ok ? 'ok' : 'fail'}`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Phase 2 migration run */}
            <div style="border-top: 1px solid var(--admin-border-blue); padding-top: var(--cz-space-4); display: flex; flex-direction: column; gap: var(--cz-space-3)">
              <div>
                <p style="margin: 0 0 4px; font-size: var(--admin-fs-label); font-weight: var(--admin-fw-strong); color: var(--admin-text)">
                  Phase 2 Migration — Tier Occupant Model
                </p>
                <p style="margin: 0; font-size: var(--admin-fs-s-label); color: var(--admin-text-faint)">
                  Transforms flat tier data in Package Station to the Tier Occupant model.
                  Run Phase 1 migration first. Idempotent — safe to run multiple times.
                </p>
              </div>
              <div style="display: flex; align-items: center; gap: var(--cz-space-3)">
                <button
                  type="button"
                  class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm"
                  onClick={handleRunP2Migration}
                  disabled={migratingP2}
                >
                  {migratingP2 ? 'Running…' : 'Run Phase 2 Migration'}
                </button>
                {migrationP2Error && (
                  <span style="font-size: var(--admin-fs-s-label); color: var(--admin-error)">{migrationP2Error}</span>
                )}
              </div>
              {migrationP2Result && (
                <div class="cz-health-module-grid">
                  {[
                    { label: 'Tiers migrated to occupant model', value: migrationP2Result.results.migrated,         ok: true },
                    { label: 'Already in occupant model',        value: migrationP2Result.results.already_migrated, ok: true },
                    { label: 'Errors',                           value: migrationP2Result.results.errors.length,    ok: migrationP2Result.results.errors.length === 0 },
                  ].map(({ label, value, ok }) => (
                    <div key={label} class={`cz-health-module-card cz-health-module-card--${ok ? 'ok' : 'fail'}`}>
                      <div class="cz-health-module-card__body">
                        <p class="cz-health-module-card__name">{label}</p>
                      </div>
                      <span class={`cz-health-module-card__status-text cz-health-module-card__status-text--${ok ? 'ok' : 'fail'}`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Phase 1 migration run */}
            {!auditBlocked && (
              <div style="border-top: 1px solid var(--admin-border-blue); padding-top: var(--cz-space-4); display: flex; flex-direction: column; gap: var(--cz-space-3)">
                <div>
                  <p style="margin: 0 0 4px; font-size: var(--admin-fs-label); font-weight: var(--admin-fw-strong); color: var(--admin-text)">
                    Phase 1 + Phase 3 Migration
                  </p>
                  <p style="margin: 0; font-size: var(--admin-fs-s-label); color: var(--admin-text-faint)">
                    Writes Package Station and Promotion Station regions to all existing Service Stations.
                    Idempotent — safe to run multiple times.
                  </p>
                </div>
                <div style="display: flex; align-items: center; gap: var(--cz-space-3)">
                  <button
                    type="button"
                    class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm"
                    onClick={handleRunMigration}
                    disabled={migrating}
                  >
                    {migrating ? 'Running…' : 'Run Migration'}
                  </button>
                  {migrationError && (
                    <span style="font-size: var(--admin-fs-s-label); color: var(--admin-error)">
                      {migrationError}
                    </span>
                  )}
                </div>
                {migrationResult && (
                  <div class="cz-health-module-grid">
                    {[
                      { label: 'Migrated from package',  value: migrationResult.results.migrated,         ok: true  },
                      { label: 'Already migrated',       value: migrationResult.results.already_migrated, ok: true  },
                      { label: 'Born empty (no package)', value: migrationResult.results.born_empty,      ok: true  },
                      { label: 'Errors',                 value: migrationResult.results.errors.length,    ok: migrationResult.results.errors.length === 0 },
                    ].map(({ label, value, ok }) => (
                      <div key={label} class={`cz-health-module-card cz-health-module-card--${ok ? 'ok' : 'fail'}`}>
                        <div class="cz-health-module-card__body">
                          <p class="cz-health-module-card__name">{label}</p>
                        </div>
                        <span class={`cz-health-module-card__status-text cz-health-module-card__status-text--${ok ? 'ok' : 'fail'}`}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {migrationResult && migrationResult.results.errors.length > 0 && (
                  <div>
                    {migrationResult.results.errors.map((e) => (
                      <p key={e.service_id} style="font-size: var(--admin-fs-s-label); color: var(--admin-error); margin: 0">
                        Service {e.service_id}: {e.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
