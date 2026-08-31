// Contract: CRM-1C's Admin Request print isolation — proves the print
// window/document mechanics (openIsolatedPrintDocument.ts) load only the
// specific proposal stylesheets into a SEPARATE window, never the Admin
// Station page's own document, and that popup-blocked/missing-config are
// handled without throwing. Exercised directly against `happy-dom`, the
// same convention scripts/quote-view-print-portal-contract.ts already uses
// for installPrintPortal() — this repo's contract scripts don't render
// Preact, so this test covers the pure-DOM half of printRequestProposal.tsx
// (the Preact-rendering half is a thin, untested-here wrapper around it).
//
// Usage: npm run contract:request-print-isolation
//    or: npx tsx scripts/request-print-isolation-contract.ts

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Window } from 'happy-dom';

const failures: string[] = [];
function check(label: string, cond: unknown, detail?: unknown): void {
  if (cond) { console.log(`  ok — ${label}`); }
  else { console.error(`  FAIL — ${label}${detail !== undefined ? `: ${JSON.stringify(detail)}` : ''}`); failures.push(label); }
}

async function main(): Promise<void> {
  const { openIsolatedPrintDocument, stylesheetHrefsFor, waitForStylesheets } = await import('../resources/ts/admin-station/stations/requests/openIsolatedPrintDocument');

  const config = { distUrl: 'https://cz-test.local/wp-content/plugins/compuzign-platform/dist/', atomicEngineUrl: 'https://cz-test.local/wp-content/plugins/compuzign-platform/atomic-engine/' };

  // ── 1) Stylesheet URLs are built from config, not hardcoded ────────────
  console.log('1) stylesheetHrefsFor() builds every URL from the given config');
  {
    const hrefs = stylesheetHrefsFor(config);
    check('exactly 4 stylesheets', hrefs.length === 4);
    check('includes the token stylesheet', hrefs.includes(`${config.atomicEngineUrl}css/00-tokens.css`));
    check('includes reset/base', hrefs.includes(`${config.atomicEngineUrl}css/01-reset.css`) && hrefs.includes(`${config.atomicEngineUrl}css/02-base.css`));
    check('includes the compiled cost-builder stylesheet carrying .cz-proposal', hrefs.includes(`${config.distUrl}css/cost-builder.css`));
    check('never includes the admin-station stylesheet', !hrefs.some((h) => h.includes('admin-station.css')));
  }

  // ── 2) A separate isolated window/document is opened and populated —
  //      the PARENT document is never touched. ───────────────────────────
  console.log('\n2) opens an isolated window; the parent Admin Station document is untouched');
  {
    const parentWin = new Window({ url: 'https://cz-test.local/admin-station/' });
    const parentDoc = parentWin.document as unknown as Document;
    parentDoc.head.innerHTML = '<link rel="stylesheet" href="/dist/css/admin-station.css">';

    const popupWin = new Window({ url: 'about:blank' });
    let openCallArgs: unknown[] = [];
    const fakeOpen = (...args: unknown[]): Window => { openCallArgs = args; return popupWin as unknown as Window; };

    const result = openIsolatedPrintDocument(config, 'CZ-PRINT001', { open: fakeOpen as Window['open'] });
    check('open succeeds', result.ok === true);
    if (result.ok) {
      const printDoc = result.printWindow.document;
      check('the print window gets its own #cz-print-root mount', printDoc.getElementById('cz-print-root') !== null);
      check('the print window body carries cz-printing (matches cost-builder.css\'s print selector)', printDoc.body.classList.contains('cz-printing'));
      check('exactly 4 <link rel=stylesheet> were added to the ISOLATED window only', printDoc.querySelectorAll('link[rel="stylesheet"]').length === 4);
      check('the print window title is set from the Request ref', printDoc.title === 'CZ-PRINT001');

      const hrefsOnPrintWindow = [...printDoc.querySelectorAll('link[rel="stylesheet"]')].map((l) => (l as HTMLLinkElement).href);
      check('every stylesheet on the print window is one of the expected 4', hrefsOnPrintWindow.every((h) => stylesheetHrefsFor(config).some((expected) => h.includes(expected))), hrefsOnPrintWindow);

      // CRM-1C audit correction: the window-feature string must never
      // request noopener/noreferrer — per spec that forces window.open()
      // to return null even on a genuine success, which is exactly the
      // false "popup blocked" this correction removes. And the handle
      // window.open() DID return must be the one actually used/returned —
      // proven above (mount/links/title all read through result.printWindow) —
      // with its own `.opener` severed instead, so the reverse reference is
      // cut without losing our usable handle.
      const featureString = String(openCallArgs[2] ?? '');
      check('window.open() feature string requests neither noopener nor noreferrer', !/noopener|noreferrer/.test(featureString), featureString);
      check('the returned handle has its own opener severed (defense-in-depth, without losing the usable handle)', result.printWindow.opener === null);
    }

    // The critical isolation proof: the PARENT document (standing in for
    // the Admin Station page) still has exactly the one stylesheet link it
    // started with — nothing from openIsolatedPrintDocument() touched it.
    check(
      'the parent Admin Station document keeps exactly its original 1 stylesheet — no atomic-engine/cost-builder link was added to it',
      parentDoc.querySelectorAll('link[rel="stylesheet"]').length === 1,
    );
    check('the parent document was never given a #cz-print-root', parentDoc.getElementById('cz-print-root') === null);
  }

  // ── 3) Popup-blocked and missing-config both fail closed, no throw ─────
  console.log('\n3) popup-blocked and missing-config fail closed without throwing');
  {
    const blocked = openIsolatedPrintDocument(config, 'CZ-PRINT002', { open: () => null });
    check('a null window.open() result reports popup-blocked', !blocked.ok && blocked.reason === 'popup-blocked');

    const missingDist = openIsolatedPrintDocument({ atomicEngineUrl: config.atomicEngineUrl }, 'CZ-PRINT003', { open: () => new Window() as unknown as Window });
    check('a missing distUrl reports config-missing', !missingDist.ok && missingDist.reason === 'config-missing');

    const missingAtomic = openIsolatedPrintDocument({ distUrl: config.distUrl }, 'CZ-PRINT004', { open: () => new Window() as unknown as Window });
    check('a missing atomicEngineUrl reports config-missing', !missingAtomic.ok && missingAtomic.reason === 'config-missing');

    const undefinedConfig = openIsolatedPrintDocument(undefined, 'CZ-PRINT005', { open: () => new Window() as unknown as Window });
    check('an entirely absent config reports config-missing', !undefinedConfig.ok && undefinedConfig.reason === 'config-missing');
  }

  // ── 4) CRM-1C audit correction: stylesheet waiting is bounded/race-safe ─
  console.log('\n4) waitForStylesheets() cannot hang forever and settles promptly once loaded');
  {
    const win = new Window({ url: 'https://cz-test.local/admin-station/' });
    const doc = win.document as unknown as Document;

    // A link neither 'load' nor 'error' ever fires on (the scenario that
    // made the pre-fix version await forever) must still settle, bounded
    // by the timeout fallback rather than by any stylesheet event.
    const stuckLink = doc.createElement('link') as HTMLLinkElement;
    const stuckStart = Date.now();
    await waitForStylesheets([stuckLink], 60);
    const stuckElapsed = Date.now() - stuckStart;
    check('a link that never fires load/error still resolves, via the bounded timeout', stuckElapsed < 1000, `${stuckElapsed}ms`);

    // A link that does fire 'load' must resolve on that event, not sit
    // waiting out the full timeout window.
    const loadingLink = doc.createElement('link') as HTMLLinkElement;
    const loadStart = Date.now();
    const loadPromise = waitForStylesheets([loadingLink], 5000);
    loadingLink.dispatchEvent(new win.Event('load'));
    await loadPromise;
    const loadElapsed = Date.now() - loadStart;
    check('a link that fires load resolves promptly, well before the timeout fallback', loadElapsed < 1000, `${loadElapsed}ms`);
  }

  // ── 5) Source-level proof: no live API/secret access, snapshot only ────
  console.log('\n5) printRequestProposal.tsx touches no live API, catalog, or customer secret');
  {
    const root = resolve(import.meta.dirname, '..');
    const printSource = readFileSync(resolve(root, 'resources/ts/admin-station/stations/requests/printRequestProposal.tsx'), 'utf8');
    const isolatedDocSource = readFileSync(resolve(root, 'resources/ts/admin-station/stations/requests/openIsolatedPrintDocument.ts'), 'utf8');

    // Strip // comments before scanning for code-level secret handling — the
    // file's own explanatory comments legitimately say "no ... secret" in
    // prose, which must not itself trip this check.
    const printSourceNoComments = printSource.replace(/\/\/.*$/gm, '');
    check('printRequestProposal.tsx never imports an API endpoint function', !/from ['"]@\/api\/endpoints/.test(printSource));
    check('printRequestProposal.tsx has no code-level reference to a view/quote secret', !/secret/i.test(printSourceNoComments), printSourceNoComments);
    check('printRequestProposal.tsx renders from its `request` parameter only, not a re-fetch', printSource.includes('request.items') && printSource.includes('request.quote_ref'));
    check('openIsolatedPrintDocument.ts never imports Preact (stays plain-DOM, contract-testable without rendering)', !/from ['"]preact/.test(isolatedDocSource));
    check(
      'waitForStylesheets() recognizes an already-loaded stylesheet up front, not only future load/error events',
      isolatedDocSource.includes('link.sheet'),
    );
    check(
      'waitForStylesheets() races every listener against a timeout so a missed/never-fired event cannot hang it',
      /setTimeout/.test(isolatedDocSource) && /clearTimeout/.test(isolatedDocSource),
    );
    check(
      "CRM-1C audit correction: source never requests noopener/noreferrer on window.open() — that forces a null return even on success",
      !/win\.open\([^)]*noopener/.test(isolatedDocSource) && !/win\.open\([^)]*noreferrer/.test(isolatedDocSource),
    );
    check(
      "CRM-1C audit correction: the print window's own .opener is explicitly severed once a real handle exists",
      isolatedDocSource.includes('.opener = null'),
    );
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll checks passed — Request print opens a genuinely isolated window, loads only the 4 expected stylesheets there, leaves the parent Admin Station document untouched, fails closed on popup-block/missing-config, waits for stylesheets on a bounded/race-safe timeout, and never re-fetches live data or a customer secret.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
