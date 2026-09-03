import { useState } from 'preact/hooks';
import { formatPrice, formatCycleLabel, decodeHtml } from '@/utils/format';
import { calcQuoteTotals, classifyQuoteItems, composableCoexistsWithPrimary, isFamilyTierQuoteItem, quoteItemKey } from '@/utils/quote';
import { chargeTypeLabel, computeTotalContractValue, startingPaymentsByCycle } from '@/utils/paymentSummary';
import { QuoteProposalPreview } from './QuoteProposalPreview';
import type { CartItem, FamilyTierQuoteItem } from '@/components/cost-builder/types';
import type { ServiceItem } from '@/api/types/cost-builder';
import type { ContactFormValues } from './types';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

// Phase 8G: renders the Family item's exact selection-time
// effective.inclusionItems snapshot (Bundle parents with their `includes`
// children nested beneath, matching the focused card's own
// inclusionItems.flatMap treatment in PricingTiers.tsx) when present, or
// the flat features[] list for an old cart entry that predates this field.
// Never re-resolved from live Family/Tier catalog data — snapshot only.
function FamilyInclusionsList({ item }: { item: FamilyTierQuoteItem }) {
  if (item.inclusionItems && item.inclusionItems.length > 0) {
    return (
      <ul class="cz-os__features">
        {item.inclusionItems.flatMap((inclusion, i) => [
          <li key={inclusion.id || i} class={`cz-os__feature${inclusion.bundle_id ? ' cz-os__feature--bundle' : ''}`}>
            {/* Phase 8I: a Bundle parent stays a quantity-less section
                header (matches PricingTiers.tsx's own bundle_id treatment);
                an ordinary inclusion shows its snapshot quantity, right-
                aligned, using nullish semantics (`?? ''`) so a real 0
                remains visible rather than reading as absent. */}
            {inclusion.bundle_id ? inclusion.label : (
              <span class="cz-os__feature-row">
                <span class="cz-os__feature-label">{inclusion.label}</span>
                <span class="cz-os__feature-qty">{inclusion.quantity ?? ''}</span>
              </span>
            )}
          </li>,
          ...(inclusion.includes ?? []).map((child, ci) => (
            <li key={`${inclusion.id || i}:child:${child.id || ci}`} class="cz-os__feature cz-os__feature--child">
              <span class="cz-os__feature-row">
                <span class="cz-os__feature-label">{child.label}</span>
                <span class="cz-os__feature-qty">{child.quantity ?? ''}</span>
              </span>
            </li>
          )),
        ])}
      </ul>
    );
  }
  if (item.features.length > 0) {
    return (
      <ul class="cz-os__features">
        {item.features.map((feature, index) => <li key={index} class="cz-os__feature">{feature}</li>)}
      </ul>
    );
  }
  return null;
}

interface OrderSummaryProps {
  items: CartItem[];
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

  const { mainItems, bundleItems, tierAddonItems, familyMainItems, familyAddonItems, familyComposableItems } = classifyQuoteItems(items);

  // Phase 8F (corrected twice): whenever ANY Family item has 2+ payment
  // streams, the Family Contract Value block below sums EVERY primary
  // Family item (see familyPrimaryTotalContractValues below — that sum was
  // never limited to just the multi-stream ones). So excluding only the
  // multi-stream items from general totals was still wrong: a single-stream
  // Family primary would be counted once there AND again in
  // calcQuoteTotals(). The correct, double-count-proof split is by
  // population, not by stream count: once the Family contract block is
  // active, general/legacy totals cover non-Family items ONLY — every
  // Family item (primary or add-on, any stream count) is already either
  // inside the combined Family sum or shown on its own per-item row above,
  // never both there and inside this general figure too. With no
  // multi-stream item at all, nothing needs excluding — general totals
  // cover every item exactly as before Phase 8F.
  const hasMultiStreamItem = items.filter(isFamilyTierQuoteItem)
    .some((item) => (item.legPaymentSummaries?.length ?? 0) > 1);
  const itemsForGeneralTotals = hasMultiStreamItem
    ? items.filter((item) => !isFamilyTierQuoteItem(item))
    : items;
  const totals = calcQuoteTotals(itemsForGeneralTotals);

  // Phase 8F: same primary-only Total Contract Value / Initial Payment
  // semantics as QuoteSummary.tsx's footer — reusing the exact same
  // primitives, never a second re-derivation. Family add-ons never enter
  // this combined sum (see familyMainItems below, primary-only).
  //
  // Quote/cart connection phase: the composable occupant's own aggregate
  // line joins this same combined commercial total (it is a real commercial
  // line, same as the primary) — but stays a SEPARATE bucket from
  // familyMainItems for every non-total purpose (rendering below, presented
  // identity), per resolveQuoteItemRole()'s own primary/addon/composable
  // split. legPaymentSummaries is read exactly once per item either way.
  const familyCommercialItems = [...familyMainItems, ...familyComposableItems];
  const familyPrimaryTotalContractValues = familyCommercialItems.map((item) =>
    item.legPaymentSummaries && item.legPaymentSummaries.length > 0
      ? computeTotalContractValue(item.legPaymentSummaries)
      : null,
  );
  const allFamilyPrimariesFinite = familyCommercialItems.length > 0
    && familyPrimaryTotalContractValues.every((value) => value !== null);
  const combinedFamilyTotalContractValue = allFamilyPrimariesFinite
    ? familyPrimaryTotalContractValues.reduce((sum, value) => sum + (value as number), 0)
    : null;
  const familyStartingPayments = startingPaymentsByCycle(
    familyCommercialItems.map((item) => item.legPaymentSummaries ?? []),
  );
  const familyInitialPaymentTotal = familyStartingPayments.reduce((sum, [, amount]) => sum + amount, 0);

