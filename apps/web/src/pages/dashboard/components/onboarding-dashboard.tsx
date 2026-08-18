import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Container,
  Database,
  FileText,
  Lock,
  Server,
  ShieldCheck,
  SquareTerminal,
  type LucideIcon,
} from 'lucide-react';
import { interpolate } from '../../../features/dashboard/format';
import { MICROSERVICE_NAV } from '../../../features/dashboard/nav-config';
import { useI18n } from '../../../i18n';
import { Button } from '../../../shared/ui/button';
import { ConnectionIllustration } from './connection-illustration';
import { AlmaLinuxLogo, DebianLogo, RockyLinuxLogo, UbuntuLogo } from './distro-logos';
import { FeaturePreview } from './feature-preview';
import { SetupSteps } from './setup-steps';
import styles from '../dashboard-page.module.css';

type OnboardingDashboardProps = {
  canCreate: boolean;
  onAddServer: () => void;
  onImport: () => void;
};

const MODULE_ICONS: Record<string, LucideIcon> = {
  servers: Server,
  terminal: SquareTerminal,
  docker: Container,
  files: FileText,
  databases: Database,
};

const DISTROS = [
  { id: 'ubuntu', icon: UbuntuLogo, labelKey: 'ubuntu' as const },
  { id: 'debian', icon: DebianLogo, labelKey: 'debian' as const },
  { id: 'almalinux', icon: AlmaLinuxLogo, labelKey: 'almalinux' as const },
  { id: 'rocky', icon: RockyLinuxLogo, labelKey: 'rocky' as const },
];

export function OnboardingDashboard({
  canCreate,
  onAddServer,
  onImport,
}: OnboardingDashboardProps) {
  const { messages } = useI18n();
  const copy = messages.dashboard;
  const [docsOpen, setDocsOpen] = useState(false);
  const docsId = useId();

  return (
    <div className={styles.onboarding} data-testid="onboarding-dashboard">
      <section className={`${styles.panel} ${styles.heroPanel}`} data-testid="first-server-card">
        <div className={styles.heroCopy}>
          <h2 id="first-server-title">{copy.hero.title}</h2>
          <p className={styles.cardBody}>{copy.hero.body}</p>
          <div className={styles.cardActions}>
            {canCreate ? (
              <>
                <Button block={false} data-testid="onboarding-add-server" onClick={onAddServer}>
                  {copy.actions.addServer}
                </Button>
                <Button
                  variant="secondary"
                  block={false}
                  data-testid="onboarding-import"
                  onClick={onImport}
                >
                  {copy.actions.importConfig}
                </Button>
              </>
            ) : (
              <p className={styles.emptyBody}>{copy.permissions.askAdmin}</p>
            )}
          </div>
          <div className={styles.heroLinks}>
            <button
              type="button"
              className={styles.textButton}
              aria-expanded={docsOpen}
              aria-controls={docsOpen ? docsId : undefined}
              data-testid="help-docs"
              onClick={() => setDocsOpen((open) => !open)}
            >
              <BookOpen size={14} strokeWidth={2} aria-hidden="true" />
              {copy.hero.docs}
            </button>
            <span className={styles.secureNote}>
              <Lock size={14} strokeWidth={2} aria-hidden="true" />
              {copy.hero.encrypted}
            </span>
          </div>
          {docsOpen ? (
            <div id={docsId} className={styles.helpDetails} role="region">
              <p className={styles.emptyTitle}>{copy.help.requirementsTitle}</p>
              <p className={styles.cardBody}>{copy.help.requirementsBody}</p>
            </div>
          ) : null}
        </div>
        <ConnectionIllustration />
      </section>

      <SetupSteps />
      <div className={styles.onboardingSplit}>
        <FeaturePreview />
        <AvailableModules />
      </div>
      <div className={styles.onboardingFooter}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>{copy.compat.title}</h2>
          </div>
          <ul className={styles.distroList}>
            {DISTROS.map((distro) => {
              const Icon = distro.icon;
              return (
                <li key={distro.id} data-testid={`compat-distro-${distro.id}`}>
                  <span className={styles.distroIcon} aria-hidden="true">
                    <Icon />
                  </span>
                  <span>{copy.compat[distro.labelKey]}</span>
                </li>
              );
            })}
          </ul>
        </section>
        <section className={styles.panel}>
          <div className={styles.securityCard}>
            <span className={styles.featureIcon} aria-hidden="true">
              <ShieldCheck size={18} strokeWidth={2} />
            </span>
            <div className={styles.featureCopy}>
              <h2>{copy.security.title}</h2>
              <p>{copy.security.body}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function AvailableModules() {
  const { messages } = useI18n();
  const copy = messages.dashboard;

  return (
    <section className={styles.panel} data-testid="unlocked-features">
      <div className={styles.panelHead}>
        <h2>{copy.available.title}</h2>
      </div>
      <ul className={styles.availableList}>
        {MICROSERVICE_NAV.map((group) => {
          const Icon = MODULE_ICONS[group.id] ?? Server;
          const childLabels = group.children
            .filter((child) => child.available)
            .map((child) => copy.nav.modules[child.labelKey]);
          const extras = group.children
            .filter((child) => !child.available)
            .map((child) => copy.nav.modules[child.labelKey]);
          const labels = [...childLabels, ...extras];
          return (
            <li key={group.id} className={styles.featureRow}>
              <span className={styles.featureIcon} aria-hidden="true">
                <Icon size={18} strokeWidth={2} />
              </span>
              <div className={styles.featureCopy}>
                <strong>{copy.nav[group.labelKey]}</strong>
                <p>{labels.join(', ')}</p>
              </div>
              {group.to ? (
                <Link
                  to={group.to}
                  className={styles.chevronLink}
                  aria-label={interpolate(copy.available.open, { name: copy.nav[group.labelKey] })}
                >
                  <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
                </Link>
              ) : (
                <span className={styles.chevronLink} aria-hidden="true">
                  <ArrowRight size={18} strokeWidth={2} />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
