import type { ReactNode } from 'react';
import { INSTALL_GUIDE_URL } from '../../../../features/enrollment/command';
import {
  DocsIcon,
  FolderIcon,
  OperationsIcon,
  PlusIcon,
  ServersIcon,
  ShieldIcon,
  CheckIcon,
} from '../../../../features/dashboard/icons';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui/button';
import { SpacesOnboardingIllustration } from './spaces-onboarding-illustration';
import styles from '../../server-spaces-page.module.css';

type NoServersStateProps = {
  canCreateServer: boolean;
  onAddServer?: () => void;
  onImport?: () => void;
};

export function NoServersState({ canCreateServer, onAddServer, onImport }: NoServersStateProps) {
  const { messages } = useI18n();
  const copy = messages.servers.groups;
  const steps: { title: string; body: string; icon: ReactNode }[] = [
    { title: copy.stepAddTitle, body: copy.stepAddBody, icon: <ServersIcon /> },
    { title: copy.stepCreateTitle, body: copy.stepCreateBody, icon: <FolderIcon /> },
    { title: copy.stepAssignTitle, body: copy.stepAssignBody, icon: <PlusIcon /> },
    { title: copy.stepManageTitle, body: copy.stepManageBody, icon: <CheckIcon /> },
  ];
  const capabilities: { label: string; icon: ReactNode }[] = [
    { label: copy.capabilityOrganize, icon: <FolderIcon /> },
    { label: copy.capabilityOperations, icon: <OperationsIcon /> },
    { label: copy.capabilityTemplates, icon: <DocsIcon /> },
    { label: copy.capabilityRules, icon: <ShieldIcon /> },
    { label: copy.capabilitySummary, icon: <ServersIcon /> },
    { label: copy.capabilityAudit, icon: <DocsIcon /> },
  ];

  return (
    <div className={styles.onboarding} data-testid="spaces-no-servers">
      <section className={styles.hero} aria-labelledby="spaces-onboarding-title">
        <SpacesOnboardingIllustration label={copy.onboardingIllustration} />
        <div className={styles.copy}>
          <h2 id="spaces-onboarding-title">{copy.emptyNoServersTitle}</h2>
          <p>{copy.emptyNoServersBody}</p>
          <div className={styles.actions}>
            {canCreateServer ? (
              <Button data-testid="spaces-add-server" onClick={onAddServer}>
                {copy.addServer}
              </Button>
            ) : null}
            {canCreateServer ? (
              <Button variant="secondary" data-testid="spaces-import" onClick={onImport}>
                {copy.onboardingImport}
              </Button>
            ) : null}
          </div>
          <a
            className={styles.docs}
            href={INSTALL_GUIDE_URL}
            target="_blank"
            rel="noreferrer"
            data-testid="spaces-docs"
          >
            <DocsIcon />
            {copy.onboardingDocs}
          </a>
        </div>
      </section>
      <ol className={styles.steps}>
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
      <section className={styles.capabilities}>
        <h3>{copy.capabilitiesTitle}</h3>
        <ul className={styles.capGrid}>
          {capabilities.map((item) => (
            <li key={item.label}>
              <span className={styles.capIcon} aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
