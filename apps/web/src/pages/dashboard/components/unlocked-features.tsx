import {
  ChartIcon,
  DockerIcon,
  FilesIcon,
  OperationsIcon,
  TerminalIcon,
} from '../../../features/dashboard/icons';
import { useI18n } from '../../../i18n';
import styles from '../dashboard-page.module.css';

export function UnlockedFeatures() {
  const { messages } = useI18n();
  const copy = messages.dashboard.features;
  const items = [
    { id: 'monitoring', icon: ChartIcon, title: copy.monitoringTitle, body: copy.monitoringBody },
    { id: 'docker', icon: DockerIcon, title: copy.dockerTitle, body: copy.dockerBody },
    { id: 'files', icon: FilesIcon, title: copy.filesTitle, body: copy.filesBody },
    { id: 'terminal', icon: TerminalIcon, title: copy.terminalTitle, body: copy.terminalBody },
    { id: 'events', icon: OperationsIcon, title: copy.eventsTitle, body: copy.eventsBody },
  ];

  return (
    <section
      className={`${styles.panel} ${styles.featuresPanel}`}
      aria-labelledby="unlocked-features-title"
      data-testid="unlocked-features"
    >
      <div className={styles.panelHead}>
        <h2 id="unlocked-features-title">{copy.title}</h2>
      </div>
      <ul className={styles.featureGrid}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id} className={styles.featureItem}>
              <span className={`${styles.featureIcon} ${styles.featureBlue}`} aria-hidden="true">
                <Icon />
              </span>
              <p>{item.title}</p>
              <small>{item.body}</small>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
