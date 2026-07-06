// EntityTable — the table-mode renderer (Schema architecture S3b, §9/§10).
//
// Consumes a TableSchema: columns project row data, row actions declare
// intent, and behaviour arrives exclusively as handlers keyed by action id
// from the owning workstation — the schema never owns business logic
// (Boundary, §3). The inline destructive confirm is built in (one
// useInlineConfirm keyed `row::action`), replacing the per-surface copied
// confirm blocks. Renders inside the surface's AsyncSection gates; the empty
// state replaces the per-surface `cz-admin-empty` conditionals.
//
// Selection is surface state (like a drawer's open panel), owned by the
// workstation and passed as a prop — TableSchema stays pure presentation.

import type { ComponentChildren } from 'preact';
import { useInlineConfirm } from '@/hooks/useInlineConfirm';
import type { RowActionDef, TableSchema } from '@/components/admin/schema/types';

const INTENT_CLASS: Record<RowActionDef<unknown>['intent'], string> = {
  primary:   'cz-admin-btn--primary',
  secondary: 'cz-admin-btn--secondary',
  danger:    'cz-admin-btn--danger',
};

export interface EntityTableSelection<Row> {
  isSelected:  (row: Row) => boolean;
  onToggle:    (row: Row) => void;
  allSelected: boolean;
  onToggleAll: () => void;
  rowLabel:    (row: Row) => string;   // per-row checkbox aria-label
}

export interface EntityTableProps<Row> {
  schema:  TableSchema<Row>;
  rows:    Row[];
  rowKey:  (row: Row) => string | number;
  // Behaviour, keyed by action id — from the owning workstation/station hook.
  handlers?: Record<string, (row: Row) => void | Promise<void>>;
  // Table card frame: 'shell' = cz-shell-table-card (catalog/bin),
  // 'ws' = cz-ws-card + cz-sc-table-wrap (archived/trash) — kept for parity.
  frame?: 'shell' | 'ws';
  selection?: EntityTableSelection<Row>;
  onCta?: () => void;                  // empty-state CTA handler
}

export function EntityTable<Row>({ schema, rows, rowKey, handlers = {}, frame = 'shell', selection, onCta }: EntityTableProps<Row>) {
  // One confirm/busy tracker for the whole table, keyed `${rowKey}::${actionId}`.
  const confirm = useInlineConfirm<string>();

  if (rows.length === 0) {
    return (
      <div class="cz-admin-empty">
        <p>{schema.empty.message}</p>
        {schema.empty.cta && onCta && (
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={onCta}>
            {schema.empty.cta.label}
          </button>
        )}
      </div>
    );
  }

  const runAction = (action: RowActionDef<Row>, row: Row, key: string) => {
    const handler = handlers[action.id];
    if (!handler) return;
    confirm.run(`${key}::${action.id}`, async () => { await handler(row); });
  };

  const table = (
    <table class="cz-sc-table">
      <thead>
        <tr>
          {selection && (
            <th class="cz-sc-table__select">
              <input
                type="checkbox"
                aria-label="Select all"
                checked={selection.allSelected}
                onChange={selection.onToggleAll}
              />
            </th>
          )}
          {schema.columns.map((col) => (
            <th key={col.id} class={col.className} style={col.width ? `width:${col.width}` : undefined}>
              {col.label}
            </th>
          ))}
          {schema.rowActions.length > 0 && (
            <th class="cz-sc-table__actions">{schema.actionsLabel ?? 'Actions'}</th>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const key     = String(rowKey(row));
          const rowBusy = confirm.busyId?.startsWith(`${key}::`) ?? false;
          const visible = schema.rowActions.filter((a) => !a.when || a.when(row));
          const pendingAction = visible.find((a) => confirm.pendingId === `${key}::${a.id}`);
          return (
            <tr key={key}>
              {selection && (
                <td class="cz-sc-table__select">
                  <input
                    type="checkbox"
                    aria-label={selection.rowLabel(row)}
                    checked={selection.isSelected(row)}
                    onChange={() => selection.onToggle(row)}
                  />
                </td>
              )}
              {schema.columns.map((col) => (
                <td key={col.id} class={col.cellClassName ?? col.className}>
                  {col.cell(row)}
                </td>
              ))}
              {schema.rowActions.length > 0 && (
                <td class="cz-sc-table__actions">
                  {pendingAction ? (
                    <>
                      <span class="cz-sc-table__confirm-label">{pendingAction.confirm!.prompt}</span>
                      <button
                        type="button"
                        class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--sm"
                        disabled={rowBusy}
                        onClick={() => runAction(pendingAction, row, key)}
                      >
                        {rowBusy ? (pendingAction.busyLabel ?? 'Working…') : pendingAction.confirm!.confirmLabel}
                      </button>
                      <button
                        type="button"
                        class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                        disabled={rowBusy}
                        onClick={() => confirm.cancel()}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    visible.map((a) => {
                      const cls = `cz-admin-btn ${INTENT_CLASS[a.intent]}${a.icon ? ' cz-admin-btn--icon-only' : ''} cz-admin-btn--sm`;
                      const onClick = a.confirm
                        ? () => confirm.request(`${key}::${a.id}`)
                        : () => runAction(a, row, key);
                      if (a.icon) {
                        return (
                          <button key={a.id} type="button" class={cls} disabled={rowBusy} onClick={onClick} aria-label={a.label} title={a.label}>
                            {a.icon}
                          </button>
                        );
                      }
                      const busyThis = confirm.busyId === `${key}::${a.id}`;
                      return (
                        <button key={a.id} type="button" class={cls} disabled={rowBusy} onClick={onClick}>
                          {busyThis ? (a.busyLabel ?? a.label) : a.label}
                        </button>
                      );
                    })
                  )}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return frame === 'ws' ? (
    <div class="cz-ws-card" style="padding:0;overflow:hidden">
      <div class="cz-sc-table-wrap">{table}</div>
    </div>
  ) : (
    <div class="cz-shell-table-card">
      <div class="cz-shell-table-scroll">{table}</div>
    </div>
  );
}
