import { useState } from 'preact/hooks';
import { formatPrice, formatCycleLabel, decodeHtml } from '@/utils/format';
import { calcQuoteTotals } from '@/utils/quote';
import { QuoteProposalPreview } from './QuoteProposalPreview';
import type { QuoteItem } from '@/components/cost-builder/types';
import type { ServiceItem } from '@/api/types/cost-builder';
import type { ContactFormValues } from './types';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

interface OrderSummaryProps {
  items: QuoteItem[];
  services: ServiceItem[];
  contact: ContactFormValues;
  quoteRef: string;
  quoteDate: string;
  step: 'contact' | 'review';
  submitState: SubmitState;
  canSubmit: boolean;
  onSubmit: () => void;
  onPrint: () => void;
  errorMessage?: string;
}

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

export function OrderSummary({
  items,
  services,
  contact,
  quoteRef,
  quoteDate,
  step,
  submitState,
  canSubmit,
  onSubmit,
  onPrint,
  errorMessage,
}: OrderSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const mainItems  = items.filter((item) => item.serviceId > 0);
  const addonItems = items.filter((item) => item.serviceId < 0);
  const totals     = calcQuoteTotals(items);

  const findService = (id: number) => services.find((s) => s.id === Math.abs(id));

  const hasCustomer  = contact.company || contact.contact || contact.email;
  const initials     = contact.contact ? getInitials(contact.contact) : '?';
  const isSubmitting = submitState === 'submitting';
  const isSubmitted  = submitState === 'success';
  const submitDisabled = step === 'contact' || !canSubmit || isSubmitting;
  const totalCount   = mainItems.length + addonItems.length;

  return (
    <div class="cz-os">

      {/* ── Header ── */}
      <div class="cz-os__header">
        <h3 class="cz-os__title">Your quote</h3>
        <span class="cz-os__badge">Preliminary</span>
      </div>

      {/* ── Prepared for ── */}
      {hasCustomer && (
        <div class="cz-os__prepared">
          <span class="cz-os__avatar" aria-hidden="true">{initials}</span>
          <div class="cz-os__prepared-info">
            <p class="cz-os__prepared-eyebrow">Prepared for</p>
            <p class="cz-os__prepared-name">
              {contact.company || contact.contact}
            </p>
            {contact.contact && contact.company && (
              <p class="cz-os__prepared-email">{contact.contact}</p>
            )}
            {contact.email && (
              <p class="cz-os__prepared-email">{contact.email}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Services ── */}
      <div class="cz-os__services-section">
        <div class="cz-os__services-header">
          <p class="cz-os__services-heading">Selected services ({totalCount})</p>
          <button
            type="button"
            class="cz-os__view-quote-btn"
            onClick={() => setIsExpanded((v) => !v)}
            aria-expanded={isExpanded}
          >
            {isExpanded ? 'Collapse ↑' : 'View full quote →'}
          </button>
        </div>

        <div class="cz-os__service-list">
          {mainItems.map((item) => {
            const service     = findService(item.serviceId);
            const desc        = service?.meta?.short_description || service?.excerpt || '';
            const cycleSuffix = formatCycleLabel(item.billingCycle);
            const catInitial  = item.categoryName.charAt(0).toUpperCase();

            return (
              <div key={item.serviceId} class="cz-os__service">
                <span class="cz-os__service-icon" aria-hidden="true">{catInitial}</span>
                <div class="cz-os__service-info">
                  <p class="cz-os__service-name">{item.serviceTitle}</p>
                  {desc && <p class="cz-os__service-desc">{decodeHtml(desc)}</p>}
                  <div class="cz-os__service-tags">
                    <span class="cz-os__service-tag">{item.tierTitle} tier</span>
                    <span class="cz-os__service-tag">Billed {item.billingCycle}</span>
                  </div>
                </div>
                <div class="cz-os__service-price">
                  {item.price !== null ? (
                    <>
                      <span class="cz-os__service-price-amount">{formatPrice(item.price)}</span>
                      {cycleSuffix && (
                        <span class="cz-os__service-price-cycle">{' '}{cycleSuffix}</span>
                      )}
                    </>
                  ) : (
                    <span class="cz-os__service-price-amount cz-os__price--tbc">TBC</span>
                  )}
                </div>
              </div>
            );
          })}

          {addonItems.map((item) => {
            const cycleSuffix = formatCycleLabel(item.billingCycle);
            return (
              <div key={item.serviceId} class="cz-os__addon">
                <div class="cz-os__addon-info">
                  <p class="cz-os__addon-name">{item.serviceTitle}</p>
                  <p class="cz-os__addon-label">Add-on</p>
                </div>
                <span class="cz-os__addon-price">
                  {item.price !== null
                    ? `${formatPrice(item.price)}${cycleSuffix ? ` ${cycleSuffix}` : ''}`
                    : 'TBC'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Inline full quote expansion */}
        {isExpanded && (
          <div class="cz-os__expand-body">
            <QuoteProposalPreview
              items={items}
              services={services}
              contact={contact}
              quoteDate={quoteDate}
              quoteRef={quoteRef}
            />
          </div>
        )}
      </div>

      {/* ── Totals ── */}
      <div class="cz-os__total">
        {totals.cycleEntries.length === 0 ? (
          <div class="cz-os__total-row">
            <p class="cz-os__total-label">Total</p>
            <span class="cz-os__total-amount">On request</span>
          </div>
        ) : totals.hasMixedCycles ? (
          totals.cycleEntries.map(([cycle, amount]) => {
            const suffix = formatCycleLabel(cycle);
            return (
              <div key={cycle} class="cz-os__total-row">
                <p class="cz-os__total-label">Estimated {cycle} total</p>
                <span class="cz-os__total-amount">
                  {formatPrice(amount)}
                  {suffix && <span class="cz-os__total-cycle">{' '}{suffix}</span>}
                </span>
              </div>
            );
          })
        ) : (
          <div class="cz-os__total-row">
            <p class="cz-os__total-label">
              Estimated {totals.singleCycle![0]} total
              {totals.unpricedItems.length > 0 ? ' (some items on request)' : ''}
            </p>
            <span class="cz-os__total-amount">
              {formatPrice(totals.singleCycle![1])}
              {formatCycleLabel(totals.singleCycle![0]) && (
                <span class="cz-os__total-cycle">
                  {' '}{formatCycleLabel(totals.singleCycle![0])}
                </span>
              )}
            </span>
          </div>
        )}
        <p class="cz-os__total-note">
          Preliminary, non-binding quote. Pricing valid for 30 days and subject to scope confirmation.
        </p>
      </div>

      {/* ── Actions ── */}
      {!isSubmitted && (
        <div class="cz-os__actions">
          {errorMessage && (
            <p class="cz-os__error" role="alert">{errorMessage}</p>
          )}
          <button
            type="button"
            class="cz-btn cz-btn-secondary cz-os__print-btn"
            onClick={onPrint}
          >
            Print / Save as PDF
          </button>
          <button
            type="button"
            class="cz-btn cz-btn-primary cz-os__submit-btn"
            onClick={onSubmit}
            disabled={submitDisabled}
          >
            {isSubmitting ? 'Submitting…' : 'Submit Quote Request'}
          </button>
        </div>
      )}

      {/* ── Help footer ── */}
      <p class="cz-os__help">
        Questions? Email us at{' '}
        <a href="mailto:hello@compuzign.com" class="cz-os__help-link">
          hello@compuzign.com
        </a>
      </p>

    </div>
  );
}
