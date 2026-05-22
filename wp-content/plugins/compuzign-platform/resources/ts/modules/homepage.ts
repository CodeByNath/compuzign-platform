import '../../css/modules/homepage.css';
import { registry } from '@/runtime/registry';
import { Hero } from '@/components/homepage/Hero';
import { StatsBar } from '@/components/homepage/StatsBar';
import { ServicesOverview } from '@/components/homepage/ServicesOverview';
import { TrustStrip } from '@/components/homepage/TrustStrip';
import { HomeIntro } from '@/components/homepage/HomeIntro';
import { WhyChoose } from '@/components/homepage/WhyChoose';
import { ServicesEditorial } from '@/components/homepage/ServicesEditorial';
import { CtaBand } from '@/components/homepage/CtaBand';
import { ResultsMetrics } from '@/components/homepage/ResultsMetrics';
import { IndustriesGrid } from '@/components/homepage/IndustriesGrid';
import { CaseStudies } from '@/components/homepage/CaseStudies';
import { AssessmentForm } from '@/components/homepage/AssessmentForm';

registry.register({
  id: 'hero',
  component: Hero,
  conditions: [{ type: 'shortcode', mountId: 'compuzign-hero' }],
});

registry.register({
  id: 'intro',
  component: HomeIntro,
  conditions: [{ type: 'shortcode', mountId: 'compuzign-intro' }],
});

registry.register({
  id: 'why',
  component: WhyChoose,
  conditions: [{ type: 'shortcode', mountId: 'compuzign-why' }],
});

registry.register({
  id: 'services-list',
  component: ServicesEditorial,
  conditions: [{ type: 'shortcode', mountId: 'compuzign-services-list' }],
});

registry.register({
  id: 'trust',
  component: TrustStrip,
  conditions: [{ type: 'shortcode', mountId: 'compuzign-trust' }],
});

registry.register({
  id: 'stats',
  component: StatsBar,
  conditions: [{ type: 'shortcode', mountId: 'compuzign-stats' }],
});

registry.register({
  id: 'services-overview',
  component: ServicesOverview,
  conditions: [{ type: 'shortcode', mountId: 'compuzign-services-overview' }],
});

registry.register({
  id: 'results',
  component: ResultsMetrics,
  conditions: [{ type: 'shortcode', mountId: 'compuzign-results' }],
});

registry.register({
  id: 'industries',
  component: IndustriesGrid,
  conditions: [{ type: 'shortcode', mountId: 'compuzign-industries' }],
});

registry.register({
  id: 'case-studies',
  component: CaseStudies,
  conditions: [{ type: 'shortcode', mountId: 'compuzign-case-studies' }],
});

registry.register({
  id: 'assessment',
  component: AssessmentForm,
  conditions: [{ type: 'shortcode', mountId: 'compuzign-assessment' }],
});

registry.register({
  id: 'cta-band',
  component: CtaBand,
  conditions: [{ type: 'shortcode', mountId: 'compuzign-cta-band' }],
});
