// CRM-1C: the pure-DOM half of Request print — opening an isolated
// window/document and loading only the specific stylesheets `.cz-proposal`
// needs into it, never the Admin Station page's own document. Kept free of
// any Preact import (unlike printRequestProposal.tsx, which renders
// QuoteProposalPreview into the mount this returns) for the same reason
// QuoteViewApp.tsx's installPrintPortal() is a plain DOM function separate
// from its JSX: this repo's contract scripts exercise plain DOM mechanics
// directly against `happy-dom`, with no Preact-rendering convention.
//
// Matches the exact selector cost-builder.css's print rules already key off
// (`body.cz-printing #cz-print-root`) — see installPrintPortal() in
// QuoteViewApp.tsx for the same convention on the customer-facing side.

export interface PrintAssetConfig {
  distUrl?: string;
  atomicEngineUrl?: string;
}

export type OpenIsolatedPrintDocumentResult =
  | { ok: true; printWindow: Window; mount: HTMLElement; links: HTMLLinkElement[] }
  | { ok: false; reason: 'popup-blocked' | 'config-missing' };

export function stylesheetHrefsFor(config: PrintAssetConfig): string[] {
  return [
    `${config.atomicEngineUrl}css/00-tokens.css`,
    `${config.atomicEngineUrl}css/01-reset.css`,
    `${config.atomicEngineUrl}css/02-base.css`,
    `${config.distUrl}css/cost-builder.css`,
  ];
}

export function openIsolatedPrintDocument(
  config: PrintAssetConfig | undefined,
  title: string,
  win: Pick<Window, 'open'>,
): OpenIsolatedPrintDocumentResult {
  if (!config?.distUrl || !config?.atomicEngineUrl) {
    return { ok: false, reason: 'config-missing' };
  }

  // CRM-1C audit correction: `noopener`/`noreferrer` in the feature string
  // makes `window.open()` return null PER SPEC even when the window is
  // genuinely created — the whole point of `noopener` is that the caller
  // gets no reference back. That made every call here misreport as
  // "popup blocked", since this code needs the returned handle to render
  // and print into. Omit them and instead sever the reverse reference
  // (the print window's own `.opener` pointing back here) once a real
  // handle is in hand, below — same defense-in-depth, a usable handle.
  const printWindow = win.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) {
    return { ok: false, reason: 'popup-blocked' };
  }
  try {
    printWindow.opener = null;
  } catch {
    // Non-fatal: some engines make `opener` non-configurable in some
    // contexts. The print window only ever loads code-owned, same-origin
    // content this function itself writes below, regardless.
  }

  const doc = printWindow.document;
  doc.open();
  doc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
  doc.close();
  doc.title = title;
  doc.body.className = 'cz-printing';

  const mount = doc.createElement('div');
  mount.id = 'cz-print-root';
  doc.body.appendChild(mount);

  const links = stylesheetHrefsFor(config).map((href) => {
    const link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    doc.head.appendChild(link);
    return link;
  });

  return { ok: true, printWindow, mount, links };
}

// Print must never hang the drawer forever: a cached stylesheet has already
// fired its one 'load' event before this function's listener attaches, and
// some environments never fire 'load'/'error' for a given link at all. So
// this recognizes an already-loaded sheet up front (`link.sheet !== null`)
// and races every remaining listener against a short timeout fallback.
const STYLESHEET_LOAD_TIMEOUT_MS = 2000;

export function waitForStylesheets(
  links: HTMLLinkElement[],
  timeoutMs = STYLESHEET_LOAD_TIMEOUT_MS,
): Promise<void> {
  return Promise.all(
    links.map((link) => new Promise<void>((resolve) => {
      if (link.sheet !== null) {
        resolve();
        return;
      }
      const timer = setTimeout(resolve, timeoutMs);
      const settle = () => {
        clearTimeout(timer);
        resolve();
      };
      link.addEventListener('load', settle, { once: true });
      link.addEventListener('error', settle, { once: true });
    })),
  ).then(() => undefined);
}
