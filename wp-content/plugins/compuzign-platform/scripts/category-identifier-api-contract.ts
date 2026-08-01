// Category TypeScript transport contract: backend `platform_id` is mapped once
// at the endpoint boundary and never appears in writable application payloads.

(globalThis as unknown as { window: Record<string, unknown> }).window = {
  CompuZignConfig: {
    apiRoot: 'https://cz-test.local/wp-json/',
    nonce: 'test-nonce',
  },
};

const PLATFORM_ID = 'CZC2A7KZ';
const requests: Array<{ method: string; path: string; body: Record<string, unknown> }> = [];

const stationCategory = () => ({
  id: 7,
  platform_id: PLATFORM_ID,
  name: 'Networking',
  slug: 'networking',
  description: 'Network services.',
  platform_status: 'disabled',
  previous_platform_status: '',
  module_status: { overview: 'pending' },
  has_draft: true,
  assigned_count: 0,
});

globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
  const path = String(url);
  const method = (init?.method ?? 'GET').toUpperCase();
  const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
  requests.push({ method, path, body });

  let response: unknown;
  if (method === 'GET' && path.endsWith('/admin/categories')) {
    response = { categories: [stationCategory()] };
  } else if (method === 'POST' && path.endsWith('/admin/categories')) {
    response = { success: true, category: stationCategory() };
  } else if (method === 'PATCH' && path.endsWith('/admin/categories/7/status')) {
    response = { success: true, category: stationCategory() };
  } else if (method === 'DELETE' && path.endsWith('/admin/categories/7')) {
    response = { success: true, deleted: 7, platform_id: PLATFORM_ID };
  } else if (method === 'POST' && path.endsWith('/admin/service-categories')) {
    response = {
      success: true,
      existing: false,
      category: { id: 7, platform_id: PLATFORM_ID, name: 'Networking', slug: 'networking', description: '' },
    };
  } else if (method === 'POST' && path.endsWith('/admin/service-categories/7')) {
    response = {
      success: true,
      category: { id: 7, platform_id: PLATFORM_ID, name: 'Networking', slug: 'networking', description: 'Updated.' },
    };
  } else {
    throw new Error(`Unexpected Category API contract request: ${method} ${path}`);
  }

  return {
    ok: true,
    status: 200,
    json: async () => response,
    text: async () => JSON.stringify(response),
  } as Response;
}) as typeof fetch;

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Category identifier API contract: ${message}`);
  console.log(`  ok — ${message}`);
}

async function main(): Promise<void> {
  const {
    createCategory,
    createServiceCategory,
    fetchAdminCategories,
    permanentDeleteCategory,
    updateCategoryStatus,
    updateServiceCategory,
  } = await import('../resources/ts/api/endpoints/admin');

  console.log('Category identifier TypeScript API contract\n');

  const list = await fetchAdminCategories();
  check(list.categories[0].platformId === PLATFORM_ID, 'list maps platform_id to platformId');
  check(!('platform_id' in list.categories[0]), 'list exposes no snake-case identity to application state');

  const created = await createCategory({ name: 'Networking', description: 'Network services.' });
  check(created.category.platformId === PLATFORM_ID, 'Station creation maps permanent identity');

  const status = await updateCategoryStatus(7, 'disabled');
  check(status.category.platformId === PLATFORM_ID, 'lifecycle mutation maps and preserves permanent identity');

  const inline = await createServiceCategory({ name: 'Networking' });
  check(inline.category?.platformId === PLATFORM_ID, 'inline creation maps permanent identity');

  const inlineUpdate = await updateServiceCategory(7, { description: 'Updated.' });
  check(inlineUpdate.category?.platformId === PLATFORM_ID, 'inline update maps permanent identity');

  const deleted = await permanentDeleteCategory(7);
  check(deleted.platformId === PLATFORM_ID, 'permanent deletion maps tombstoned identity');

  check(
    requests.every(({ body }) => !('platform_id' in body) && !('platformId' in body) && !('cz_platform_id' in body)),
    'writable Category requests carry no Platform identity field',
  );

  console.log('\nAll Category identifier TypeScript API checks passed.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
