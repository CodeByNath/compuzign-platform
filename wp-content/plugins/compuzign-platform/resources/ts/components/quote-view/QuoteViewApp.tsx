import { useEffect, useState } from 'preact/hooks';
import { useApi } from '@/hooks/useApi';
import { Spinner } from '@/components/ui/Spinner';
import { getQuoteView } from '@/api/endpoints/requests';
import type { QuoteViewData, QuoteViewResponse } from '@/api/endpoints/requests';
import { QuoteProposalPreview } from '@/components/request-flow/QuoteProposalPreview';
import type { ContactFormValues } from '@/components/request-flow/types';

/**
 * Phase 8J-C2: the non-secret quote reference travels in the normal query
 * string (`?ref=...` — identification only, same as the printed reference
 * a customer already sees), while the bearer view secret travels ONLY in
 * the URL fragment (`#...`) — a fragment is never sent to the server or a
 * proxy, unlike a query parameter (see RequestsController's docblock for
 * why the secret is a header, never a query param, on the API side too).
 * Read once per page load; never written to local/session storage.
 *
 * Exported (not just used internally) so the focused contract
 * (scripts/quote-view-contract.ts) can verify fragment/query parsing
 * directly against fake location values — no browser/DOM needed.
 */
export function readQuoteViewParams(location: Pick<Location, 'search' | 'hash'> = window.location): { ref: string; secret: string } {
  const ref = new URLSearchParams(location.search).get('ref') ?? '';
  const secret = location.hash.replace(/^#/, '');
  return { ref, secret };
}

export function formatSubmittedDate(mysqlDateTime: string): string {
  // The stored `submitted` value is a MySQL datetime (current_time('mysql')),
  // parsed as local time — same convention QuoteCartFlow.tsx's makeDate()
  // formatting already uses for the live cart flow's own quote date.
  const parsed = new Date(mysqlDateTime.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return mysqlDateTime;
  return parsed.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function toContact(quote: QuoteViewData): ContactFormValues {
  return {
    company: quote.company,
    contact: quote.contact,
    email: quote.email,
    phone: quote.phone,
    // The stored snapshot's notes are deliberately excluded from the C1
    // read boundary response — QuoteProposalPreview never renders them.
    notes: '',
  };
}

/**
 * Reuses the exact print-portal mechanism RequestFlowModal.tsx already uses
 * for the interactive cart flow's own Print / Save as PDF (clone .cz-proposal
 * into a direct <body> child so the print stylesheet's
 * `body.cz-printing > *:not(#cz-print-root)` rule can remove every other
 * page element from print layout) — never a second renderer, never new print
 * CSS.
 *
 * Extracted as a plain DOM function (not left inline in the hook below) so
 * scripts/quote-view-contract.ts can exercise the actual clone/class-toggle
 * mechanics against a real `happy-dom` document, independent of Preact
 * rendering. Kept local to this component rather than a shared hook with
 * RequestFlowModal.tsx: it is small and self-contained, and this avoids
 * touching that unrelated, already-working modal component.
 *
 * @returns a cleanup function that removes the listeners and the print root.
 */
export function installPrintPortal(doc: Document, win: Pick<Window, 'addEventListener' | 'removeEventListener'>): () => void {
  const printRoot = doc.createElement('div');
  printRoot.id = 'cz-print-root';
  doc.body.appendChild(printRoot);

  const beforePrint = () => {
    const proposal = doc.querySelector<HTMLElement>('.cz-quote-view .cz-proposal');
    if (proposal) {
      printRoot.innerHTML = '';
      printRoot.appendChild(proposal.cloneNode(true));
    }
    doc.body.classList.add('cz-printing');
  };
  const afterPrint = () => {
    doc.body.classList.remove('cz-printing');
    printRoot.innerHTML = '';
  };
  win.addEventListener('beforeprint', beforePrint);
  win.addEventListener('afterprint', afterPrint);

  return () => {
    win.removeEventListener('beforeprint', beforePrint);
    win.removeEventListener('afterprint', afterPrint);
    doc.body.classList.remove('cz-printing');
    printRoot.remove();
  };
}

function usePrintPortal(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    return installPrintPortal(document, window);
  }, [active]);
}

export function QuoteViewApp() {
  // Lazy initializer: read the URL exactly once per mount, never re-derived
  // on re-render (the fragment is left in the address bar — see this
  // function's docblock — so re-reading it would be harmless, but a stable
  // read avoids any dependency on the URL not changing under us).
  const [{ ref, secret }] = useState(readQuoteViewParams);
  const canAttempt = ref !== '' && secret !== '';

  const { data, loading, error } = useApi<QuoteViewResponse>(() =>
    canAttempt
      ? getQuoteView(ref, secret)
      : Promise.reject(new Error('Missing quote reference or view link.')),
  );

  const quote = data?.success ? data.quote : null;
  usePrintPortal(quote !== null);

  if (loading) {
    return (
      <div class="cz-quote-view cz-quote-view--loading">
        <Spinner label="Loading your quote…" />
      </div>
    );
  }

  // Deliberately one generic message for every failure reason (missing
  // ref/secret, wrong secret, expired/missing quote) — the API boundary
  // already returns an identical response for all of them; the UI must
  // not reintroduce a distinction on top of that.
  if (error || !quote) {
    return (
      <div class="cz-quote-view cz-quote-view--error">
        <p class="cz-quote-view__error-message">
          This quote link is no longer valid or has expired. Please contact us for an updated quote.
        </p>
        <a href="mailto:hello@compuzign.com" class="cz-btn cz-btn-primary">Contact us</a>
      </div>
    );
  }

  return (
    <div class="cz-quote-view">
      <div class="cz-quote-view__actions">
        <button type="button" class="cz-btn cz-btn-secondary" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>
      <QuoteProposalPreview
        items={quote.items}
        services={[]}
        contact={toContact(quote)}
        quoteDate={formatSubmittedDate(quote.submitted)}
        quoteRef={quote.quote_ref}
      />
    </div>
  );
}
