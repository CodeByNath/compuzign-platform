import type { ComponentType } from 'preact';
import { useState, useCallback } from 'preact/hooks';

export type ActionMode = 'modal' | 'drawer';
export type ActionProgress = 'idle' | 'loading' | 'success' | 'error';

export interface StepContext {
  stepData: Record<string, unknown>;
  setStepData: (key: string, value: unknown) => void;
  progress: ActionProgress;
  message: string;
  setProgress: (p: ActionProgress, message?: string) => void;
  goNext: () => void;
  goBack: () => void;
  close: () => void;
}

export interface ActionStep {
  id: string;
  title: string;
  component: ComponentType<{ ctx: StepContext }>;
}

export interface ActionConfig {
  id: string;
  mode: ActionMode;
  title: string;
  steps: ActionStep[];
  confirmClose?: boolean;
  initialStepData?: Record<string, unknown>;
  onComplete?: (stepData: Record<string, unknown>) => void;
  onBack?: () => void;
}

interface Props {
  config: ActionConfig;
  onClose: () => void;
  onComplete: () => void;
}

export function ActionShell({ config, onClose, onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepDataMap] = useState<Record<string, unknown>>(config.initialStepData ?? {});
  const [progress, setProgressState] = useState<ActionProgress>('idle');
  const [message, setMessage] = useState('');

  const setStepData = useCallback((key: string, value: unknown) => {
    setStepDataMap((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setProgress = useCallback((p: ActionProgress, msg = '') => {
    setProgressState(p);
    setMessage(msg);
  }, []);

  const goNext = useCallback(() => {
    if (currentStep < config.steps.length - 1) {
      setCurrentStep((s) => s + 1);
      setProgress('idle');
    } else {
      config.onComplete?.(stepData);
      onComplete();
    }
  }, [currentStep, config, stepData, onComplete, setProgress]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      setProgress('idle');
    }
  }, [currentStep, setProgress]);

  const handleClose = useCallback(() => {
    if (config.confirmClose && progress === 'loading') {
      if (!window.confirm('An operation is in progress. Close anyway?')) return;
    }
    onClose();
  }, [config.confirmClose, progress, onClose]);

  const handleBackdropClick = (e: MouseEvent) => {
    if (config.mode === 'modal' && e.target === e.currentTarget) handleClose();
  };

  const step = config.steps[currentStep];
  const StepComponent = step.component;
  const ctx: StepContext = {
    stepData,
    setStepData,
    progress,
    message,
    setProgress,
    goNext,
    goBack,
    close: handleClose,
  };

  const isMultiStep = config.steps.length > 1;

  return (
    <div
      class={`cz-action-shell cz-action-shell--${config.mode}`}
      onClick={handleBackdropClick}
    >
      <div class="cz-action-shell__panel">
        <div class="cz-action-shell__header">
          <div class="cz-action-shell__header-left">
            {config.onBack && (
              <button
                type="button"
                class="cz-action-shell__back"
                onClick={config.onBack}
                aria-label="Back"
              >
                ← Back
              </button>
            )}
            <h2 class="cz-action-shell__title">{config.title}</h2>
            {isMultiStep && (
              <div class="cz-action-shell__step-dots">
                {config.steps.map((s, i) => (
                  <span
                    key={s.id}
                    class={[
                      'cz-action-shell__step-dot',
                      i === currentStep ? 'cz-action-shell__step-dot--active' : '',
                      i < currentStep ? 'cz-action-shell__step-dot--done' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  />
                ))}
              </div>
            )}
          </div>
          <button class="cz-action-shell__close" onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </div>

        {isMultiStep && (
          <div class="cz-action-shell__step-header">
            <span class="cz-action-shell__step-label">{step.title}</span>
            <span class="cz-action-shell__step-count">
              {currentStep + 1} / {config.steps.length}
            </span>
          </div>
        )}

        <div class="cz-action-shell__body">
          <StepComponent ctx={ctx} />
        </div>
      </div>
    </div>
  );
}
