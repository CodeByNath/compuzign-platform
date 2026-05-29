import { useState } from 'preact/hooks';
import { useCostBuilder } from '@/hooks/useCostBuilder';
import { submitAssessment } from '@/api/endpoints/requests';

const CHECKS = [
  'Full IT performance overview',
  'Security risk summary',
  'Backup readiness review',
  'Compliance gap report',
  'Prioritised improvement recommendations',
  'Optional penetration test request',
] as const;

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

export function AssessmentForm() {
  const { data: cbData, loading: cbLoading } = useCostBuilder();
  const categories = cbData?.categories ?? [];

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [company,  setCompany]  = useState('');
  const [category, setCategory] = useState('');
  const [status,   setStatus]   = useState<FormStatus>('idle');
  const [errMsg,   setErrMsg]   = useState('');

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (status === 'submitting') return;
    setStatus('submitting');
    setErrMsg('');

    try {
      await submitAssessment({
        type:      'free_it_assessment',
        contact:   name.trim(),
        email:     email.trim(),
        company:   company.trim(),
        category:  category.trim(),
        phone:     '',
        notes:     '',
        quote_ref: '',
      });
      setStatus('success');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Submission failed. Please try again.');
      setStatus('error');
    }
  }

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

          <div class="cz-home-assessment__form">
            {status === 'success' ? (
              <div class="cz-home-assessment__result">
                <span class="cz-eyebrow">Request submitted</span>
                <p class="cz-home-assessment__intro" style={{ marginTop: 'var(--cz-space-4)' }}>
                  Thank you. We'll be in touch within one business day to schedule your
                  free IT assessment.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div class="cz-home-assessment__field">
                  <input
                    class="cz-home-assessment__input"
                    type="text"
                    placeholder="Full name"
                    name="full-name"
                    required
                    value={name}
                    onInput={(e) => setName((e.target as HTMLInputElement).value)}
                    disabled={status === 'submitting'}
                  />
                </div>
                <div class="cz-home-assessment__field">
                  <input
                    class="cz-home-assessment__input"
                    type="email"
                    placeholder="Business email"
                    name="email"
                    required
                    value={email}
                    onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                    disabled={status === 'submitting'}
                  />
                </div>
                <div class="cz-home-assessment__field">
                  <input
                    class="cz-home-assessment__input"
                    type="text"
                    placeholder="Company name"
                    name="company"
                    value={company}
                    onInput={(e) => setCompany((e.target as HTMLInputElement).value)}
                    disabled={status === 'submitting'}
                  />
                </div>
                <div class="cz-home-assessment__field">
                  <select
                    class="cz-home-assessment__select"
                    name="category"
                    value={category}
                    onChange={(e) => setCategory((e.target as HTMLSelectElement).value)}
                    disabled={status === 'submitting' || cbLoading}
                  >
                    <option value="">
                      {cbLoading ? 'Loading categories…' : 'Service area (optional)'}
                    </option>
                    {categories.map((cat) => (
                      <option key={cat.slug} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {status === 'error' && errMsg && (
                  <p class="cz-home-assessment__error">{errMsg}</p>
                )}

                <button
                  class="cz-btn cz-btn-primary cz-home-assessment__submit"
                  type="submit"
                  disabled={status === 'submitting'}
                >
                  {status === 'submitting' ? 'Submitting…' : 'Request Your Free IT Assessment'}
                </button>
              </form>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
