import { getRuntimeConfig } from '@/runtime/config';

export function SupportBar() {
  const config = getRuntimeConfig();
  const supportUrl = config?.contactUrl ?? '/contact/';

  return (
    <section class="cz-home-support">
      <div class="cz-container cz-home-support__inner">
        <div class="cz-home-support__text">
          <h3 class="cz-home-support__heading">
            24/7 IT Support — US · Caribbean · Middle East
          </h3>
          <p class="cz-home-support__copy">
            Something needs attention right now? Our team is standing by – day, night, and weekends.
          </p>
        </div>
        <div class="cz-home-support__actions">
          <a class="cz-btn cz-btn-secondary" href={supportUrl}>Submit Support Request</a>
          <a class="cz-btn cz-btn-primary"   href="#">Access Client Portal</a>
        </div>
      </div>
    </section>
  );
}
