import { useEffect, useRef } from 'preact/hooks';
import type { RequestFlowContext } from './types';
import { QuoteCartFlow } from './QuoteCartFlow';

interface RequestFlowModalProps {
  isOpen: boolean;
  context: RequestFlowContext;
  onClose: () => void;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function RequestFlowModal({ isOpen, context, onClose }: RequestFlowModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus first focusable element after paint
    const focusTimer = setTimeout(() => {
      const els = modalRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      els?.[0]?.focus();
    }, 50);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;

      const els = Array.from(modalRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const renderInterior = () => {
    switch (context.type) {
      case 'quote_cart':
        return <QuoteCartFlow context={context} onClose={onClose} />;
      default:
        return null;
    }
  };

  return (
    <div class="cz-rf-backdrop" role="presentation" onClick={onClose}>
      <div
        class="cz-rf-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Review and finalise your quote"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        {renderInterior()}
      </div>
    </div>
  );
}
