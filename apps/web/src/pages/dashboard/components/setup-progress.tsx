import { interpolate } from '../../../features/dashboard/format';
import type { SetupProgress, SetupStepId, SetupStepState } from '../../../features/dashboard/types';
import { useI18n } from '../../../i18n';
import styles from '../dashboard-page.module.css';

type SetupProgressProps = {
  progress: SetupProgress;
  embedded?: boolean;
};

const TITLES: Record<SetupStepId, 'prepareTitle' | 'installTitle' | 'metricsTitle'> = {
  prepare: 'prepareTitle',
  install: 'installTitle',
  metrics: 'metricsTitle',
};

const BODIES: Record<SetupStepId, 'prepareBody' | 'installBody' | 'metricsBody'> = {
  prepare: 'prepareBody',
  install: 'installBody',
  metrics: 'metricsBody',
};

const STATE_COPY: Record<
  SetupStepState,
  'stateCompleted' | 'stateActive' | 'statePending' | 'stateError'
> = {
  completed: 'stateCompleted',
  active: 'stateActive',
  pending: 'statePending',
  error: 'stateError',
};

export function SetupProgress({ progress, embedded = false }: SetupProgressProps) {
  const { messages } = useI18n();
  const copy = messages.dashboard.progress;
  const label = interpolate(copy.label, { done: progress.done, total: progress.total });

  return (
    <section
      className={embedded ? styles.embeddedProgress : styles.panel}
      aria-labelledby="setup-progress-title"
      data-testid="setup-progress"
    >
      <div className={styles.progressHead}>
        <h2 id="setup-progress-title">{label}</h2>
      </div>
      <ol
        className={styles.steps}
        aria-label={interpolate(copy.aria, { done: progress.done, total: progress.total })}
      >
        {progress.steps.map((step, index) => (
          <li
            key={step.id}
            className={`${styles.step} ${styles[`step-${step.state}`]}`}
            aria-current={step.state === 'active' ? 'step' : undefined}
            data-testid={`setup-step-${step.id}`}
          >
            <span className={styles.stepIndex} aria-hidden="true">
              {step.state === 'completed' ? '✓' : index + 1}
            </span>
            <div>
              <p>{copy[TITLES[step.id]]}</p>
              <small>{copy[BODIES[step.id]]}</small>
              <span className="sr-only">{copy[STATE_COPY[step.state]]}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
