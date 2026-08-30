import '../../css/modules/cost-builder.css';
import { registry } from '@/runtime/registry';
import { CostBuilderApp } from '@/components/cost-builder/CostBuilderApp';
import { PackageBuilderApp } from '@/components/package-builder/PackageBuilderApp';
import { QuoteViewApp } from '@/components/quote-view/QuoteViewApp';

registry.register({
  id: 'cost-builder',
  component: CostBuilderApp,
  conditions: [
    { type: 'shortcode', mountId: 'compuzign-cost-builder' },
  ],
});

registry.register({
  id: 'package-builder',
  component: PackageBuilderApp,
  conditions: [
    { type: 'shortcode', mountId: 'compuzign-package-builder' },
  ],
});

// Phase 8J-C2: shares this bundle rather than a new build entry/AssetLoader
// registration — reuses the same CartItem/QuoteProposalPreview/print-CSS
// this module already ships. Registered by RequestsModule.php's shortcode,
// not CostBuilderModule's.
registry.register({
  id: 'quote-view',
  component: QuoteViewApp,
  conditions: [
    { type: 'shortcode', mountId: 'compuzign-quote-view' },
  ],
});
