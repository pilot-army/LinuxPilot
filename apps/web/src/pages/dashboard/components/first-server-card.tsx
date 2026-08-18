import { useId, useState } from 'react';
import {
  ChartIcon,
  ServersIcon,
  ShieldIcon,
  TerminalIcon,
} from '../../../features/dashboard/icons';
import type { SetupProgress as SetupProgressData } from '../../../features/dashboard/types';
import { useI18n } from '../../../i18n';
import { Button } from '../../../shared/ui/button';
import { SetupProgress } from './setup-progress';
import styles from '../dashboard-page.module.css';

type FirstServerCardProps = {
  canCreate: boolean;
  unknownServers: boolean;
  progress: SetupProgressData;
  onAddServer: () => void;
};

export function FirstServerCard({
  canCreate,
  unknownServers,
  progress,
  onAddServer,
}: FirstServerCardProps) {
  const { messages } = useI18n();
  const copy = messages.dashboard.firstServer;
  const help = messages.dashboard.help;
  const [docsOpen, setDocsOpen] = useState(false);
  const docsId = useId();
  const title = unknownServers ? copy.titleUnknown : copy.title;

  return (
    <section
      className={`${styles.panel} ${styles.heroPanel}`}
      aria-labelledby="first-server-title"
      data-testid="first-server-card"
    >
      <div className={styles.heroCopy}>
        <h2 id="first-server-title">{title}</h2>
        <p className={styles.cardBody}>{copy.body}</p>
      </div>
      <ol className={styles.flow} aria-label={copy.schema}>
        <FlowStep icon={TerminalIcon} label={copy.flowCommand} tone="terminal" />
        <li className={styles.flowArrow} aria-hidden="true" />
        <FlowStep icon={ShieldIcon} label={copy.flowSecure} tone="secure" />
        <li className={styles.flowArrow} aria-hidden="true" />
        <FlowStep icon={ServersIcon} label={copy.flowServer} tone="server" />
        <li className={styles.flowArrow} aria-hidden="true" />
        <FlowStep icon={ChartIcon} label={copy.flowMetrics} tone="metrics" />
      </ol>
      <div className={styles.cardActions}>
        {canCreate ? (
          <Button block={false} data-testid="onboarding-add-server" onClick={onAddServer}>
            {messages.dashboard.actions.addServer}
          </Button>
        ) : null}
        <Button
          variant="secondary"
          block={false}
          aria-expanded={docsOpen}
          aria-controls={docsOpen ? docsId : undefined}
          data-testid="onboarding-view-docs"
          onClick={() => setDocsOpen((open) => !open)}
        >
          {messages.dashboard.actions.viewDocs}
        </Button>
      </div>
      {docsOpen ? (
        <div
          className={styles.helpDetails}
          id={docsId}
          role="region"
          aria-label={help.requirementsTitle}
        >
          <p className={styles.emptyTitle}>{help.requirementsTitle}</p>
          <p className={styles.cardBody}>{help.requirementsBody}</p>
        </div>
      ) : null}
      <SetupProgress progress={progress} embedded />
    </section>
  );
}

function FlowStep({
  icon: Icon,
  label,
  tone,
}: {
  icon: typeof TerminalIcon;
  label: string;
  tone: 'terminal' | 'secure' | 'server' | 'metrics';
}) {
  return (
    <li className={styles.flowStep}>
      <span className={`${styles.flowIcon} ${styles[`flow-${tone}`]}`} aria-hidden="true">
        <Icon />
      </span>
      <span>{label}</span>
    </li>
  );
}
