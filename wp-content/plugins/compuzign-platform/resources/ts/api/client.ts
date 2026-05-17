interface CompuZignConfig {
  apiRoot: string;
  nonce: string;
}

declare global {
  interface Window {
    CompuZignConfig?: CompuZignConfig;
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

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const { apiRoot, nonce } = getConfig();
  const url = apiRoot.replace(/\/$/, '') + '/' + path.replace(/^\//, '');

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-WP-Nonce': nonce,
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
};
