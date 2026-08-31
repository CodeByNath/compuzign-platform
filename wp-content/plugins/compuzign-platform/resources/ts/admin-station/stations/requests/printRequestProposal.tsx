// CRM-1C: prints the durable Request's immutable submitted snapshot using
// the exact customer proposal presentation (QuoteProposalPreview, the same
// `.cz-proposal`/`#cz-print-root` markup and print rules RequestFlowModal.tsx
// and QuoteViewApp.tsx already use) — but rendered into a genuinely isolated
// print window/document (openIsolatedPrintDocument.ts), never the Admin
// Station page itself.
//
// Why isolated: `.cz-proposal` depends on design tokens
// (--cz-color-*/--cz-space-*/--cz-font-size-*/--cz-radius-*/--cz-shadow-card)
// defined only in atomic-engine/css/00-tokens.css. Making the Admin Station
// page itself depend on that stylesheet chain (or copying its token values
// into Admin Station's own tokens) would be exactly the broad customer-
// bundle coupling / duplication the CRM-1C auditor review ruled out — see
// the CRM-1C work file. The isolated document loads only those specific
// stylesheets, scoped entirely to itself; nothing it loads ever reaches
// the Admin Station page's own DOM or styles.
//
// No live catalog/pricing re-resolution, no quote-view secret — every value
// rendered here comes straight from the already-fetched `RequestEntry`.
//
// CRM-1C audit correction (live browser failure): the false "popup
// blocked" report was NOT an async-activation issue — an `async` function
// runs synchronously up to its first `await`, and `window.open()` was
// already the first statement, before any `await`. The actual defect was
// in `openIsolatedPrintDocument.ts`'s own feature string: passing
// `noopener`/`noreferrer` makes `window.open()` return `null` PER SPEC
// even when a window is genuinely created, because the entire point of
// `noopener` is that the caller gets no handle back — see that file's own
// corrected comment. Fixed there, not here.
//
// This module keeps the open step (openRequestPrintWindow, below) as a
// genuinely plain, non-async function called directly from the click
// handler — see useRequestDrawerActions.ts's `runPrint`, the only caller —
// with every async step (Preact render, stylesheet wait, print()) in a
// separate continuation that only ever runs once the window already
// exists. Harmless and still good practice, but it was never what fixed
// the reported defect.

import { render } from 'preact';
import { QuoteProposalPreview } from '@/components/request-flow/QuoteProposalPreview';
import { toCartItems } from './requestLineToCartItem';
import { openIsolatedPrintDocument, waitForStylesheets } from './openIsolatedPrintDocument';
import type { OpenIsolatedPrintDocumentResult } from './openIsolatedPrintDocument';
import type { RequestEntry } from '@/api/types/admin';

function formatSubmittedDate(mysqlDateTime: string): string {
  const parsed = new Date(mysqlDateTime.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return mysqlDateTime;
  return parsed.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export type OpenRequestPrintWindowResult = OpenIsolatedPrintDocumentResult;

// Plain, non-async — call this directly and synchronously from the click
// handler that triggers Print, with nothing awaited beforehand. Genuine
// popup-blocking is reported only from this call's own `reason`.
export function openRequestPrintWindow(
  request: RequestEntry,
  win: Pick<Window, 'open'> = window,
): OpenRequestPrintWindowResult {
  return openIsolatedPrintDocument(window.CompuZignConfig, request.quote_ref, win);
}

// Async continuation — call only once openRequestPrintWindow() has already
// returned `ok: true`. Renders the stored snapshot into, waits for styles
// in, and prints the window that is already open.
export async function finishRequestPrint(
  opened: Extract<OpenRequestPrintWindowResult, { ok: true }>,
  request: RequestEntry,
): Promise<void> {
  const { printWindow, mount, links } = opened;

  render(
    <QuoteProposalPreview
      items={toCartItems(request.items)}
      services={[]}
      contact={{ company: request.company, contact: request.contact, email: request.email, phone: request.phone, notes: '' }}
      quoteDate={formatSubmittedDate(request.submitted)}
      quoteRef={request.quote_ref}
    />,
    mount,
  );

  await waitForStylesheets(links);

  printWindow.addEventListener('afterprint', () => printWindow.close());
  printWindow.focus();
  printWindow.print();
}
