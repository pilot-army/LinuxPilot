import {
  Activity,
  Container,
  Database,
  FileText,
  ScrollText,
  Server,
  SquareTerminal,
  type LucideIcon,
} from 'lucide-react';
import { BrandMark } from '../../../shared/ui/brand-mark';
import { useI18n } from '../../../i18n';
import styles from '../dashboard-page.module.css';

const MODULE_CHIPS: {
  id: string;
  icon: LucideIcon;
  labelKey: 'terminal' | 'docker' | 'files' | 'databases' | 'monitoring' | 'audit';
}[] = [
  { id: 'terminal', icon: SquareTerminal, labelKey: 'terminal' },
  { id: 'docker', icon: Container, labelKey: 'docker' },
  { id: 'files', icon: FileText, labelKey: 'files' },
  { id: 'databases', icon: Database, labelKey: 'databases' },
  { id: 'monitoring', icon: Activity, labelKey: 'monitoring' },
  { id: 'audit', icon: ScrollText, labelKey: 'audit' },
];

export function ConnectionIllustration() {
  const { messages } = useI18n();
  const copy = messages.dashboard.illustration;
  const nav = messages.dashboard.nav;

  return (
    <figure
      className={styles.illustration}
      role="img"
      aria-label={copy.label}
      data-testid="connection-illustration"
    >
      <div className={styles.illFlow}>
        <div className={styles.illCard}>
          <span className={styles.illCardIcon}>
            <BrandMark size={28} />
          </span>
          <span className={styles.illCardLabel}>{copy.control}</span>
        </div>

        <span className={styles.illDash} aria-hidden="true" />

        <div className={`${styles.illCard} ${styles.illCardWait}`}>
          <span className={styles.illCardIcon}>
            <Server size={18} strokeWidth={2} aria-hidden="true" />
          </span>
          <span className={styles.illCardLabel}>{copy.waiting}</span>
        </div>

        <svg className={styles.illFork} viewBox="0 0 20 120" aria-hidden="true">
          <path
            d="M0 60 H8 M8 20 V100 M8 20 H20 M8 60 H20 M8 100 H20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>

        <ul className={styles.illChips}>
          {MODULE_CHIPS.map((chip) => {
            const Icon = chip.icon;
            const label = chip.labelKey === 'audit' ? nav.modules.audit : nav[chip.labelKey];
            return (
              <li key={chip.id} title={label}>
                <span className={styles.illChip} aria-hidden="true">
                  <Icon size={16} strokeWidth={2} />
                </span>
                <span className="sr-only">{label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </figure>
  );
}
