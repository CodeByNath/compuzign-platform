// Contract: Phase 8J-C2's secure customer quote-view page.
//
// Covers the genuinely pure/unit-testable surface — fragment/query parsing,
// submitted-date/contact mapping, and the credential transport (proving the
// view secret reaches the API only as a header and never appears anywhere
// in the request URL). This repo has no DOM-rendering test library
// (jsdom/testing-library), so two behaviors from the work order are instead
// verified by construction/reuse and documented here rather than executed:
//   - "generic failure" (no distinction between wrong secret and
//     missing/expired quote): QuoteViewApp.tsx's `if (error || !quote)`
//     branch renders one fixed message regardless of the error's content —
//     it never inspects the error/message value, so there is no code path
//     that COULD distinguish reasons.
//   - "print path": usePrintPortal() in QuoteViewApp.tsx reuses the exact
//     #cz-print-root / cz-printing / .cz-proposal contract
//     RequestFlowModal.tsx already uses for the interactive cart flow's own
//     Print / Save as PDF — no new print CSS or portal logic was added.
//
// Usage: npm run contract:quote-view
//    or: npx tsx scripts/quote-view-contract.ts

const failures: string[] = [];
function check(label: string, cond: unknown, detail?: unknown): void {
  if (cond) { console.log(`  ok — ${label}`); }
  else { console.error(`  FAIL — ${label}${detail !== undefined ? `: ${JSON.stringify(detail)}` : ''}`); failures.push(label); }
}

(globalThis as any).window = { CompuZignConfig: { apiRoot: 'https://cz-test.local/wp-json/compuzign/v1/', nonce: 'test-nonce' } };

function jsonResponse(status: number, body: unknown) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);
}

async function main(): Promise<void> {
  const { readQuoteViewParams, formatSubmittedDate, toContact } = await import('../resources/ts/components/quote-view/QuoteViewApp');
  const { getQuoteView } = await import('../resources/ts/api/endpoints/requests');

  // ── 1) Fragment/query parsing ──────────────────────────────────────────
  console.log('1) readQuoteViewParams() reads ref from the query string and secret from the fragment only');
  {
    const { ref, secret } = readQuoteViewParams({ search: '?ref=CZ-ABC123', hash: '#deadbeef' });
    check('ref comes from the query string', ref === 'CZ-ABC123', ref);
    check('secret comes from the fragment, leading # stripped', secret === 'deadbeef', secret);
  }
  {
    const { ref, secret } = readQuoteViewParams({ search: '', hash: '' });
    check('a missing ref defaults to an empty string, never undefined/null', ref === '');
    check('a missing secret defaults to an empty string, never undefined/null', secret === '');
  }
  {
    // A secret must never be readable from the query string even if present
    // there — only the fragment is trusted as the credential channel.
    const { secret } = readQuoteViewParams({ search: '?ref=CZ-ABC123&secret=leaked-in-query', hash: '' });
    check('a secret placed in the query string is never picked up as the credential', secret === '', secret);
  }

  // ── 2) formatSubmittedDate() ────────────────────────────────────────────
  console.log('\n2) formatSubmittedDate()');
  {
    const formatted = formatSubmittedDate('2026-08-30 14:05:00');
    check('a valid MySQL datetime formats to a human date', /\d{1,2} \w+ 2026/.test(formatted), formatted);
  }
  {
    const fallback = formatSubmittedDate('not-a-real-date');
    check('an unparseable value falls back to the raw string rather than "Invalid Date"', fallback === 'not-a-real-date', fallback);
  }

  // ── 3) toContact() — notes always excluded, every other field mapped ──
  console.log('\n3) toContact() maps the read-boundary quote shape to ContactFormValues');
  {
    const contact = toContact({
      quote_ref: 'CZ-ABC123', type: 'quote_cart', contact: 'Jane Doe', company: 'Acme Co',
      email: 'jane@example.com', phone: '555-0100', submitted: '2026-08-30 00:00:00', items: [],
    });
    check('contact name maps through', contact.contact === 'Jane Doe');
    check('company maps through', contact.company === 'Acme Co');
    check('email maps through', contact.email === 'jane@example.com');
    check('phone maps through', contact.phone === '555-0100');
    check('notes is always empty — the read boundary never returns them', contact.notes === '');
  }

  // ── 4) getQuoteView() — header transport, never a query parameter ─────
  console.log('\n4) getQuoteView() sends the secret only as a header, never in the URL');
  {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;
    (globalThis as any).fetch = (url: string, init: RequestInit) => {
      capturedUrl = url;
      capturedInit = init;
      return jsonResponse(200, { success: true, quote: { quote_ref: 'CZ-ABC123', type: 'quote_cart', contact: '', company: '', email: '', phone: '', submitted: '', items: [] } });
    };

    const secret = 'super-secret-view-token';
    await getQuoteView('CZ-ABC123', secret);

    check('the request path includes the quote reference', capturedUrl.includes('requests/quote/CZ-ABC123'), capturedUrl);
    check('the secret never appears anywhere in the request URL', !capturedUrl.includes(secret), capturedUrl);
    const headers = (capturedInit?.headers ?? {}) as Record<string, string>;
    check('the secret travels as the X-Quote-View-Secret header', headers['X-Quote-View-Secret'] === secret, headers);
  }

  // ── 5) getQuoteView() — a rejected/failed fetch never leaks the secret
  //    into a thrown error's message either. ─────────────────────────────
  console.log('\n5) A failure response never carries the secret in the thrown error');
  {
    (globalThis as any).fetch = () => jsonResponse(404, { success: false, message: 'Quote not found.' });
    const secret = 'another-secret-value';
    let caught: unknown = null;
    try {
      await getQuoteView('CZ-ZZZZZZ', secret);
    } catch (error) {
      caught = error;
    }
    check('a 404 response still throws', caught !== null);
    const message = caught instanceof Error ? caught.message : String(caught);
    check('the thrown error never echoes the secret', !message.includes(secret), message);
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll checks passed — the quote-view page parses its URL correctly and the view secret never travels as a query parameter or leaks into a thrown error.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
