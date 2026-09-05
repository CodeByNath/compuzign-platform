import { formatPrice, formatCycleLabel, decodeHtml } from '@/utils/format';
import { calcQuoteTotals, classifyQuoteItems, composableCoexistsWithPrimary, isFamilyTierQuoteItem, quoteItemKey } from '@/utils/quote';
import { chargeTypeLabel, computeTotalContractValue, startingPaymentsByCycle } from '@/utils/paymentSummary';
import { disclosureRowsForFamilyTierItem } from '@/components/cost-builder/InclusionDisclosure';
import type { CartItem, FamilyTierQuoteItem } from '@/components/cost-builder/types';
import type { ServiceItem } from '@/api/types/cost-builder';
import type { ContactFormValues } from './types';

interface QuoteProposalPreviewProps {
  items: CartItem[];
  services: ServiceItem[];
  contact: ContactFormValues;
  quoteDate: string;
  quoteRef: string;
}

// Phase 8G: renders the Family item's exact selection-time
// effective.inclusionItems snapshot (Bundle parents with their `includes`
// children nested beneath, matching the focused card's own
// inclusionItems.flatMap treatment in PricingTiers.tsx) when present, or
// the flat features[] list for an old cart entry that predates this field.
// Never re-resolved from live Family/Tier catalog data — snapshot only.
function FamilyInclusionsList({ item }: { item: FamilyTierQuoteItem }) {
  // Live-gate correction (2026-09-05, "preserve period/leg inclusion
  // attribution"; corrected "leg-level breakdown presentation"): reuses the
  // SAME shared row derivation the quote disclosure/Total Commitment
  // tables already call (disclosureRowsForFamilyTierItem(),
  // cost-builder/InclusionDisclosure.tsx) rather than a second
  // period-walking implementation — when the commercialBreakdown snapshot
  // exists, its rows carry a sectionKey/sectionLabel/sectionSubtotal this
  // list renders as a section heading (with that component's own
  // authoritative subtotal, never a summed total) before the run of rows
  // it covers, so the printed/emailed-link proposal explains WHICH
  // inclusion, at what quantity/unit price, produced a given charge.
  // Absent for the legacy inclusionItems/features fallback below
  // (untouched), in which case every row's sectionKey is undefined and no
  // heading ever renders here.
  const breakdownRows = disclosureRowsForFamilyTierItem(item).filter((row) => row.sectionKey !== undefined);
  if (breakdownRows.length > 0) {
    let previousSectionKey: string | undefined;
    return (
      <ul class="cz-proposal__features">
        {breakdownRows.flatMap((row) => {
          const showSectionHeading = row.sectionKey !== previousSectionKey;
          previousSectionKey = row.sectionKey;
          return [
            ...(showSectionHeading ? [
              <li key={`${row.id}:group`} class="cz-proposal__feature cz-proposal__feature--group">
                <span class="cz-proposal__feature-row">
                  <span>{row.sectionLabel}</span>
                  {row.sectionSubtotal && <span class="cz-proposal__feature-price">{row.sectionSubtotal}</span>}
                </span>
              </li>,
            ] : []),
            <li key={row.id} class="cz-proposal__feature">
              <span class="cz-proposal__feature-row">
                <span class="cz-proposal__feature-label">{row.label}</span>
                <span class="cz-proposal__feature-qty">
                  {row.quantity ?? ''}
                  {row.unitPrice !== null && (
                    <span class="cz-proposal__feature-unit-price">{' '}{formatPrice(row.unitPrice)} ea.</span>
                  )}
                  {row.lineTotal !== null && (
                    <span class="cz-proposal__feature-price">{' '}{formatPrice(row.lineTotal)}</span>
                  )}
                </span>
              </span>
            </li>,
          ];
        })}
      </ul>
    );
  }
  if (item.inclusionItems && item.inclusionItems.length > 0) {
    return (
      <ul class="cz-proposal__features">
        {item.inclusionItems.flatMap((inclusion, i) => [
          <li key={inclusion.id || i} class={`cz-proposal__feature${inclusion.bundle_id ? ' cz-proposal__feature--bundle' : ''}`}>
            {/* Phase 8I: a Bundle parent stays a quantity-less section
                header (matches PricingTiers.tsx's own bundle_id treatment);
                an ordinary inclusion shows its snapshot quantity, right-
                aligned, using nullish semantics (`?? ''`) so a real 0
                remains visible rather than reading as absent. */}
            {inclusion.bundle_id ? inclusion.label : (
              <span class="cz-proposal__feature-row">
                <span class="cz-proposal__feature-label">{inclusion.label}</span>
                <span class="cz-proposal__feature-qty">{inclusion.quantity ?? ''}</span>
              </span>
            )}
          </li>,
          ...(inclusion.includes ?? []).map((child, ci) => (
            <li key={`${inclusion.id || i}:child:${child.id || ci}`} class="cz-proposal__feature cz-proposal__feature--child">
              <span class="cz-proposal__feature-row">
                <span class="cz-proposal__feature-label">{child.label}</span>
                <span class="cz-proposal__feature-qty">{child.quantity ?? ''}</span>
              </span>
            </li>
          )),
        ])}
      </ul>
    );
  }
  if (item.features.length > 0) {
    return (
      <ul class="cz-proposal__features">
        {item.features.map((feature, index) => <li key={index} class="cz-proposal__feature">{feature}</li>)}
      </ul>
    );
  }
  return null;
}

