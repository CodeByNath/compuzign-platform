import { formatPrice, formatCycleLabel, decodeHtml } from '@/utils/format';
import { calcQuoteTotals } from '@/utils/quote';
import type { QuoteItem } from '@/components/cost-builder/types';
import type { ServiceItem } from '@/api/types/cost-builder';
import type { ContactFormValues } from './types';

interface QuoteProposalPreviewProps {
  items: QuoteItem[];
  services: ServiceItem[];
  contact: ContactFormValues;
  quoteDate: string;
  quoteRef: string;
}

export function QuoteProposalPreview({
  items,
  services,
  contact,
  quoteDate,
  quoteRef,
}: QuoteProposalPreviewProps) {
  const mainItems  = items.filter((item) => item.serviceId > 0);
  const addonItems = items.filter((item) => item.serviceId < 0);
  const totals     = calcQuoteTotals(items);

  const findService = (id: number) => services.find((s) => s.id === Math.abs(id));

  const hasCustomer = contact.company || contact.contact || contact.email;

  return (
    <div class="cz-proposal">

      {/* ── Header ── */}
      <div class="cz-proposal__header">
        <div class="cz-proposal__brand">
          <strong class="cz-proposal__brand-name">CompuZign</strong>
          <span class="cz-proposal__brand-sub">Managed IT Services</span>
        </div>
        <div class="cz-proposal__header-meta">
          <span class="cz-proposal__doc-label">Preliminary Quote</span>
          <span class="cz-proposal__doc-ref">{quoteRef}</span>
          <span class="cz-proposal__doc-date">{quoteDate}</span>
        </div>
      </div>

      {/* ── Customer ── */}
      {hasCustomer && (
        <div class="cz-proposal__customer">
          <p class="cz-proposal__customer-eyebrow">Prepared for</p>
          {contact.company  && <p class="cz-proposal__customer-company">{contact.company}</p>}
          {contact.contact  && <p class="cz-proposal__customer-name">{contact.contact}</p>}
          {contact.email    && <p class="cz-proposal__customer-email">{contact.email}</p>}
          {contact.phone    && <p class="cz-proposal__customer-phone">{contact.phone}</p>}
        </div>
      )}

      {/* ── Services ── */}
      <div class="cz-proposal__services">
        {mainItems.map((item) => {
          const service    = findService(item.serviceId);
          const desc       = service?.meta?.short_description || service?.excerpt || '';
          const cycleSuffix = formatCycleLabel(item.billingCycle);

          return (
            <div key={item.serviceId} class="cz-proposal__service">
              <div class="cz-proposal__service-row">
                <div class="cz-proposal__service-info">
                  <span class="cz-proposal__service-eyebrow">{item.categoryName}</span>
                  <h3 class="cz-proposal__service-title">{item.serviceTitle}</h3>
                  {desc && (
                    <p class="cz-proposal__service-desc">{decodeHtml(desc)}</p>
                  )}
                  <span class="cz-proposal__service-billing">
                    {item.offer_type === 'promotion_tier' && item.billing_label
                      ? item.billing_label
                      : `Billed ${item.billingCycle}`}
                  </span>
                </div>
                <div class="cz-proposal__service-price-block">
                  <span class={`cz-proposal__service-tier${item.offer_type === 'promotion_tier' ? ' cz-proposal__service-tier--promo' : ''}`}>
                    {item.offer_type === 'promotion_tier' ? item.tierTitle : `${item.tierTitle} tier`}
                  </span>
                  <span class="cz-proposal__service-price">
                    {item.price !== null ? (
                      <>
                        {formatPrice(item.price)}
                        {cycleSuffix && (
                          <span class="cz-proposal__service-cycle">{' '}{cycleSuffix}</span>
                        )}
                      </>
                    ) : (
                      <span class="cz-proposal__price-on-request">Contact for pricing</span>
                    )}
                  </span>
                </div>
              </div>

              {item.features.length > 0 && (
                <ul class="cz-proposal__features">
                  {item.features.map((f, i) => (
                    <li key={i} class="cz-proposal__feature">{f}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Add-ons ── */}
      {addonItems.length > 0 && (
        <div class="cz-proposal__addons">
          <h4 class="cz-proposal__addons-heading">Recommended Add-ons</h4>
          {addonItems.map((item) => {
            const service     = findService(item.serviceId);
            const bundleDesc  = service?.pricing?.bundle?.description ?? '';
            const cycleSuffix = formatCycleLabel(item.billingCycle);

            return (
              <div key={item.serviceId} class="cz-proposal__addon">
                <div class="cz-proposal__addon-info">
                  <span class="cz-proposal__addon-title">{item.serviceTitle}</span>
                  {bundleDesc && (
                    <span class="cz-proposal__addon-desc">{decodeHtml(bundleDesc)}</span>
                  )}
                </div>
                <span class="cz-proposal__addon-price">
                  {item.price !== null ? (
                    <>
                      {formatPrice(item.price)}
                      {cycleSuffix && (
                        <span class="cz-proposal__addon-cycle">{' '}{cycleSuffix}</span>
                      )}
                    </>
                  ) : (
                    'Contact for pricing'
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Totals ── */}
      <div class="cz-proposal__totals">
        {totals.cycleEntries.length === 0 ? (
          <div class="cz-proposal__total-row">
            <span class="cz-proposal__total-label">Pricing on request</span>
            <span class="cz-proposal__total-amount">Contact Us</span>
          </div>
        ) : totals.hasMixedCycles ? (
          <>
            <p class="cz-proposal__total-note-top">
              Estimated totals
              {totals.unpricedItems.length > 0 ? ' — custom pricing applies to some items' : ''}
            </p>
            {totals.cycleEntries.map(([cycle, amount]) => {
              const suffix = formatCycleLabel(cycle);
              return (
                <div key={cycle} class="cz-proposal__total-row">
                  <span class="cz-proposal__total-cycle-name">{cycle}</span>
                  <span class="cz-proposal__total-amount">
                    {formatPrice(amount)}{suffix ? ` ${suffix}` : ''}
                  </span>
                </div>
              );
            })}
          </>
        ) : (
          <div class="cz-proposal__total-row cz-proposal__total-row--primary">
            <span class="cz-proposal__total-label">
              Estimated {totals.singleCycle![0]} total
              {totals.unpricedItems.length > 0 ? ' (custom pricing applies)' : ''}
            </span>
            <span class="cz-proposal__total-amount">
              {formatPrice(totals.singleCycle![1])}
              {formatCycleLabel(totals.singleCycle![0]) && (
                <span class="cz-proposal__total-cycle">
                  {' '}{formatCycleLabel(totals.singleCycle![0])}
                </span>
              )}
            </span>
          </div>
        )}

        {totals.unpricedItems.length > 0 && (
          <p class="cz-proposal__total-custom-note">
            + {totals.unpricedItems.length} item{totals.unpricedItems.length === 1 ? '' : 's'} priced on request — we'll include a full breakdown in our response.
          </p>
        )}
      </div>

      {/* ── Footer ── */}
      <div class="cz-proposal__footer">
        <p class="cz-proposal__footer-disclaimer">
          This is a preliminary, non-binding quote. All prices are in USD and exclude applicable taxes.
          Pricing is valid for 30 days from the date of issue and is subject to scope confirmation.
        </p>
        <p class="cz-proposal__footer-contact">
          Questions? Contact us at <span class="cz-proposal__footer-email">hello@compuzign.com</span>
        </p>
      </div>

    </div>
  );
}
