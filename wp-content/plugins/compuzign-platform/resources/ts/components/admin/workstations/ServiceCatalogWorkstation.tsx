import { useEffect, useState } from 'preact/hooks';
import { useCostBuilder } from '@/hooks/useCostBuilder';
import { Spinner } from '@/components/ui/Spinner';
import { apiClient } from '@/api/client';
import type { ActionConfig, StepContext } from '../ActionShell';
import type { CostBuilderResponse, ServiceItem } from '@/api/types/cost-builder';

interface Props {
  refreshKey: number;
  openAction: (config: ActionConfig) => void;
}

// ── Dry-run step ─────────────────────────────────────────────────────────────

interface DryRunResult {
  success: boolean;
  message: string;
  header_map?: Record<string, string>;
  header_row_number?: number;
  sample_rows?: Array<Record<string, string>>;
  sample_rows_count?: number;
}

function DryRunStep({ ctx }: { ctx: StepContext }) {
  useEffect(() => {
    ctx.setProgress('loading', 'Parsing catalog…');
    apiClient
      .post<DryRunResult>('cost-builder/import-catalog-dry-run', {})
      .then((result) => {
        ctx.setStepData('result', result);
        ctx.setProgress(result.success ? 'success' : 'error', result.message);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Dry-run failed.';
        ctx.setProgress('error', msg);
      });
  }, []);

  if (ctx.progress === 'loading') {
    return (
      <div class="cz-action-progress">
        <Spinner label="Parsing catalog XLSX…" />
        <p class="cz-action-progress__message">No data will be written.</p>
      </div>
    );
  }

  if (ctx.progress === 'error') {
    return (
      <div>
        <div class="cz-admin-error-msg">{ctx.message}</div>
        <p style="margin-top:12px;font-size:13px;color:var(--admin-text-muted)">
          Ensure <code>CompuZign_Service_Catalog.xlsx</code> is present in the catalog path on the server.
        </p>
      </div>
    );
  }

  const result = ctx.stepData.result as DryRunResult | undefined;
  if (!result) return null;

  const headers    = result.header_map ? Object.values(result.header_map) : [];
  const sampleRows = result.sample_rows ?? [];
  const sampleCols = result.header_map ? Object.keys(result.header_map) : [];

  return (
    <div>
      <div class="cz-dryrun-meta">
        <span class="cz-dryrun-tag">Header row: {result.header_row_number ?? '—'}</span>
        <span class="cz-dryrun-tag">Sample rows: {result.sample_rows_count ?? 0}</span>
        {headers.length > 0 && (
          <span class="cz-dryrun-tag">Columns: {headers.join(', ')}</span>
        )}
      </div>

      {sampleRows.length > 0 && (
        <div class="cz-dryrun-sample">
          <table>
            <thead>
              <tr>
                {sampleCols.map((col) => (
                  <th key={col}>{result.header_map?.[col] ?? col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleRows.slice(0, 5).map((row, i) => (
                <tr key={i}>
                  {sampleCols.map((col) => (
                    <td key={col}>{(row as Record<string, string>)[result.header_map?.[col] ?? col] ?? '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
        <button type="button" class="cz-admin-btn cz-admin-btn--ghost" onClick={ctx.close}>
          Cancel
        </button>
        <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={ctx.goNext}>
          Looks good — Import Now
        </button>
      </div>
    </div>
  );
}

// ── Import confirm step ───────────────────────────────────────────────────────

function ImportConfirmStep({ ctx }: { ctx: StepContext }) {
  return (
    <div>
      <p style="margin:0 0 16px;color:var(--admin-text)">
        This will create or update services in the catalog from the XLSX workbook.
        Existing services matched by slug will be updated. New services will be inserted.
      </p>
      <ul style="margin:0 0 20px;padding-left:20px;font-size:13px;color:var(--admin-text-muted);line-height:1.8">
        <li>No data is deleted</li>
        <li>Existing posts are updated, not replaced</li>
        <li>Run a Dry Run first to preview what will be imported</li>
      </ul>
      <div class="cz-action-shell__footer">
        <button type="button" class="cz-admin-btn cz-admin-btn--ghost" onClick={ctx.close}>
          Cancel
        </button>
        <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={ctx.goNext}>
          Confirm Import
        </button>
      </div>
    </div>
  );
}

// ── Import run + result step ──────────────────────────────────────────────────

interface ImportResult {
  success: boolean;
  message: string;
  inserted?: number;
  updated?: number;
  skipped?: number;
  invalid?: number;
  errors?: string[];
}

function ImportRunStep({ ctx }: { ctx: StepContext }) {
  useEffect(() => {
    ctx.setProgress('loading', 'Importing…');
    apiClient
      .post<ImportResult>('cost-builder/import-catalog', {})
      .then((result) => {
        ctx.setStepData('importResult', result);
        ctx.setProgress(result.success ? 'success' : 'error', result.message);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Import failed.';
        ctx.setProgress('error', msg);
      });
  }, []);

  if (ctx.progress === 'loading') {
    return (
      <div class="cz-action-progress">
        <Spinner label="Importing services…" />
        <p class="cz-action-progress__message">Please wait. Do not close this panel.</p>
      </div>
    );
  }

  const result    = ctx.stepData.importResult as ImportResult | undefined;
  const hasErrors = (result?.errors?.length ?? 0) > 0;

  return (
    <div>
      <div class={`cz-action-progress cz-action-progress--${ctx.progress}`}>
        <span class="cz-action-progress__icon">{ctx.progress === 'success' ? '✓' : '✕'}</span>
        <p class="cz-action-progress__message">{ctx.message}</p>
      </div>

      {result && (
        <div class="cz-import-result">
          <div class="cz-import-result-item cz-import-result-item--inserted">
            <span class="cz-import-result-item__value">{result.inserted ?? 0}</span>
            <span class="cz-import-result-item__label">Inserted</span>
          </div>
          <div class="cz-import-result-item cz-import-result-item--updated">
            <span class="cz-import-result-item__value">{result.updated ?? 0}</span>
            <span class="cz-import-result-item__label">Updated</span>
          </div>
          <div class="cz-import-result-item cz-import-result-item--skipped">
            <span class="cz-import-result-item__value">{result.skipped ?? 0}</span>
            <span class="cz-import-result-item__label">Skipped</span>
          </div>
          <div class="cz-import-result-item cz-import-result-item--invalid">
            <span class="cz-import-result-item__value">{result.invalid ?? 0}</span>
            <span class="cz-import-result-item__label">Invalid</span>
          </div>
        </div>
      )}

      {hasErrors && result?.errors && (
        <div style="margin-bottom:16px">
          <p style="font-size:12px;font-weight:600;color:var(--admin-error);margin:0 0 6px">Errors:</p>
          <ul style="margin:0;padding-left:16px;font-size:12px;color:var(--admin-text-muted)">
            {result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      <div style="display:flex;justify-content:flex-end">
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--primary"
          onClick={ctx.goNext}
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIER_LABELS: Record<string, string> = {
  basic: 'Basic', standard: 'Standard', premium: 'Premium', enterprise: 'Enterprise',
};

function fmtPrice(v: number | null | undefined): string {
  if (v == null) return '—';
  return `$${v.toLocaleString()}`;
}

// ── Main workstation ──────────────────────────────────────────────────────────

export function ServiceCatalogWorkstation({ refreshKey, openAction }: Props) {
  const { data, loading, error, refetch } = useCostBuilder();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey]);

  // Auto-select first category when data loads
  useEffect(() => {
    const resp = data as CostBuilderResponse | null;
    if (resp && activeCategory === null && resp.categories.length > 0) {
      setActiveCategory(resp.categories[0].slug);
    }
  }, [data]);

  const handleDryRun = () => {
    openAction({
      id: 'dry-run',
      mode: 'drawer',
      title: 'Dry Run — Catalog Preview',
      confirmClose: true,
      steps: [
        { id: 'preview', title: 'Parse Preview', component: DryRunStep },
        { id: 'import',  title: 'Import',        component: ImportRunStep },
      ],
      onComplete: () => refetch(),
    });
  };

  const handleImport = () => {
    openAction({
      id: 'import',
      mode: 'modal',
      title: 'Import Service Catalog',
      confirmClose: true,
      steps: [
        { id: 'confirm', title: 'Confirm',   component: ImportConfirmStep },
        { id: 'run',     title: 'Importing', component: ImportRunStep     },
      ],
      onComplete: () => refetch(),
    });
  };

  if (loading) {
    return (
      <div class="cz-admin-loading">
        <Spinner label="Loading catalog…" />
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

  const resp          = data as CostBuilderResponse | null;
  const allServices   = resp?.services_by_category.flatMap((g) => g.services) ?? [];
  const totalServices = allServices.length;

  const activeGroup = resp?.services_by_category.find((g) => g.category_slug === activeCategory)
    ?? resp?.services_by_category[0];
  const services: ServiceItem[] = activeGroup?.services ?? [];

  return (
    <div>
      <div class="cz-ws-header">
        <div>
          <h2 class="cz-ws-title">Service Catalog</h2>
          <p class="cz-ws-subtitle">
            {totalServices} service{totalServices !== 1 ? 's' : ''} across {resp?.categories.length ?? 0} categories
            — canonical Service Core records. Prices shown are imported reference values;
            tier presentation is managed in Surface Packages.
          </p>
        </div>
        <div class="cz-ws-actions">
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={handleDryRun}>
            Dry Run Preview
          </button>
          <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={handleImport}>
            Import Catalog
          </button>
        </div>
      </div>

      {totalServices === 0 ? (
        <div class="cz-admin-empty">
          <p>No services in catalog. Use <strong>Import Catalog</strong> to load from XLSX.</p>
        </div>
      ) : (
        <>
          {/* ── Category tabs ── */}
          <div class="cz-pricing-category-tabs">
            {(resp?.categories ?? []).map((cat) => (
              <button
                key={cat.slug}
                type="button"
                class={`cz-pricing-tab${activeCategory === cat.slug ? ' cz-pricing-tab--active' : ''}`}
                onClick={() => setActiveCategory(cat.slug)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* ── Service table ── */}
          {services.length === 0 ? (
            <div class="cz-admin-empty">
              <p>No services in this category yet.</p>
            </div>
          ) : (
            <div class="cz-ws-card" style="padding:0;overflow:hidden">
              <div class="cz-sc-table-wrap">
                <table class="cz-sc-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Cycle</th>
                      <th style="text-align:right">Basic</th>
                      <th style="text-align:right">Standard</th>
                      <th style="text-align:right">Premium</th>
                      <th style="text-align:right">Enterprise</th>
                      <th style="text-align:center">Popular</th>
                      <th style="text-align:center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((service) => {
                      const tiers      = service.pricing?.tiers;
                      const popularTier = service.meta?.popular_tier ?? null;
                      const isActive   = service.meta?.is_active !== false;
                      return (
                        <tr key={service.id}>
                          <td class="cz-sc-table__name">{service.title}</td>
                          <td style="color:var(--admin-text-muted);font-size:12px">
                            {service.meta?.billing_cycle ?? '—'}
                          </td>
                          <td class="cz-sc-table__price">
                            <span class={`cz-price-tag${tiers?.basic?.price != null ? ' cz-price-tag--has-price' : ''}`}>
                              {fmtPrice(tiers?.basic?.price)}
                            </span>
                          </td>
                          <td class="cz-sc-table__price">
                            <span class={`cz-price-tag${tiers?.standard?.price != null ? ' cz-price-tag--has-price' : ''}`}>
                              {fmtPrice(tiers?.standard?.price)}
                            </span>
                          </td>
                          <td class="cz-sc-table__price">
                            <span class={`cz-price-tag${tiers?.premium?.price != null ? ' cz-price-tag--has-price' : ''}`}>
                              {fmtPrice(tiers?.premium?.price)}
                            </span>
                          </td>
                          <td class="cz-sc-table__price">
                            <span class={`cz-price-tag${tiers?.enterprise?.price != null ? ' cz-price-tag--has-price' : ''}`}>
                              {fmtPrice(tiers?.enterprise?.price)}
                            </span>
                          </td>
                          <td style="text-align:center">
                            {popularTier ? (
                              <span class="cz-tier-badge cz-tier-badge--popular">
                                {TIER_LABELS[popularTier] ?? popularTier}
                              </span>
                            ) : (
                              <span style="color:var(--admin-text-faint);font-size:12px">—</span>
                            )}
                          </td>
                          <td style="text-align:center">
                            <span class={`cz-status-pill cz-status-pill--${isActive ? 'active' : 'inactive'}`}>
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
