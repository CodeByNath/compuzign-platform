import { getRuntimeConfig } from '@/runtime/config';

export function Hero() {
  const config = getRuntimeConfig();
  const costBuilderUrl = config?.costBuilderUrl ?? '/services/';
  const contactUrl = config?.contactUrl ?? '/contact/';

  return (
    <section class="cz-hero">
      <div class="cz-container cz-hero__inner">
        <span class="cz-eyebrow">Enterprise IT &amp; Cloud Solutions</span>
        <h1 class="cz-heading-xl cz-hero__heading">
          Technology that<br />
          <span class="cz-accent">scales with you.</span>
        </h1>
        <p class="cz-copy cz-hero__sub">
          Managed IT services, cloud infrastructure, and cybersecurity — purpose-built
          for growing businesses. One partner across every layer of your stack.
        </p>
        <div class="cz-hero__actions cz-row">
          <a href={costBuilderUrl} class="cz-btn cz-btn-primary">Build Your Plan</a>
          <a href={contactUrl} class="cz-btn cz-btn-secondary">Talk to an Expert</a>
        </div>
      </div>
    </section>
  );
}
