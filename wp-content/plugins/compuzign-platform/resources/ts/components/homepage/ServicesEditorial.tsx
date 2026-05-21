import { getRuntimeConfig } from '@/runtime/config';

const SERVICES = [
  {
    index: '01',
    name: 'iCUG — Infrastructure Utility Grid',
    desc: "CompuZign’s proprietary IaaS/DCaaS platform. Multi-region, grid-based architecture for data protection, isolation, and rapid recovery — no CapEx required.",
    key: 'icug',
  },
  {
    index: '02',
    name: 'Managed IT Services',
    desc: '24/7 monitoring, maintenance, and management of your entire IT environment.',
    key: 'managed-it',
  },
  {
    index: '03',
    name: 'Help Desk & End-User Support',
    desc: 'Fast, friendly support for your team. Average response time under 15 minutes.',
    key: 'help-desk',
  },
  {
    index: '04',
    name: 'Cybersecurity & Threat Protection',
    desc: 'Layered endpoint security powered by SentinelOne and CrowdStrike. 24/7 monitoring and incident response.',
    key: 'cybersecurity',
  },
  {
    index: '05',
    name: 'Cloud Migration & Microsoft 365',
    desc: 'Emails, documents, and workloads moved to the cloud cleanly, with zero data loss.',
    key: 'cloud',
  },
  {
    index: '06',
    name: 'Backup & Disaster Recovery',
    desc: 'Automated, encrypted, tested. When the unexpected happens, you are back online fast.',
    key: 'backup',
  },
  {
    index: '07',
    name: 'IT Strategy & Virtual CIO',
    desc: 'Technology roadmaps, budget planning, and compliance guidance for leadership teams.',
    key: 'vcio',
  },
] as const;

export function ServicesEditorial() {
  const config = getRuntimeConfig();
  const costBuilderUrl = config?.costBuilderUrl ?? '/services/';

  return (
    <section class="cz-home-svc" id="services">
      <div class="cz-container">
        <div class="cz-home-svc__header">
          <div class="cz-home-svc__header-left">
            <span class="cz-eyebrow">Our Services</span>
            <h2 class="cz-heading-xl cz-home-svc__heading">
              Everything your business needs.<br />One partner.
            </h2>
          </div>
          <p class="cz-home-svc__intro">
            From infrastructure and help desk support to cybersecurity,
            cloud migration, disaster recovery and fintech automation,
            CompuZign brings critical IT functions together under one
            accountable team.
          </p>
        </div>

        <div class="cz-home-svc__list">
          {SERVICES.map((svc) => (
            <a
              class="cz-home-svc__row"
              href={costBuilderUrl}
              data-service={svc.key}
            >
              <div class="cz-home-svc__index">{svc.index}</div>
              <div class="cz-home-svc__name">{svc.name}</div>
              <div class="cz-home-svc__desc">{svc.desc}</div>
              <div class="cz-home-svc__arrow" aria-hidden="true">&rarr;</div>
            </a>
          ))}

          <a
            class="cz-home-svc__row cz-home-svc__row--browse"
            href={costBuilderUrl}
          >
            <div class="cz-home-svc__index">08</div>
            <div class="cz-home-svc__name">Browse All Services</div>
            <div class="cz-home-svc__desc">
              Explore the full service catalogue and build a transparent estimate in the Cost Builder.
            </div>
            <div class="cz-home-svc__arrow" aria-hidden="true">&rarr;</div>
          </a>
        </div>
      </div>
    </section>
  );
}
