// Contract: the shared API client's (resources/ts/api/client.ts) bounded
// request timeout — the fix for the "permanently stuck in Saving…" defect.
//
// A genuinely stalled request (dropped connection, crashed worker, a backend
// that finished writing but never flushed a response) must not leave a
// caller's `saving` state — and therefore a mounted drawer — locked forever.
// This proves the client itself:
//   1. resolves a normal request without aborting it;
//   2. aborts a request that never settles, once its timeout elapses;
//   3. throws a distinguishable ApiTimeoutError with an UNCERTAIN-outcome
//      message (never a definite "failed" claim);
//   4. always clears its internal timer, on both success and failure, so no
//      timer is ever leaked.
//
// The 30s production timeout is not shortened for this test: a selective fake
// timer intercepts ONLY the client's own setTimeout(fn, 30000) call and lets
// the test fire it deterministically, exactly like
// scripts/tier-publish-timeout-regression.mjs does for the mounted drawer.
//
// Usage: npm run contract:api-client-timeout
//    or: npx tsx scripts/api-client-timeout-contract.ts

const REQUEST_TIMEOUT_MS = 30_000; // must match resources/ts/api/client.ts

const realSetTimeout = globalThis.setTimeout.bind(globalThis);
const realClearTimeout = globalThis.clearTimeout.bind(globalThis);
let pendingFn: (() => void) | null = null;
let pendingId: number | null = null;
let clearedIds: number[] = [];
let fakeIdSeq = -1;

globalThis.setTimeout = ((fn: () => void, ms?: number, ...args: unknown[]) => {
  if (ms === REQUEST_TIMEOUT_MS) {
    pendingFn = fn;
    pendingId = fakeIdSeq;
    fakeIdSeq -= 1;
    return pendingId as unknown as ReturnType<typeof setTimeout>;
  }
  return realSetTimeout(fn as any, ms, ...args);
}) as typeof setTimeout;

globalThis.clearTimeout = ((id?: Parameters<typeof clearTimeout>[0]) => {
  if (id === pendingId) {
    clearedIds.push(id as number);
    pendingFn = null;
    pendingId = null;
    return;
  }
  return realClearTimeout(id as any);
}) as typeof clearTimeout;

function fireRequestTimeout(): void {
  if (!pendingFn) throw new Error('No request-timeout timer is currently pending.');
  const fn = pendingFn;
  pendingFn = null;
  pendingId = null;
  fn();
}

(globalThis as any).window = { CompuZignConfig: { apiRoot: 'https://cz-test.local/wp-json/', nonce: 'test-nonce' } };

function jsonResponse(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body), text: () => Promise.resolve(JSON.stringify(body)) } as Response);
}

const failures: string[] = [];
function check(label: string, cond: unknown, detail?: unknown): void {
  if (cond) { console.log(`  ok — ${label}`); }
  else { console.error(`  FAIL — ${label}${detail !== undefined ? `: ${JSON.stringify(detail)}` : ''}`); failures.push(label); }
}

async function main(): Promise<void> {
  // Imported dynamically, after the window shim and fake timer are in place —
  // client.ts reads window.CompuZignConfig lazily (per call), but keeping
  // setup strictly before the module executes avoids relying on that.
  const { apiClient, ApiTimeoutError } = await import('../resources/ts/api/client');

  // ── TEST 1 — a normal request completes without being aborted, and clears
  //    its timer. ──────────────────────────────────────────────────────────
  console.log('1) A normal request completes without being aborted');
  {
    clearedIds = [];
    (globalThis as any).fetch = (_url: unknown, _init: unknown) => jsonResponse({ ok: true });
    const result = await apiClient.get<{ ok: boolean }>('x');
    check('the request resolves normally', result.ok === true);
    check('its timer was cleared after completion', clearedIds.length === 1);
    check('no request-timeout timer is left pending', pendingFn === null);
  }

  // ── TEST 2/3 — a stalled request aborts once the timeout fires, and throws
  //    a distinguishable, UNCERTAIN-outcome error (never a definite failure). ─
  console.log('\n2) A stalled request aborts after the configured timeout, with an uncertain-outcome message');
  {
    clearedIds = [];
    (globalThis as any).fetch = (_url: unknown, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')));
    });

    const pending = apiClient.get<{ ok: boolean }>('y');
    check('a request-timeout timer is scheduled while the request is outstanding', pendingFn !== null);

    fireRequestTimeout();

    let caught: unknown = null;
    try {
      await pending;
    } catch (error) {
      caught = error;
    }
    check('the stalled request throws', caught !== null);
    check('the thrown error is a distinguishable ApiTimeoutError', caught instanceof ApiTimeoutError);
    const message = caught instanceof Error ? caught.message : '';
    check('the message reports an uncertain outcome, not a definite failure', message.includes('did not complete in time') && message.includes('may have been saved') && message.toLowerCase().includes('refresh'), message);
    check('the message never claims the operation definitely failed', !message.toLowerCase().includes('failed'), message);
  }

  // ── TEST 4 — the timer is cleared on both success and failure; a genuine
  //    (non-timeout) request failure is unaffected and still distinguishable
  //    from a timeout. ────────────────────────────────────────────────────
  console.log('\n3) The request timer is cleared after a genuine (non-timeout) failure too');
  {
    clearedIds = [];
    (globalThis as any).fetch = (_url: unknown, _init: unknown) => Promise.resolve({
      ok: false, status: 500, statusText: 'Server Error',
      text: () => Promise.resolve('boom'),
    } as Response);

    let caught: unknown = null;
    try {
      await apiClient.get('z');
    } catch (error) {
      caught = error;
    }
    check('a genuine API failure still throws', caught !== null);
    check('a genuine API failure is NOT reported as an ApiTimeoutError', !(caught instanceof ApiTimeoutError));
    check('its timer was still cleared', clearedIds.length === 1);
    check('no request-timeout timer is left pending', pendingFn === null);
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll checks passed — the shared client bounds every request, distinguishes a timeout from a definite failure, and never leaks its timer.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
