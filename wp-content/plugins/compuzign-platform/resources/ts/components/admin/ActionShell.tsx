import type { ComponentChildren, ComponentType } from 'preact';
import { useState, useCallback, useRef } from 'preact/hooks';

export type ActionMode = 'modal' | 'drawer';
export type ActionProgress = 'idle' | 'loading' | 'success' | 'error';

export interface StepContext {
  stepData: Record<string, unknown>;
  setStepData: (key: string, value: unknown) => void;
  progress: ActionProgress;
  message: string;
  setProgress: (p: ActionProgress, message?: string) => void;
  setTitle: (title: string) => void;
  setFooter: (content: ComponentChildren) => void;
  goNext: () => void;
  goBack: () => void;
  close: () => void;
  setCloseGuard: (guard: (() => boolean) | null) => void;
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
  titleDot?: string;
  steps: ActionStep[];
  confirmClose?: boolean;
  hideStepHeader?: boolean;
  initialStepData?: Record<string, unknown>;
  onComplete?: (stepData: Record<string, unknown>) => void;
  onBack?: () => void;
}

interface Props {
  config: ActionConfig;
  onClose: () => void;
  onComplete: () => void;
}

// Drawer Principle v1 — outer drawer container (header, body, footer, step management)
export function ActionShell({ config, onClose, onComplete }: Props) {
  const closeGuardRef = useRef<(() => boolean) | null>(null);

  const setCloseGuard = useCallback(
    (guard: (() => boolean) | null) => { closeGuardRef.current = guard; },
    [],
  );

  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepDataMap] = useState<Record<string, unknown>>(config.initialStepData ?? {});
  const [progress, setProgressState] = useState<ActionProgress>('idle');
  const [message, setMessage] = useState('');
  const [title, setTitleState] = useState(config.title);
  const [footerContent, setFooterContent] = useState<ComponentChildren>(null);

  const setStepData = useCallback((key: string, value: unknown) => {
    setStepDataMap((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setProgress = useCallback((p: ActionProgress, msg = '') => {
    setProgressState(p);
    setMessage(msg);
  }, []);

  const setTitle = useCallback((t: string) => setTitleState(t), []);
  const setFooter = useCallback((content: ComponentChildren) => setFooterContent(content), []);

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
    if (closeGuardRef.current && !closeGuardRef.current()) return;
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
    setTitle,
    setFooter,
    goNext,
    goBack,
    close: handleClose,
    setCloseGuard,
  };

  const isMultiStep = config.steps.length > 1;

  return (
    <div
      class={`cz-action-shell cz-action-shell--${config.mode}`}
      onClick={handleBackdropClick}
    >
      <div class="cz-action-shell__panel">
        <div class="cz-action-shell__header">
          {/* Drawer Header & Navigation Contract — single left control: Back when a
              previous drawer exists (config.onBack), otherwise Close. Never both. */}
          <div class="cz-action-shell__header-start">
            {config.onBack ? (
              <button
                type="button"
                class="cz-action-shell__back"
                onClick={config.onBack}
                aria-label="Back"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
                </svg>
              </button>
            ) : (
              <button class="cz-action-shell__close" onClick={handleClose} aria-label="Close">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
          <div class="cz-action-shell__header-mid">
            {config.titleDot && (
              <span class="cz-admin-status-dot" style={`color:${config.titleDot}`} />
            )}
            <h2 class="cz-action-shell__title">{title}</h2>
          </div>
          {/* Reserved for future header actions (action centre). Intentionally empty
              per the Drawer Header & Navigation Contract — right side reserved. */}
          <div class="cz-action-shell__header-end" />
        </div>

        {isMultiStep && !config.hideStepHeader && (
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
        {footerContent}
      </div>
    </div>
  );
}
