import { useEffect } from 'preact/hooks';
import { formatPrice } from '@/utils/format';
import type { QuoteItem } from './types';

interface PdfModalProps {
  isOpen: boolean;
  items: QuoteItem[];
  onClose: () => void;
}

export function PdfModal({ isOpen, items, onClose }: PdfModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    onClose();
  };

  return (
    <div
      class="cz-pdf-modal__backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        class="cz-pdf-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Generate PDF Quote"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="cz-pdf-modal__header">
          <h3 class="cz-pdf-modal__title">Generate PDF Quote</h3>
          <button
            type="button"
            class="cz-pdf-modal__close"
            aria-label="Close modal"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div class="cz-pdf-modal__body">
          <div class="cz-pdf-modal__summary">
            <h4 class="cz-pdf-modal__summary-heading">Selected Services</h4>
            <ul class="cz-pdf-modal__summary-list">
              {items.map((item) => (
                <li key={item.serviceId} class="cz-pdf-modal__summary-item">
                  <span class="cz-pdf-modal__summary-name">{item.serviceTitle}</span>
                  <span class="cz-pdf-modal__summary-tier">{item.tierTitle}</span>
                  <span class="cz-pdf-modal__summary-price">
                    {item.price !== null ? formatPrice(item.price) : 'Custom'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <form class="cz-pdf-modal__form" onSubmit={handleSubmit}>
            <div class="cz-pdf-modal__fields">
              <label class="cz-pdf-modal__field">
                <span class="cz-pdf-modal__field-label">Company</span>
                <input
                  class="cz-pdf-modal__input"
                  type="text"
                  name="company"
                  placeholder="Acme Corp"
                  autocomplete="organization"
                />
              </label>
              <label class="cz-pdf-modal__field">
                <span class="cz-pdf-modal__field-label">Contact Name</span>
                <input
                  class="cz-pdf-modal__input"
                  type="text"
                  name="contact"
                  placeholder="Jane Smith"
                  autocomplete="name"
                />
              </label>
              <label class="cz-pdf-modal__field">
                <span class="cz-pdf-modal__field-label">Email</span>
                <input
                  class="cz-pdf-modal__input"
                  type="email"
                  name="email"
                  placeholder="jane@acme.com"
                  autocomplete="email"
                />
              </label>
              <label class="cz-pdf-modal__field cz-pdf-modal__field--full">
                <span class="cz-pdf-modal__field-label">Notes</span>
                <textarea
                  class="cz-pdf-modal__input cz-pdf-modal__textarea"
                  name="notes"
                  rows={3}
                  placeholder="Any additional requirements…"
                />
              </label>
            </div>
            <div class="cz-pdf-modal__actions">
              <button type="button" class="cz-btn cz-btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" class="cz-btn cz-btn-primary">
                Create PDF Quote
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
