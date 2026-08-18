import type { ReactNode } from 'react';
import { INSTALL_GUIDE_URL } from '../../../features/enrollment/command';
import {
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  CpuIcon,
  DocsIcon,
  DownloadIcon,
  FolderIcon,
  KeyIcon,
  LinuxIcon,
  OperationsIcon,
  ServersIcon,
  ShieldIcon,
  UsersIcon,
} from '../../../features/dashboard/icons';
import { useI18n } from '../../../i18n';
import { ServersOnboardingIllustration } from './servers-onboarding-illustration';
import styles from '../servers-page.module.css';

type ServersEmptyStateProps = {
  canCreate: boolean;
  onAddServer?: () => void;
  onImport?: () => void;
};

export function ServersEmptyState({ canCreate, onAddServer, onImport }: ServersEmptyStateProps) {
  const { messages } = useI18n();
  const copy = messages.servers.list;
  const steps: { title: string; body: string; icon: ReactNode }[] = [
    { title: copy.emptyStepDataTitle, body: copy.emptyStepDataBody, icon: <ServersIcon /> },
    { title: copy.emptyStepSshTitle, body: copy.emptyStepSshBody, icon: <KeyIcon /> },
    { title: copy.emptyStepAgentTitle, body: copy.emptyStepAgentBody, icon: <DownloadIcon /> },
    { title: copy.emptyStepReadyTitle, body: copy.emptyStepReadyBody, icon: <CheckIcon /> },
  ];
  const after: { label: string; icon: ReactNode }[] = [
    { label: copy.emptyAfterLive, icon: <ServersIcon /> },
    { label: copy.emptyAfterMetrics, icon: <CpuIcon /> },
    { label: copy.emptyAfterGroups, icon: <FolderIcon /> },
    { label: copy.emptyAfterBulk, icon: <OperationsIcon /> },
    { label: copy.emptyAfterMaintenance, icon: <CalendarIcon /> },
    { label: copy.emptyAfterAudit, icon: <DocsIcon /> },
  ];
  const support: { label: string; icon: ReactNode }[] = [
    { label: copy.emptySupportDistros, icon: <LinuxIcon /> },
    { label: copy.emptySupportToken, icon: <ShieldIcon /> },
    { label: copy.emptySupportFingerprint, icon: <KeyIcon /> },
    { label: copy.emptySupportAgent, icon: <UsersIcon /> },
  ];

  return (
    <div className={styles.onboarding} data-testid="servers-empty">
      <section className={styles.onboardingHero} aria-labelledby="servers-empty-title">
        <ServersOnboardingIllustration label={copy.emptyIllustration} />
        <div className={styles.onboardingCopy}>
          <h2 id="servers-empty-title">{copy.emptyTitle}</h2>
          <p>{canCreate ? copy.emptyBody : copy.emptyForbidden}</p>
          <div className={styles.onboardingActions}>
            {canCreate ? (
              <button
                type="button"
                className={styles.addLink}
                data-testid="empty-add-server"
                onClick={onAddServer}
              >
                {copy.emptyAction}
                <ArrowRightIcon />
              </button>
            ) : null}
            {canCreate ? (
              <button
                type="button"
                className={styles.secondaryLink}
                data-testid="empty-import"
                onClick={onImport}
              >
                {copy.emptyImport}
              </button>
            ) : null}
          </div>
          <a
            className={styles.docsLink}
            href={INSTALL_GUIDE_URL}
            target="_blank"
            rel="noreferrer"
            data-testid="empty-view-docs"
          >
            <DocsIcon />
            {copy.emptyDocs}
          </a>
        </div>
      </section>
      <ol className={styles.onboardingSteps} aria-label={copy.emptyTitle}>
        {steps.map((step, index) => (
          <li key={step.title}>
            <div className={styles.stepHead}>
              <span className={styles.stepIcon} aria-hidden="true">
                {step.icon}
              </span>
              <span className={styles.stepLine} aria-hidden="true" />
            </div>
            <div className={styles.stepCopy}>
              <p>
                <span className={styles.stepIndex}>{index + 1}</span> {step.title}
              </p>
              <small>{step.body}</small>
            </div>
          </li>
        ))}
      </ol>
      <div className={styles.onboardingCards}>
        <article className={styles.infoCard}>
          <h3>{copy.emptyAfterTitle}</h3>
          <ul className={styles.afterGrid}>
            {after.map((item) => (
              <li key={item.label}>
                <span className={styles.infoIcon} aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </article>
        <article className={styles.infoCard}>
          <h3>{copy.emptySupportTitle}</h3>
          <ul className={styles.supportList}>
            {support.map((item) => (
              <li key={item.label}>
                <span className={styles.infoIcon} aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </div>
  );
}
