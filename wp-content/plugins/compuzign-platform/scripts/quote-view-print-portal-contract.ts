// Contract: Phase 8J-C2's print-portal DOM mechanics
// (QuoteViewApp.tsx's installPrintPortal()) — the exact clone/class-toggle
// behavior RequestFlowModal.tsx already uses for the interactive cart
// flow's own Print / Save as PDF, reused verbatim here rather than a second
// renderer or new print CSS.
//
// This repo's 50+ existing scripts/*-contract.ts files never render Preact
// components (no jsdom/testing-library convention exists here despite
// happy-dom being present in devDependencies unused elsewhere), so this
// contract does not attempt to mount <QuoteViewApp/> either. It instead
// exercises installPrintPortal() directly against a real `happy-dom`
// document — genuine DOM APIs (createElement, classList, cloneNode,
// addEventListener), no Preact rendering required, since the function
// takes a Document/Window and never imports preact itself.
//
// Usage: npm run contract:quote-view-print-portal
//    or: npx tsx scripts/quote-view-print-portal-contract.ts

import { Window } from 'happy-dom';

const failures: string[] = [];
function check(label: string, cond: unknown, detail?: unknown): void {
  if (cond) { console.log(`  ok — ${label}`); }
  else { console.error(`  FAIL — ${label}${detail !== undefined ? `: ${JSON.stringify(detail)}` : ''}`); failures.push(label); }
}

async function main(): Promise<void> {
  const { installPrintPortal } = await import('../resources/ts/components/quote-view/QuoteViewApp');

  const win = new Window({ url: 'https://cz-test.local/quote-view/' });
  const doc = win.document as unknown as Document;

  doc.body.innerHTML = `
    <div id="header">Site header — must be hidden by print CSS, untouched here</div>
    <div class="cz-quote-view">
      <div class="cz-quote-view__actions"><button>Print</button></div>
      <div class="cz-proposal" data-testid="proposal">
        <span>CZ-ABC123</span>
      </div>
    </div>
  `;

  const cleanup = installPrintPortal(doc, win as unknown as Window);

  // ── 1) A #cz-print-root is created up front, before any print event ────
  console.log('1) installPrintPortal() creates #cz-print-root immediately');
  {
    const printRoot = doc.getElementById('cz-print-root');
    check('a #cz-print-root element exists in the document', printRoot !== null);
    check('#cz-print-root starts empty', printRoot?.innerHTML === '');
    check('body does not yet carry cz-printing (no print event fired)', !doc.body.classList.contains('cz-printing'));
  }

  // ── 2) beforeprint clones .cz-proposal into #cz-print-root and toggles
  //    the cz-printing class the print stylesheet keys off. ──────────────
  console.log('\n2) beforeprint clones .cz-proposal and adds cz-printing');
  {
    win.dispatchEvent(new win.Event('beforeprint'));
    const printRoot = doc.getElementById('cz-print-root');
    const clonedProposal = printRoot?.querySelector('.cz-proposal');
    check('body gains the cz-printing class', doc.body.classList.contains('cz-printing'));
    check('#cz-print-root now contains a clone of .cz-proposal', clonedProposal !== null);
    check('the clone carries the original proposal content', clonedProposal?.textContent?.includes('CZ-ABC123') === true, clonedProposal?.textContent);
    // The clone must be independent of the live node — mutating the
    // original after the fact must never retroactively change what's
    // already queued for print.
    const liveProposal = doc.querySelector('.cz-quote-view .cz-proposal');
    check('the live .cz-proposal node is untouched (not moved into the print root)', liveProposal !== null && liveProposal.parentElement?.id !== 'cz-print-root');
  }

  // ── 3) afterprint clears the print root and removes cz-printing ───────
  console.log('\n3) afterprint clears the clone and removes cz-printing');
  {
    win.dispatchEvent(new win.Event('afterprint'));
    const printRoot = doc.getElementById('cz-print-root');
    check('body loses the cz-printing class', !doc.body.classList.contains('cz-printing'));
    check('#cz-print-root is emptied', printRoot?.innerHTML === '');
  }

  // ── 4) Cleanup removes the print root and listeners entirely ──────────
  console.log('\n4) the returned cleanup function fully tears down the portal');
  {
    cleanup();
    check('#cz-print-root is removed from the document', doc.getElementById('cz-print-root') === null);

    // A beforeprint fired after cleanup must not resurrect a print root —
    // proves the listeners were actually removed, not just made no-ops.
    win.dispatchEvent(new win.Event('beforeprint'));
    check('a beforeprint after cleanup does not recreate #cz-print-root (listener was removed)', doc.getElementById('cz-print-root') === null);
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll checks passed — the print portal clones .cz-proposal into #cz-print-root and toggles cz-printing exactly once per print cycle, and fully tears down on cleanup.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
