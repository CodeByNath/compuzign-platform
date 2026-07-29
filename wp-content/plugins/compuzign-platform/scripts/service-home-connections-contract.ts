// Contract: Service Home's Connections lane shows Categories connected to the
// full Service Catalogue — not every registered Category.
//
// This is a pure-function contract, not a rendered one: projectServiceHomeConnectionRows
// is a stateless projection over the SAME authoritative Category list the
// Admin-owned category carousel already reads, so it can be exercised directly
// against representative fixtures without a DOM.

import { projectServiceHomeConnectionRows } from '../resources/ts/service-station/surface/serviceHomeConnections';
import type { CategoryStationItem } from '../resources/ts/api/types/admin';

let checks = 0;
function check(condition: unknown, message: string): asserts condition {
  checks += 1;
  if (!condition) throw new Error(`Service Home Connections contract: ${message}`);
}

function category(overrides: Partial<CategoryStationItem>): CategoryStationItem {
  return {
    id: 1,
    name: 'Category',
    slug: 'category',
    description: '',
    platform_status: 'active',
    previous_platform_status: '',
    module_status: { overview: 'settled' },
    has_draft: false,
    assigned_count: 0,
    group_id: null,
    ...overrides,
  };
}

// ── Categories with at least one connected Service appear ─────────────────────

const connected = category({ id: 10, name: 'Connected Active', assigned_count: 3, platform_status: 'active' });
const connectedDisabled = category({ id: 11, name: 'Connected Disabled', assigned_count: 1, platform_status: 'disabled' });
const unused = category({ id: 12, name: 'Unused', assigned_count: 0, platform_status: 'active' });

const rows = projectServiceHomeConnectionRows([connected, connectedDisabled, unused]);

check(rows.length === 2, `expected 2 connected rows, got ${rows.length}`);
check(rows.every((row) => row.connectedCount > 0), 'every rendered row has at least one connected Service');
check(!rows.some((row) => row.id === unused.id), 'a Category with zero connected Services does not appear in Connections');

// ── Row shape carries identity, count, and status — nothing invented ──────────

const connectedRow = rows.find((row) => row.id === connected.id);
check(connectedRow != null, 'the connected Category projects a row');
check(connectedRow!.name === connected.name, 'row name matches the authoritative Category name');
check(connectedRow!.connectedCount === connected.assigned_count, 'row count matches the authoritative assigned_count — nothing re-derived');
check(connectedRow!.status === connected.platform_status, 'row status matches the authoritative platform_status');

const disabledRow = rows.find((row) => row.id === connectedDisabled.id);
check(disabledRow != null && disabledRow.status === 'disabled', 'a disabled connected Category still appears, carrying its real status');

// ── Empty input projects no rows, not an error ─────────────────────────────────

check(projectServiceHomeConnectionRows([]).length === 0, 'no Categories in means no rows out');

console.log(`Service Home Connections contract passed: ${checks} checks.`);
