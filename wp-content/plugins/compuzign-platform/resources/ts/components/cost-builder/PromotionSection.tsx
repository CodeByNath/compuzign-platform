import { useState } from 'preact/hooks';
import { formatPrice } from '@/utils/format';
import type { PromotionOffer } from '@/api/types/cost-builder';
import type { QuoteItem } from './types';

interface PromotionSectionProps {
  promotions: PromotionOffer[];
  serviceId: number;
  serviceTitle: string;
  categoryName: string;
  selectedPromoId: string | null;
  onAdd: (item: QuoteItem) => void;
  onRemove: (serviceId: number) => void;
}

interface PromotionCardProps {
  promo: PromotionOffer;
  serviceId: number;
  serviceTitle: string;
  categoryName: string;
  isSelected: boolean;
  onAdd: (item: QuoteItem) => void;
  onRemove: (serviceId: number) => void;
}

function PromotionCard({
  promo,
  serviceId,
  serviceTitle,
  categoryName,
  isSelected,
  onAdd,
  onRemove,
}: PromotionCardProps) {
  const [isHovering, setIsHovering] = useState(false);

  const handleSelect = () => {
    if (isSelected) {
      onRemove(serviceId);
      return;
    }
    onAdd({
      serviceId,
      serviceTitle,
      tierId: 'promotion',
      tierTitle: promo.name,
      price: promo.price,
      billingCycle: promo.billing_cycle || 'monthly',
      categoryName,
      features: [
        ...promo.inclusions.map((i) => i.label),
        ...promo.features,
      ],
      offer_type: 'promotion_tier',
      promotion_id: promo.id,
      billing_label: promo.billing_label,
    });
  };

  const showMiddle = promo.inclusions.length > 0 || promo.features.length > 0;

  return (
    <div class={`cz-promo-card${isSelected ? ' cz-promo-card--selected' : ''}${promo.is_featured ? ' cz-promo-card--featured' : ''}`}>
      <div class="cz-promo-card__grid">

        {/* ── Left: identity ───────────────────────────────────────── */}
        <div class="cz-promo-card__left">
          <div class="cz-promo-card__meta-row">
            {promo.badge && (
              <span class="cz-promo-card__badge">{promo.badge}</span>
            )}
            {promo.campaign_label && (
              <span class="cz-promo-card__campaign">{promo.campaign_label}</span>
            )}
          </div>
          <h4 class="cz-promo-card__headline">
            {promo.headline || promo.name}
          </h4>
          {promo.description && (
            <p class="cz-promo-card__description">{promo.description}</p>
          )}
          <p class="cz-promo-card__service">{serviceTitle}</p>
        </div>

        {/* ── Middle: inclusions + add-ons ─────────────────────────── */}
        {showMiddle && (
          <div class="cz-promo-card__middle">
            {promo.inclusions.length > 0 && (
              <ul class="cz-promo-card__incl-list">
                {promo.inclusions.map((inc) => (
                  <li key={inc.id} class="cz-promo-card__incl-item">
                    <span class="cz-promo-card__incl-check" aria-hidden="true">✓</span>
                    {inc.label}
                  </li>
                ))}
              </ul>
            )}

            {promo.features.length > 0 && (
              <ul class="cz-promo-card__addons-list">
                {promo.features.map((f, i) => (
                  <li key={i} class="cz-promo-card__addon-item">
                    <span class="cz-promo-card__addon-plus" aria-hidden="true">+</span>
                    {f}
                  </li>
                ))}
              </ul>
            )}

          </div>
        )}

        {/* ── Right: price + CTA ───────────────────────────────────── */}
        <div class="cz-promo-card__right">
          <div class="cz-promo-card__price-block">
            <span class="cz-promo-card__price">
              {promo.price !== null ? formatPrice(promo.price) : 'Contact Us'}
            </span>
            {promo.billing_label && promo.price !== null && (
              <span class="cz-promo-card__billing">{promo.billing_label}</span>
            )}
          </div>
          <div class="cz-promo-card__cta">
            <button
              type="button"
              class={[
                'cz-btn',
                isSelected ? 'is-selected' : 'cz-btn-primary',
                isSelected && isHovering ? 'is-removing' : '',
                'cz-promo-card__btn',
              ].filter(Boolean).join(' ')}
              onClick={handleSelect}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              {isSelected && isHovering ? '× Remove' : isSelected ? '✓ Added' : 'Add to Quote'}
            </button>
            {isSelected && (
              <p class="cz-promo-card__selected-note">Added to your quote</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export function PromotionSection({
  promotions,
  serviceId,
  serviceTitle,
  categoryName,
  selectedPromoId,
  onAdd,
  onRemove,
}: PromotionSectionProps) {
  if (promotions.length === 0) return null;

  return (
    <div class="cz-promo-section">
      <p class="cz-promo-section__label">
        Special {promotions.length === 1 ? 'Offer' : 'Offers'}
      </p>
      {promotions.map((promo) => (
        <PromotionCard
          key={promo.id}
          promo={promo}
          serviceId={serviceId}
          serviceTitle={serviceTitle}
          categoryName={categoryName}
          isSelected={selectedPromoId === promo.id}
          onAdd={onAdd}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
