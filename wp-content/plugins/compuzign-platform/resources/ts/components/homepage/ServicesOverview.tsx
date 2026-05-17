import { getRuntimeConfig } from '@/runtime/config';

interface ServiceCategory {
  icon: string;
  title: string;
  description: string;
  slug: string;
}

const CATEGORIES: ServiceCategory[] = [
  {
    icon: '🖥️',
    title: 'Managed IT Services',
    description:
      'End-to-end management of your IT environment — from helpdesk and endpoint security to network monitoring and patch management.',
    slug: 'managed-it-services',
  },
  {
    icon: '☁️',
    title: 'Cloud Solutions',
    description:
      'Cloud migration, infrastructure-as-code, and multi-cloud management across AWS, Azure, and GCP tailored to your workloads.',
    slug: 'cloud-solutions',
  },
  {
    icon: '🔒',
    title: 'Cybersecurity',
    description:
      'Proactive threat detection, vulnerability assessments, compliance auditing, and incident response to keep your business protected.',
    slug: 'cybersecurity',
  },
  {
    icon: '🤝',
    title: 'Support & Consulting',
    description:
      'Flexible IT consulting, project management, and on-demand support to complement your in-house team and accelerate delivery.',
    slug: 'support-consulting',
  },
];

export function ServicesOverview() {
  const config = getRuntimeConfig();
  const costBuilderUrl = config?.costBuilderUrl ?? '/services/';

  return (
    <section class="cz-services-overview">
      <div class="cz-container">
        <div class="cz-services-overview__header">
          <span class="cz-eyebrow">What We Do</span>
          <h2 class="cz-heading-lg cz-services-overview__heading">
            Services built for scale
          </h2>
          <p class="cz-copy cz-services-overview__sub">
            Four practice areas. One integrated platform. Priced transparently.
          </p>
        </div>
        <div class="cz-grid cz-grid-4 cz-services-overview__grid">
          {CATEGORIES.map((cat) => (
            <article key={cat.slug} class="cz-card cz-service-card">
              <div class="cz-service-card__icon" aria-hidden="true">{cat.icon}</div>
              <h3 class="cz-service-card__title">{cat.title}</h3>
              <p class="cz-service-card__desc">{cat.description}</p>
              <a
                href={`${costBuilderUrl}#${cat.slug}`}
                class="cz-service-card__link"
              >
                View Plans <span aria-hidden="true">→</span>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
