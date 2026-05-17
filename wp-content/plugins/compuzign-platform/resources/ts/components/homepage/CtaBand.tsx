import { getRuntimeConfig } from '@/runtime/config';

export function CtaBand() {
  const config = getRuntimeConfig();
  const costBuilderUrl = config?.costBuilderUrl ?? '/services/';
  const contactUrl = config?.contactUrl ?? '/contact/';

  return (
    <section class="cz-cta-band">
      <div class="cz-container cz-cta-band__inner">
        <h2 class="cz-heading-lg cz-cta-band__heading">
          Ready to modernise your IT?
        </h2>
        <p class="cz-copy cz-cta-band__sub">
          Get a transparent, itemised quote in minutes — no sales call required.
        </p>
        <div class="cz-row cz-cta-band__actions">
          <a href={costBuilderUrl} class="cz-btn cz-btn-primary">Build My Quote</a>
          <a href={contactUrl} class="cz-btn cz-btn-secondary">Schedule a Call</a>
        </div>
      </div>
    </section>
  );
}
