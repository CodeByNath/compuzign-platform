import { useState } from 'preact/hooks';
import { submitRequest } from '@/api/endpoints/requests';
import { ContactForm } from './ContactForm';
import { OrderSummary } from './OrderSummary';
import { StepIndicator } from './StepIndicator';
import type { ContactFormValues, RequestFlowContext } from './types';

interface QuoteCartFlowProps {
  context: Extract<RequestFlowContext, { type: 'quote_cart' }>;
  onClose: () => void;
}

type Step        = 'contact' | 'review';
type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

const FLOW_STEPS = [
  { label: 'Contact details', description: 'Provide your information'     },
  { label: 'Review & submit', description: 'Confirm your quote request'   },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_CONTACT: ContactFormValues = {
  company: '',
  contact: '',
  email:   '',
  phone:   '',
  notes:   '',
};

function makeRef() {
  return 'CZ-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function makeDate() {
  return new Date().toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ── Inline SVG icons — no external library ───────────────────────────────────

const IconPerson = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2" aria-hidden="true">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);

const IconShield = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M12 2L3 7v5c0 5 3.5 9.7 9 11 5.5-1.3 9-6 9-11V7L12 2z"/>
  </svg>
);

const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2" aria-hidden="true">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 7v5l3 3"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────

export function QuoteCartFlow({ context, onClose }: QuoteCartFlowProps) {
  const [contact,           setContact]           = useState<ContactFormValues>(EMPTY_CONTACT);
  const [step,              setStep]              = useState<Step>('contact');
  const [submitState,       setSubmitState]       = useState<SubmitState>('idle');
  const [errorMessage,      setErrorMessage]      = useState('');
  const [continueAttempted, setContinueAttempted] = useState(false);
  const [quoteRef]  = useState(makeRef);
  const [quoteDate] = useState(makeDate);

  const isSubmitting = submitState === 'submitting';
  const isValid      = contact.contact.trim().length > 0 && EMAIL_RE.test(contact.email);
  const canSubmit    = step === 'review' && isValid && !isSubmitting;

  const handleBack = () => {
    if (step === 'contact') onClose();
    else setStep('contact');
  };

  const handleContinue = () => {
    setContinueAttempted(true);
    if (isValid) {
      setStep('review');
      setContinueAttempted(false);
    }
  };

  const handlePrint = () => window.print();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitState('submitting');
    setErrorMessage('');
    try {
      await submitRequest({
        type:      'quote_cart',
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

  // ── Left panel content — switches by step / submit state ─────────────────

  const renderLeftContent = () => {

    if (submitState === 'success') {
      return (
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
      );
    }

    if (step === 'contact') {
      return (
        <div class="cz-rf-contact-panel">
          <div class="cz-rf-intro">
            <span class="cz-rf-intro__icon"><IconPerson /></span>
            <div class="cz-rf-intro__text">
              <h3 class="cz-rf-intro__heading">Let's get your details</h3>
              <p class="cz-rf-intro__sub">We'll use this information to send your quote.</p>
            </div>
          </div>

          <div class="cz-rf-left__scroll">
            <ContactForm
              values={contact}
              onChange={setContact}
              disabled={false}
              submitAttempted={continueAttempted}
            />
            <div class="cz-rf-trust">
              <div class="cz-rf-trust__item">
                <span class="cz-rf-trust__icon"><IconShield /></span>
                <div class="cz-rf-trust__text">
                  <p class="cz-rf-trust__label">Your details are secure</p>
                  <p class="cz-rf-trust__desc">We'll never share your information.</p>
                </div>
              </div>
              <div class="cz-rf-trust__item">
                <span class="cz-rf-trust__icon"><IconClock /></span>
                <div class="cz-rf-trust__text">
                  <p class="cz-rf-trust__label">Quick response</p>
                  <p class="cz-rf-trust__desc">We aim to respond within one business day.</p>
                </div>
              </div>
            </div>
            <p class="cz-rf-left__req-note">* Required fields</p>
          </div>

          <div class="cz-rf-left__nav">
            <button type="button" class="cz-btn cz-btn-ghost" onClick={handleBack}>
              ← Back
            </button>
            <button type="button" class="cz-btn cz-btn-primary" onClick={handleContinue}>
              Continue →
            </button>
          </div>
        </div>
      );
    }

    // step === 'review'
    return (
      <div class="cz-rf-review-panel">
        <div class="cz-rf-left__scroll">
          <h3 class="cz-rf-review-panel__heading">Confirm your details</h3>
          <div class="cz-rf-review-panel__contact">
            {contact.company && (
              <div class="cz-rf-review-panel__field">
                <span class="cz-rf-review-panel__field-label">Company</span>
                <span class="cz-rf-review-panel__field-value">{contact.company}</span>
              </div>
            )}
            <div class="cz-rf-review-panel__field">
              <span class="cz-rf-review-panel__field-label">Name</span>
              <span class="cz-rf-review-panel__field-value">{contact.contact}</span>
            </div>
            <div class="cz-rf-review-panel__field">
              <span class="cz-rf-review-panel__field-label">Email</span>
              <span class="cz-rf-review-panel__field-value">{contact.email}</span>
            </div>
            {contact.phone && (
              <div class="cz-rf-review-panel__field">
                <span class="cz-rf-review-panel__field-label">Phone</span>
                <span class="cz-rf-review-panel__field-value">{contact.phone}</span>
              </div>
            )}
            {contact.notes && (
              <div class="cz-rf-review-panel__field cz-rf-review-panel__field--notes">
                <span class="cz-rf-review-panel__field-label">Notes</span>
                <span class="cz-rf-review-panel__field-value">{contact.notes}</span>
              </div>
            )}
          </div>
          <button
            type="button"
            class="cz-rf-review-panel__edit"
            onClick={() => setStep('contact')}
          >
            Edit details
          </button>
        </div>

        <div class="cz-rf-left__nav">
          <button type="button" class="cz-btn cz-btn-ghost" onClick={handleBack}>
            ← Back
          </button>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────

  const currentStepIndex = step === 'contact' ? 0 : 1;
  const allServices      = context.services;

  return (
    <div class="cz-rf-layout">

      {/* ── Sticky header ── */}
      <div class="cz-rf-header">
        <div class="cz-rf-header__content">
          <h2 class="cz-rf-header__title">Review &amp; Finalise Quote</h2>
          <p class="cz-rf-header__sub">
            {step === 'contact'
              ? 'Provide your information so we can follow up.'
              : 'Almost there! Confirm your details and send your quote request.'}
          </p>
        </div>
        <button
          type="button"
          class="cz-rf-header__close"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      {/* ── Step indicator ── */}
      {submitState !== 'success' && (
        <div class="cz-rf-steps">
          <StepIndicator steps={FLOW_STEPS} current={currentStepIndex} />
        </div>
      )}

      {/* ── Two-panel body ── */}
      <div class="cz-rf-body">
        <div class="cz-rf-left">
          {renderLeftContent()}
        </div>
        <div class="cz-rf-right">
          <OrderSummary
            items={context.items}
            services={allServices}
            contact={contact}
            quoteRef={quoteRef}
            quoteDate={quoteDate}
            step={step}
            submitState={submitState}
            canSubmit={canSubmit}
            onSubmit={handleSubmit}
            onPrint={handlePrint}
            errorMessage={errorMessage}
          />
        </div>
      </div>

    </div>
  );
}