export function QuoteProposalPreview({
  items,
  services,
  contact,
  quoteDate,
  quoteRef,
}: QuoteProposalPreviewProps) {
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
  // semantics as QuoteSummary.tsx/OrderSummary.tsx — reusing the exact same
  // primitives, never a second re-derivation. Family add-ons never enter
  // this combined sum (see familyMainItems below, primary-only).
  //
  // Request/PDF/email propagation phase: the composable occupant's own
  // aggregate line joins this same combined commercial total (it is a real
  // commercial line, same as the primary) — but stays a SEPARATE bucket from
  // familyMainItems for every non-total purpose (rendering below, presented
  // identity), per resolveQuoteItemRole()'s own primary/addon/composable
  // split, matching OrderSummary.tsx's own familyCommercialItems precedent.
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
          // Phase 8J-C2 correction: the stored submission snapshot's own
          // captured description takes priority — set only once a request
          // has actually been submitted (see types.ts's QuoteItem
          // docblock), so this is always absent during normal interactive
          // use and the live `services` lookup below behaves exactly as it
          // always did.
          const desc       = item.serviceDescription || service?.meta?.short_description || service?.excerpt || '';
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
        {familyMainItems.map((item) => {
          const cycleSuffix = formatCycleLabel(item.billingCycle);
          const streams = item.legPaymentSummaries;
          const hasStreams = !!streams && streams.length > 0;
          const totalContractValue = hasStreams ? computeTotalContractValue(streams!) : null;
          return (
            <div key={quoteItemKey(item)} class="cz-proposal__service">
              <div class="cz-proposal__service-row">
                <div class="cz-proposal__service-info">
                  <span class="cz-proposal__service-eyebrow">Package Family</span>
                  <h3 class="cz-proposal__service-title">{item.familyTitle}</h3>
                  <span class="cz-proposal__service-billing">{item.tierTitle}</span>
                </div>
                <div class="cz-proposal__service-price-block">
                  {item.tierEditionTitle && <span class="cz-proposal__service-tier">{item.tierEditionTitle}</span>}
                  {hasStreams ? (
                    <div class="cz-proposal__service-streams">
                      {streams!.map((stream, streamIndex) => (
                        <div key={streamIndex} class="cz-proposal__stream-row">
                          <span class="cz-proposal__stream-label">{chargeTypeLabel(stream.billingCycle)}</span>
                          <span class="cz-proposal__stream-value">{formatPrice(stream.price)}</span>
                        </div>
                      ))}
                      {totalContractValue !== null && (
                        <div class="cz-proposal__stream-row cz-proposal__stream-row--total">
                          <span class="cz-proposal__stream-label">Total</span>
                          <span class="cz-proposal__stream-value">{formatPrice(totalContractValue)}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span class="cz-proposal__service-price">{item.price !== null ? <>{formatPrice(item.price)}{cycleSuffix && <span class="cz-proposal__service-cycle"> {cycleSuffix}</span>}</> : <span class="cz-proposal__price-on-request">Contact for pricing</span>}</span>
                  )}
                </div>
              </div>
              <FamilyInclusionsList item={item} />
            </div>
          );
        })}
        {/* Request/PDF/email propagation phase: the composable ("Build Your
            Own") occupant's own aggregate line — same row shape as a primary
            Family item above (a real commercial line, folded into the same
            combined Total Contract Value above), but its own distinct
            classifyQuoteItems() bucket and eyebrow so it is never presented
            as "the primary" selection. */}
        {familyComposableItems.map((item) => {
          const cycleSuffix = formatCycleLabel(item.billingCycle);
          const streams = item.legPaymentSummaries;
          const hasStreams = !!streams && streams.length > 0;
          const totalContractValue = hasStreams ? computeTotalContractValue(streams!) : null;
          // Phase 0 display resolver (utils/quote.ts) — same rule as
          // QuoteSummary.tsx/QuoteDetailsOverlay.tsx: a composable occupant
          // coexisting with its primary Tier/Edition reads "Upgrades" here
          // too, never the standalone "Build Your Own" identity.
          const isUpgrade = composableCoexistsWithPrimary(item, items);
          return (
            <div key={quoteItemKey(item)} class="cz-proposal__service">
              <div class="cz-proposal__service-row">
                <div class="cz-proposal__service-info">
                  <span class="cz-proposal__service-eyebrow">{isUpgrade ? 'Upgrades' : 'Build Your Own'}</span>
                  <h3 class="cz-proposal__service-title">{item.familyTitle}</h3>
                  <span class="cz-proposal__service-billing">{isUpgrade ? 'Upgrades' : item.tierTitle}</span>
                </div>
                <div class="cz-proposal__service-price-block">
                  {hasStreams ? (
                    <div class="cz-proposal__service-streams">
                      {streams!.map((stream, streamIndex) => (
                        <div key={streamIndex} class="cz-proposal__stream-row">
                          <span class="cz-proposal__stream-label">{chargeTypeLabel(stream.billingCycle)}</span>
                          <span class="cz-proposal__stream-value">{formatPrice(stream.price)}</span>
                        </div>
                      ))}
                      {totalContractValue !== null && (
                        <div class="cz-proposal__stream-row cz-proposal__stream-row--total">
                          <span class="cz-proposal__stream-label">Total</span>
                          <span class="cz-proposal__stream-value">{formatPrice(totalContractValue)}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span class="cz-proposal__service-price">{item.price !== null ? <>{formatPrice(item.price)}{cycleSuffix && <span class="cz-proposal__service-cycle"> {cycleSuffix}</span>}</> : <span class="cz-proposal__price-on-request">Contact for pricing</span>}</span>
                  )}
                </div>
              </div>
              <FamilyInclusionsList item={item} />
            </div>
          );
        })}
      </div>

      {/* ── Recommended bundle (legacy) ── */}
      {bundleItems.length > 0 && (
        <div class="cz-proposal__addons">
          <h4 class="cz-proposal__addons-heading">Recommended Add-ons</h4>
          {bundleItems.map((item) => {
            const service     = findService(item.serviceId);
            // Same stored-snapshot-first priority as mainItems' `desc` above.
            const bundleDesc  = item.bundleDescription || service?.pricing?.bundle?.description || '';
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

      {/* ── Tier add-ons (selected alongside a normal Tier) ── */}
      {tierAddonItems.length > 0 && (
        <div class="cz-proposal__addons">
          <h4 class="cz-proposal__addons-heading">Optional Add-ons</h4>
          {tierAddonItems.map((item) => {
            const cycleSuffix = formatCycleLabel(item.billingCycle);

            return (
              <div key={quoteItemKey(item)} class="cz-proposal__addon">
                <div class="cz-proposal__addon-info">
                  <span class="cz-proposal__addon-title">{item.tierTitle}</span>
                  <span class="cz-proposal__addon-desc">{item.serviceTitle}</span>
                  {item.features.length > 0 && (
                    <ul class="cz-proposal__features">
                      {item.features.map((f, i) => (
                        <li key={i} class="cz-proposal__feature">{f}</li>
                      ))}
                    </ul>
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

      {familyAddonItems.length > 0 && (
        <div class="cz-proposal__addons">
          <h4 class="cz-proposal__addons-heading">Package Add-ons</h4>
          {familyAddonItems.map((item) => {
            const streams = item.legPaymentSummaries;
            const hasStreams = !!streams && streams.length > 0;
            const totalContractValue = hasStreams ? computeTotalContractValue(streams!) : null;
            return (
              <div key={quoteItemKey(item)} class="cz-proposal__addon">
                <div class="cz-proposal__addon-info">
                  <span class="cz-proposal__addon-title">{item.tierTitle}</span>
                  <span class="cz-proposal__addon-desc">
                    {item.familyTitle}{item.tierEditionTitle ? ` · ${item.tierEditionTitle}` : ''}
                  </span>
                </div>
                {hasStreams ? (
                  <div class="cz-proposal__addon-streams">
                    {streams!.map((stream, streamIndex) => (
                      <div key={streamIndex} class="cz-proposal__stream-row">
                        <span class="cz-proposal__stream-label">{chargeTypeLabel(stream.billingCycle)}</span>
                        <span class="cz-proposal__stream-value">{formatPrice(stream.price)}</span>
                      </div>
                    ))}
                    {totalContractValue !== null && (
                      <div class="cz-proposal__stream-row cz-proposal__stream-row--total">
                        <span class="cz-proposal__stream-label">Total</span>
                        <span class="cz-proposal__stream-value">{formatPrice(totalContractValue)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <span class="cz-proposal__addon-price">{item.price !== null ? formatPrice(item.price) : 'Contact for pricing'}</span>
                )}
                <FamilyInclusionsList item={item} />
              </div>
            );
          })}
        </div>
      )}

      {/* ── Totals ── */}
      <div class="cz-proposal__totals">
        {/* Multi-stream Family Contract Value/Initial Payment — sits
            ALONGSIDE the general totals block below, never replacing it, so
            a mixed cart's legacy Service/bundle/tier-addon totals stay
            visible in the printed proposal. */}
        {hasMultiStreamItem && (
          combinedFamilyTotalContractValue !== null ? (
            <div class="cz-proposal__total-row cz-proposal__total-row--primary">
              <span class="cz-proposal__total-label">Total Contract Value</span>
              <span class="cz-proposal__total-amount">{formatPrice(combinedFamilyTotalContractValue)}</span>
            </div>
          ) : (
            <>
              <div class="cz-proposal__total-row cz-proposal__total-row--primary">
                <span class="cz-proposal__total-label">Contract Value</span>
                <span class="cz-proposal__total-amount">Ongoing</span>
              </div>
              <p class="cz-proposal__contract-note">Includes charges without a fixed end date.</p>
            </>
          )
        )}
        {/* General totals — every item except a multi-stream Family one (see
            itemsForGeneralTotals above); hidden only when nothing is left to
            represent here (a cart made entirely of multi-stream Family
            items, already fully covered by the block above). Drops its own
            --primary (largest) sizing once the Family block above is also
            showing, so the document has one clear headline figure rather
            than two competing ones. */}
        {itemsForGeneralTotals.length > 0 && (
          totals.cycleEntries.length === 0 ? (
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
            <div class={`cz-proposal__total-row${hasMultiStreamItem ? '' : ' cz-proposal__total-row--primary'}`}>
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
          )
        )}

        {hasMultiStreamItem && familyStartingPayments.length > 0 && (
          <div class="cz-proposal__total-row cz-proposal__total-row--primary">
            <span class="cz-proposal__total-label">Initial Payment</span>
            <span class="cz-proposal__total-amount">{formatPrice(familyInitialPaymentTotal)}</span>
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
