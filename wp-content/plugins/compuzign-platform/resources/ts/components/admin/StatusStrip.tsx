import { useAdminOverview } from '@/hooks/useAdminOverview';

export function StatusStrip() {
  const { data, loading } = useAdminOverview();

  if (loading || !data) {
    return (
      <div class="cz-admin-status-strip">
        <span class="cz-admin-status-check">Loading status…</span>
      </div>
    );
  }

  const checks = data.health;

  return (
    <div class="cz-admin-status-strip">
      {Object.entries(checks).map(([name, ok]) => (
        <span
          key={name}
          class={`cz-admin-status-check cz-admin-status-check--${ok ? 'ok' : 'fail'}`}
        >
          <span class="cz-admin-status-dot" />
          {name}
        </span>
      ))}
      {data.platform_version && (
        <span class="cz-admin-status-strip__version">v{data.platform_version}</span>
      )}
    </div>
  );
}
