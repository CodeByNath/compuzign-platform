import '../../css/modules/homepage.css';
import { registry } from '@/runtime/registry';
import { Hero } from '@/components/homepage/Hero';
import { StatsBar } from '@/components/homepage/StatsBar';
import { ServicesOverview } from '@/components/homepage/ServicesOverview';
import { CtaBand } from '@/components/homepage/CtaBand';

registry.register({
  id: 'hero',
  component: Hero,
  conditions: [{ type: 'shortcode', mountId: 'compuzign-hero' }],
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
  id: 'cta-band',
  component: CtaBand,
  conditions: [{ type: 'shortcode', mountId: 'compuzign-cta-band' }],
});
