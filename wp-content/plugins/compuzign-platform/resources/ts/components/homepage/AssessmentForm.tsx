const CHECKS = [
  'Full IT performance overview',
  'Security risk summary',
  'Backup readiness review',
  'Compliance gap report',
  'Prioritised improvement recommendations',
  'Optional penetration test request',
] as const;

export function AssessmentForm() {
  return (
    <section class="cz-home-assessment" id="assessment">
      <div class="cz-container">
        <div class="cz-home-assessment__box">

          <div class="cz-home-assessment__left">
            <span class="cz-eyebrow">Free IT Assessment</span>
            <h2 class="cz-heading-xl cz-home-assessment__heading">
              Know exactly where your IT stands at no cost.
            </h2>
            <p class="cz-home-assessment__intro">
              No sales pitch. No obligation. An honest review of your systems'
              performance, security, backup, and compliance gaps, delivered in
              plain language.
            </p>
            <ul class="cz-home-assessment__checks">
              {CHECKS.map((item) => (
                <li class="cz-home-assessment__check">{item}</li>
              ))}
            </ul>
          </div>

          <form class="cz-home-assessment__form" action="#" method="post">
            <div class="cz-home-assessment__field">
              <input
                class="cz-home-assessment__input"
                type="text"
                placeholder="Full name"
                name="full-name"
                required
              />
            </div>
            <div class="cz-home-assessment__field">
              <input
                class="cz-home-assessment__input"
                type="email"
                placeholder="Business email"
                name="email"
                required
              />
            </div>
            <div class="cz-home-assessment__field">
              <input
                class="cz-home-assessment__input"
                type="text"
                placeholder="Company name"
                name="company"
              />
            </div>
            <div class="cz-home-assessment__field">
              <select class="cz-home-assessment__select" name="request-type">
                <option value="" disabled>Request type</option>
                <option value="assessment">Free IT Assessment</option>
                <option value="pentest">Free Penetration Test</option>
                <option value="consultation">Book Consultation</option>
              </select>
            </div>
            <button class="cz-btn cz-btn-primary cz-home-assessment__submit" type="submit">
              Request Your Free IT Assessment
            </button>
          </form>

        </div>
      </div>
    </section>
  );
}
