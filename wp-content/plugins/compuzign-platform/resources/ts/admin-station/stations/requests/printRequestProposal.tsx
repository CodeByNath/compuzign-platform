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

import { render } from 'preact';
import { QuoteProposalPreview } from '@/components/request-flow/QuoteProposalPreview';
import { toCartItems } from './requestLineToCartItem';
import { openIsolatedPrintDocument, waitForStylesheets } from './openIsolatedPrintDocument';
import type { RequestEntry } from '@/api/types/admin';

function formatSubmittedDate(mysqlDateTime: string): string {
  const parsed = new Date(mysqlDateTime.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return mysqlDateTime;
  return parsed.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export type PrintRequestProposalResult = 'printed' | 'popup-blocked' | 'config-missing';

export async function printRequestProposal(
  request: RequestEntry,
  win: Pick<Window, 'open'> = window,
): Promise<PrintRequestProposalResult> {
  const opened = openIsolatedPrintDocument(window.CompuZignConfig, request.quote_ref, win);
  if (!opened.ok) {
    return opened.reason;
  }

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

  return 'printed';
}
