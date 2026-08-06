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

// Bounded so a genuinely stalled request (dropped connection, crashed worker,
// backend that finished writing but never flushed a response) cannot leave a
// caller's `saving` state — and therefore a mounted drawer — locked forever.
// Long enough not to interrupt legitimate saves. One place to change.
const REQUEST_TIMEOUT_MS = 30_000;

// Distinguishable from an ordinary request failure: the backend's outcome is
// unknown, not "failed" — it may have already persisted. Callers that want to
// avoid a misleading definite-failure message can check `instanceof`.
export class ApiTimeoutError extends Error {
  constructor() {
    super('The request did not complete in time. The change may have been saved. Refresh and check the current state before trying again.');
    this.name = 'ApiTimeoutError';
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const { apiRoot, nonce } = getConfig();
  const url = apiRoot.replace(/\/$/, '') + '/' + path.replace(/^\//, '');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': nonce,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiTimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${method} ${path} → ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string): Promise<T> => request<T>('GET', path),
  post: <T>(path: string, body?: unknown): Promise<T> => request<T>('POST', path, body),
  // PUT/PATCH serve the Category station family. Some hosts block these verbs;
  // if Hostinger rejects them, switch these two to POST + an
  // 'X-HTTP-Method-Override' header here (WP REST honours the override) —
  // one-place change, no fetcher edits.
  put: <T>(path: string, body?: unknown): Promise<T> => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown): Promise<T> => request<T>('PATCH', path, body),
  delete: <T>(path: string): Promise<T> => request<T>('DELETE', path),
};
