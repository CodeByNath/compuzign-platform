import { useState } from 'preact/hooks';
import { submitRequest } from '@/api/endpoints/cost-builder';
import { ContactForm } from './ContactForm';
import { QuoteProposalPreview } from './QuoteProposalPreview';
import type { ContactFormValues, RequestFlowContext } from './types';

interface QuoteCartFlowProps {
  context: Extract<RequestFlowContext, { type: 'quote_cart' }>;
  onClose: () => void;
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

const EMPTY_CONTACT: ContactFormValues = {
  company: '',
  contact: '',
  email: '',
  phone: '',
  notes: '',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function makeRef() {
  return 'CZ-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function makeDate() {
  return new Date().toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function QuoteCartFlow({ context, onClose }: QuoteCartFlowProps) {
  const [contact, setContact]           = useState<ContactFormValues>(EMPTY_CONTACT);
  const [submitState, setSubmitState]   = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [quoteRef]  = useState(makeRef);
  const [quoteDate] = useState(makeDate);

  const isSubmitting = submitState === 'submitting';
  const canSubmit    =
    contact.contact.trim().length > 0 &&
    EMAIL_RE.test(contact.email) &&
    !isSubmitting;

  const handlePrint = () => window.print();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitState('submitting');
    setErrorMessage('');

    try {
      await submitRequest({
        type: 'quote_cart',
        company:   contact.company,
        contact:   contact.contact,
        email:     contact.email,
        phone:     contact.phone,
        notes:     contact.notes,
        items:     context.items,
        quote_ref: quoteRef,
      });
      setSubmitState('success');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      );
      setSubmitState('error');
    }
  };

  return (
    <div class="cz-rf-layout">

      {/* ── Sticky header bar ── */}
      <div class="cz-rf-header">
        <h2 class="cz-rf-header__title">Review &amp; Finalise Quote</h2>
        <button
          type="button"
          class="cz-rf-header__close"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      {/* ── Two-panel body ── */}
      <div class="cz-rf-body">

        {/* Left — contact form + actions */}
        <aside class="cz-rf-left">
          {submitState === 'success' ? (
            <div class="cz-rf-success">
              <span class="cz-rf-success__icon" aria-hidden="true">✓</span>
              <h3 class="cz-rf-success__heading">Quote submitted!</h3>
              <p class="cz-rf-success__ref">
                Reference: <strong>{quoteRef}</strong>
              </p>
              <p class="cz-rf-success__message">
                We'll be in touch at <strong>{contact.email}</strong> within one business day.
              </p>
              <button
                type="button"
                class="cz-btn cz-btn-secondary cz-rf-success__print"
                onClick={handlePrint}
              >
                Print / Save as PDF
              </button>
              <button
                type="button"
                class="cz-btn cz-btn-primary cz-rf-success__close"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div class="cz-rf-left__scroll">
                <p class="cz-rf-left__section-heading">Your details</p>
                <ContactForm
                  values={contact}
                  onChange={setContact}
                  disabled={isSubmitting}
                />
              </div>

              <div class="cz-rf-left__actions">
                {submitState === 'error' && (
                  <p class="cz-rf-left__error" role="alert">{errorMessage}</p>
                )}
                <button
                  type="button"
                  class="cz-btn cz-btn-secondary cz-rf-left__action-btn"
                  onClick={handlePrint}
                >
                  Print / Save as PDF
                </button>
                <button
                  type="button"
                  class="cz-btn cz-btn-primary cz-rf-left__action-btn"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                >
                  {isSubmitting ? 'Submitting…' : 'Submit Quote Request'}
                </button>
                <p class="cz-rf-left__req-note">* Required fields</p>
              </div>
            </>
          )}
        </aside>

        {/* Right — printable proposal */}
        <div class="cz-rf-right">
          <QuoteProposalPreview
            items={context.items}
            services={context.services}
            contact={contact}
            quoteDate={quoteDate}
            quoteRef={quoteRef}
          />
        </div>

      </div>
    </div>
  );
}
