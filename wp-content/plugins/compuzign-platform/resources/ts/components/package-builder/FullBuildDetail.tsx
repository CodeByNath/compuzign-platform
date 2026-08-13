import { TierInclusionCheckIcon } from '@/components/cost-builder/PricingTiers';

interface FullBuildDetailProps {
  inclusionLabels: string[];
}

/** Presentation-only disclosure of the already-compiled effective inclusions. */
export function FullBuildDetail({ inclusionLabels }: FullBuildDetailProps) {
  if (inclusionLabels.length === 0) return null;

  return (
    <details class="cz-package-builder__full-build">
      <summary>View full build</summary>
      <ul class="cz-cost-builder__tier-features">
        {inclusionLabels.map((label, index) => (
          <li key={`${label}:${index}`}>
            <TierInclusionCheckIcon />
            <span class="cz-cost-builder__tier-feature-label">{label}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
