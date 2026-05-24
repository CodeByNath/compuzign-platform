interface StepDef {
  label: string;
  description: string;
}

interface StepIndicatorProps {
  steps: StepDef[];
  current: number; // 0-indexed
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <nav class="cz-si" aria-label="Progress">
      <ol class="cz-si__list">
        {steps.map((step, i) => {
          const isActive = i === current;
          const isDone   = i < current;
          return (
            <li
              key={i}
              class={[
                'cz-si__step',
                isActive ? 'cz-si__step--active' : '',
                isDone   ? 'cz-si__step--done'   : '',
              ].filter(Boolean).join(' ')}
              aria-current={isActive ? 'step' : undefined}
            >
              <span class="cz-si__num" aria-hidden="true">
                {isDone ? '✓' : i + 1}
              </span>
              <span class="cz-si__labels">
                <span class="cz-si__label">{step.label}</span>
                <span class="cz-si__desc">{step.description}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
