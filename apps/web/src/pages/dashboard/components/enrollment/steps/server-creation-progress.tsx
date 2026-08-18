import { CheckIcon, ClockIcon, WarningIcon } from '../../../../../features/dashboard/icons';
import type { WizardPhase } from '../../../../../features/enrollment/types';
import { useI18n } from '../../../../../i18n';
import styles from '../enrollment-wizard.module.css';

type ServerCreationProgressProps = {
  phase: WizardPhase;
  timedOut?: boolean;
};

const STEPS = [
  { id: 'creating_server', label: 'progressCreate' },
  { id: 'installing_agent', label: 'progressConnect' },
  { id: 'issuing', label: 'progressInstall' },
  { id: 'waiting_heartbeat', label: 'progressHeartbeat' },
  { id: 'success', label: 'progressFinish' },
] as const;

export function ServerCreationProgress({ phase, timedOut }: ServerCreationProgressProps) {
  const { messages } = useI18n();
  const copy = messages.servers.create;
  const order: WizardPhase[] = [
    'creating_server',
    'installing_agent',
    'waiting_heartbeat',
    'success',
  ];
  const currentIndex =
    phase === 'partial_success' || phase === 'error'
      ? order.indexOf('waiting_heartbeat')
      : Math.max(order.indexOf(phase), 0);

  return (
    <ol className={styles.progressList} data-testid="server-creation-progress" aria-live="polite">
      {STEPS.map((item, index) => {
        const running =
          (item.id === 'creating_server' && phase === 'creating_server') ||
          (item.id === 'installing_agent' && phase === 'installing_agent') ||
          (item.id === 'issuing' && phase === 'installing_agent') ||
          (item.id === 'waiting_heartbeat' && phase === 'waiting_heartbeat') ||
          (item.id === 'success' && phase === 'success');
        const done = index < currentIndex || phase === 'success';
        const warn = item.id === 'waiting_heartbeat' && (timedOut || phase === 'partial_success');
        return (
          <li
            key={item.id}
            data-state={running ? 'running' : done ? 'success' : warn ? 'warning' : 'waiting'}
          >
            {warn ? <WarningIcon /> : done ? <CheckIcon /> : <ClockIcon />}
            <span>{copy[item.label]}</span>
          </li>
        );
      })}
    </ol>
  );
}
