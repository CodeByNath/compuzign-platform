interface CompuZignConfig {
  apiRoot: string;
  nonce: string;
  contactUrl?: string;
  costBuilderUrl?: string;
}

interface CompuZignAdminConfig {
  restUrl: string;
  nonce: string;
}

declare global {
  interface Window {
    CompuZignConfig?: CompuZignConfig;
    CompuZignAdmin?: CompuZignAdminConfig;
  }
}

function getConfig(): CompuZignConfig {
  const config = window.CompuZignConfig;
  if (!config) {
    throw new Error(
      'CompuZignConfig is not defined. Ensure AssetLoader.php calls wp_localize_script for compuzign-cost-builder.',
    );
  }
  return config;
}

async function request<T>(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<T> {
  const { apiRoot, nonce } = getConfig();
  const url = apiRoot.replace(/\/$/, '') + '/' + path.replace(/^\//, '');

  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-WP-Nonce': nonce,
      ...extraHeaders,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${method} ${path} → ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string): Promise<T> => request<T>('GET', path),
  post: <T>(path: string, body?: unknown): Promise<T> => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown): Promise<T> => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown): Promise<T> => request<T>('PATCH', path, body),
  delete: <T>(path: string): Promise<T> => request<T>('DELETE', path),
  // PUT/PATCH serve the Category station family, and some hosts (confirmed:
  // Hostinger) mishandle those verbs on their way back — the write lands, but
  // the response the browser gets back is broken, so the drawer never learns
  // the mutation actually succeeded. WP REST honours a same-origin POST
  // carrying X-HTTP-Method-Override, dispatching to the exact same PATCH/PUT
  // route handler, so this reaches identical backend behaviour over a plain
  // POST on the wire. Category's PATCH-registered writes go through this;
  // other stations (Service, Package Family, Tier) use their own verbs and
  // are unaffected.
  postAsPatch: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>('POST', path, body, { 'X-HTTP-Method-Override': 'PATCH' }),
};
