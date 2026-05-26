import { useEffect } from 'preact/hooks';
import { useAdminOverview } from '@/hooks/useAdminOverview';
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

  useEffect(() => {
    if (refreshKey > 0) refetch();
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
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={refetch}>
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
    </div>
  );
}