  const findService = (id: number) => services.find((s) => s.id === Math.abs(id));

  const hasCustomer  = contact.company || contact.contact || contact.email;
  const initials     = contact.contact ? getInitials(contact.contact) : '?';
  const isSubmitting = submitState === 'submitting';
  const isSubmitted  = submitState === 'success';
  const submitDisabled = step === 'contact' || !canSubmit || isSubmitting;
  const totalCount   = mainItems.length + bundleItems.length + tierAddonItems.length + familyMainItems.length + familyAddonItems.length + familyComposableItems.length;

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
                    {item.offer_type === 'promotion_tier' ? (
                      <>
                        <span class="cz-os__service-tag cz-os__service-tag--promo">{item.tierTitle}</span>
                        {item.billing_label && (
                          <span class="cz-os__service-tag">{item.billing_label}</span>
                        )}
                      </>
                    ) : (
                      <>
                        <span class="cz-os__service-tag">{item.tierTitle} tier</span>
                        <span class="cz-os__service-tag">Billed {item.billingCycle}</span>
                      </>
                    )}
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

          {familyMainItems.map((item) => {
            const cycleSuffix = formatCycleLabel(item.billingCycle);
            const streams = item.legPaymentSummaries;
            const hasStreams = !!streams && streams.length > 0;
            const totalContractValue = hasStreams ? computeTotalContractValue(streams!) : null;
            return (
              <div key={quoteItemKey(item)} class="cz-os__service">
                <span class="cz-os__service-icon" aria-hidden="true">{item.familyTitle.charAt(0).toUpperCase()}</span>
                <div class="cz-os__service-info">
                  <p class="cz-os__service-name">{item.familyTitle}</p>
                  <div class="cz-os__service-tags">
                    <span class="cz-os__service-tag">{item.tierTitle}</span>
                    {item.tierEditionTitle && <span class="cz-os__service-tag">{item.tierEditionTitle}</span>}
                  </div>
                </div>
                {hasStreams ? (
                  <div class="cz-os__service-streams">
                    {streams!.map((stream) => (
                      <div key={stream.source} class="cz-os__stream-row">
                        <span class="cz-os__stream-label">{chargeTypeLabel(stream.billingCycle)}</span>
                        <span class="cz-os__stream-value">{formatPrice(stream.price)}</span>
                      </div>
                    ))}
                    {totalContractValue !== null && (
                      <div class="cz-os__stream-row cz-os__stream-row--total">
                        <span class="cz-os__stream-label">Total</span>
                        <span class="cz-os__stream-value">{formatPrice(totalContractValue)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div class="cz-os__service-price">
                    <span class="cz-os__service-price-amount">{item.price !== null ? formatPrice(item.price) : 'TBC'}</span>
                    {item.price !== null && cycleSuffix && <span class="cz-os__service-price-cycle"> {cycleSuffix}</span>}
                  </div>
                )}
                <FamilyInclusionsList item={item} />
              </div>
            );
          })}

          {/* Quote/cart connection phase: the composable ("Build Your Own")
              occupant's own aggregate line — same row shape as a primary
              Family item above (it is a real commercial line, folded into
              the same combined Total Contract Value below), but its own
              distinct classifyQuoteItems() bucket so it is never counted or
              presented as "the primary" selection. */}
          {familyComposableItems.map((item) => {
            const cycleSuffix = formatCycleLabel(item.billingCycle);
            const streams = item.legPaymentSummaries;
            const hasStreams = !!streams && streams.length > 0;
            const totalContractValue = hasStreams ? computeTotalContractValue(streams!) : null;
            // Live-correction round: "Upgrades" when a sibling primary Tier
            // is already selected for the same Family (composableCoexistsWithPrimary()
            // in utils/quote.ts) — standalone Build Your Own naming otherwise.
            const displayTag = composableCoexistsWithPrimary(item, items) ? 'Upgrades' : item.tierTitle;
            return (
              <div key={quoteItemKey(item)} class="cz-os__service">
                <span class="cz-os__service-icon" aria-hidden="true">{item.familyTitle.charAt(0).toUpperCase()}</span>
                <div class="cz-os__service-info">
                  <p class="cz-os__service-name">{item.familyTitle}</p>
                  <div class="cz-os__service-tags">
                    <span class="cz-os__service-tag">{displayTag}</span>
                  </div>
                </div>
                {hasStreams ? (
                  <div class="cz-os__service-streams">
                    {streams!.map((stream) => (
                      <div key={stream.source} class="cz-os__stream-row">
                        <span class="cz-os__stream-label">{chargeTypeLabel(stream.billingCycle)}</span>
                        <span class="cz-os__stream-value">{formatPrice(stream.price)}</span>
                      </div>
                    ))}
                    {totalContractValue !== null && (
                      <div class="cz-os__stream-row cz-os__stream-row--total">
                        <span class="cz-os__stream-label">Total</span>
                        <span class="cz-os__stream-value">{formatPrice(totalContractValue)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div class="cz-os__service-price">
                    <span class="cz-os__service-price-amount">{item.price !== null ? formatPrice(item.price) : 'TBC'}</span>
                    {item.price !== null && cycleSuffix && <span class="cz-os__service-price-cycle"> {cycleSuffix}</span>}
                  </div>
                )}
                <FamilyInclusionsList item={item} />
              </div>
            );
          })}

          {bundleItems.map((item) => {
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

          {tierAddonItems.map((item) => {
            const cycleSuffix = formatCycleLabel(item.billingCycle);
            return (
              <div key={quoteItemKey(item)} class="cz-os__addon">
                <div class="cz-os__addon-info">
                  <p class="cz-os__addon-name">{item.tierTitle}</p>
                  <p class="cz-os__addon-label">Optional add-on · {item.serviceTitle}</p>
                </div>
                <span class="cz-os__addon-price">
                  {item.price !== null
                    ? `${formatPrice(item.price)}${cycleSuffix ? ` ${cycleSuffix}` : ''}`
                    : 'TBC'}
                </span>
              </div>
            );
          })}

          {familyAddonItems.map((item) => {
            const cycleSuffix = formatCycleLabel(item.billingCycle);
            const streams = item.legPaymentSummaries;
            const hasStreams = !!streams && streams.length > 0;
            const totalContractValue = hasStreams ? computeTotalContractValue(streams!) : null;
            return (
              <div key={quoteItemKey(item)} class="cz-os__addon">
                <div class="cz-os__addon-info">
                  <p class="cz-os__addon-name">{item.tierTitle}</p>
                  <p class="cz-os__addon-label">
                    Optional add-on · {item.familyTitle}
                    {item.tierEditionTitle ? ` · ${item.tierEditionTitle}` : ''}
                  </p>
                </div>
                {hasStreams ? (
                  <div class="cz-os__addon-streams">
                    {streams!.map((stream) => (
                      <div key={stream.source} class="cz-os__stream-row">
                        <span class="cz-os__stream-label">{chargeTypeLabel(stream.billingCycle)}</span>
                        <span class="cz-os__stream-value">{formatPrice(stream.price)}</span>
                      </div>
                    ))}
                    {totalContractValue !== null && (
                      <div class="cz-os__stream-row cz-os__stream-row--total">
                        <span class="cz-os__stream-label">Total</span>
                        <span class="cz-os__stream-value">{formatPrice(totalContractValue)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <span class="cz-os__addon-price">{item.price !== null ? `${formatPrice(item.price)}${cycleSuffix ? ` ${cycleSuffix}` : ''}` : 'TBC'}</span>
                )}
                <FamilyInclusionsList item={item} />
              </div>
            );
          })}
        </div>

        {/* Always in DOM so print portal can clone .cz-proposal regardless of expand state */}
        <div
          class={`cz-os__expand-body${isExpanded ? '' : ' cz-os__expand-body--hidden'}`}
          aria-hidden={isExpanded ? undefined : 'true'}
        >
          <QuoteProposalPreview
            items={items}
            services={services}
            contact={contact}
            quoteDate={quoteDate}
            quoteRef={quoteRef}
          />
        </div>
      </div>

      {/* ── Totals ── */}
      <div class="cz-os__total">
        {/* Multi-stream Family Contract Value/Initial Payment — sits ALONGSIDE
            the general totals block below, never replacing it, so a mixed
            cart's legacy Service/bundle/tier-addon totals stay visible. */}
        {hasMultiStreamItem && (
          combinedFamilyTotalContractValue !== null ? (
            <div class="cz-os__total-row">
              <p class="cz-os__total-label">Total Contract Value</p>
              <span class="cz-os__total-amount">{formatPrice(combinedFamilyTotalContractValue)}</span>
            </div>
          ) : (
            <>
              <div class="cz-os__total-row">
                <p class="cz-os__total-label">Contract Value</p>
                <span class="cz-os__total-amount">Ongoing</span>
              </div>
              <p class="cz-os__contract-note">Includes charges without a fixed end date.</p>
            </>
          )
        )}
        {/* General totals — every item except a multi-stream Family one (see
            itemsForGeneralTotals above); hidden only when nothing is left to
            represent here (a cart made entirely of multi-stream Family
            items, already fully covered by the block above). */}
        {itemsForGeneralTotals.length > 0 && (
          totals.cycleEntries.length === 0 ? (
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
          )
        )}
        {hasMultiStreamItem && familyStartingPayments.length > 0 && (
          <div class="cz-os__total-row">
            <p class="cz-os__total-label">Initial Payment</p>
            <span class="cz-os__total-amount">{formatPrice(familyInitialPaymentTotal)}</span>
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
