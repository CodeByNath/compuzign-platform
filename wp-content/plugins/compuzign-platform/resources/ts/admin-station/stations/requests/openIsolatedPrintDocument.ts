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

  const printWindow = win.open('', '_blank', 'noopener,noreferrer,width=900,height=1000');
  if (!printWindow) {
    return { ok: false, reason: 'popup-blocked' };
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

export function waitForStylesheets(links: HTMLLinkElement[]): Promise<void> {
  return Promise.all(
    links.map((link) => new Promise<void>((resolve) => {
      link.addEventListener('load', () => resolve(), { once: true });
      link.addEventListener('error', () => resolve(), { once: true });
    })),
  ).then(() => undefined);
}
