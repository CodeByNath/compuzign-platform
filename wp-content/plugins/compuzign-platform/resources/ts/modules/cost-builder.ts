import '../../css/modules/cost-builder.css';
import { h } from 'preact';
import { registry } from '@/runtime/registry';
import { CostBuilderApp } from '@/components/cost-builder/CostBuilderApp';

// Both mounts are the same CostBuilderApp implementation; only the grouping
// lens differs. Each wrapper takes genuinely zero props (registry.register
// requires a ComponentType with no props) and renders CostBuilderApp with
// its groupBy fixed — a partial application via h(), not a second Cost
// Builder. .ts (not .tsx), hence h() instead of JSX.
function CategoryCostBuilderApp() {
  return h(CostBuilderApp, { groupBy: 'category' });
}

registry.register({
  id: 'cost-builder',
  component: CategoryCostBuilderApp,
  conditions: [
    { type: 'shortcode', mountId: 'compuzign-cost-builder' },
  ],
});
