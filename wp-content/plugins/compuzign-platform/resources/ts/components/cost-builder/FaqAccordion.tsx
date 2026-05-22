import { useState } from 'preact/hooks';

const FAQ = [
  {
    q: 'What is included in Managed IT Services?',
    a: 'Our Managed IT Services include 24/7 monitoring, help desk support, patch management, and proactive maintenance across your entire IT environment.',
  },
  {
    q: 'How quickly can services be onboarded?',
    a: 'Most clients are fully onboarded within 2–4 weeks, depending on environment complexity and size.',
  },
  {
    q: 'Are contracts required?',
    a: 'We offer flexible month-to-month and annual agreements. Annual plans include a discount and priority support upgrades.',
  },
  {
    q: 'Can I mix tiers across different services?',
    a: 'Yes — each service is quoted independently, so you can choose Basic for one service and Premium for another.',
  },
  {
    q: 'What regions do you support?',
    a: 'CompuZign delivers IT services across the United States, the Caribbean, and the Middle East.',
  },
  {
    q: 'What happens after I submit a quote?',
    a: 'Our team contacts you within one business day to review your requirements, confirm pricing, and schedule an onboarding call.',
  },
] as const;

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section class="cz-cost-builder__faq">
      <h2 class="cz-cost-builder__faq-heading">Frequently Asked Questions</h2>
      <div class="cz-cost-builder__faq-list">
        {FAQ.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={i} class={`cz-cost-builder__faq-item${isOpen ? ' is-open' : ''}`}>
              <button
                type="button"
                class="cz-cost-builder__faq-trigger"
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? null : i)}
              >
                <span class="cz-cost-builder__faq-question">{item.q}</span>
                <span class="cz-cost-builder__faq-icon" aria-hidden="true">
                  {isOpen ? '−' : '+'}
                </span>
              </button>
              <div class="cz-cost-builder__faq-panel" aria-hidden={!isOpen}>
                <p class="cz-cost-builder__faq-answer">{item.a}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
