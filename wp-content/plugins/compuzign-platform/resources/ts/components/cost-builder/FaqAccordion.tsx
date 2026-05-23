import { useState } from 'preact/hooks';
import type { ServiceFaq } from '@/api/types/cost-builder';

interface FaqAccordionProps {
  faqs: ServiceFaq[];
}

export function FaqAccordion({ faqs }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!faqs.length) {
    return null;
  }

  return (
    <section class="cz-cost-builder__faq">
      <h2 class="cz-cost-builder__faq-heading">Frequently Asked Questions</h2>
      <div class="cz-cost-builder__faq-list">
        {faqs.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={item.id} class={`cz-cost-builder__faq-item${isOpen ? ' is-open' : ''}`}>
              <button
                type="button"
                class="cz-cost-builder__faq-trigger"
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? null : i)}
              >
                <span class="cz-cost-builder__faq-question">{item.question}</span>
                <span class="cz-cost-builder__faq-icon" aria-hidden="true">
                  {isOpen ? '−' : '+'}
                </span>
              </button>
              <div class="cz-cost-builder__faq-panel" aria-hidden={!isOpen}>
                <p class="cz-cost-builder__faq-answer">{item.answer}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
