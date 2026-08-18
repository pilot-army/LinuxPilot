import {
  Bot,
  ChartNoAxesCombined,
  Clock3,
  MonitorCog,
  Server,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '../../../i18n';
import styles from '../dashboard-page.module.css';

const PREVIEW_ITEMS: {
  id: string;
  icon: LucideIcon;
  titleKey:
    | 'statusTitle'
    | 'resourcesTitle'
    | 'osTitle'
    | 'agentsTitle'
    | 'maintenanceTitle'
    | 'issuesTitle';
  bodyKey:
    | 'statusBody'
    | 'resourcesBody'
    | 'osBody'
    | 'agentsBody'
    | 'maintenanceBody'
    | 'issuesBody';
}[] = [
  { id: 'status', icon: Server, titleKey: 'statusTitle', bodyKey: 'statusBody' },
  {
    id: 'resources',
    icon: ChartNoAxesCombined,
    titleKey: 'resourcesTitle',
    bodyKey: 'resourcesBody',
  },
  { id: 'os', icon: MonitorCog, titleKey: 'osTitle', bodyKey: 'osBody' },
  { id: 'agents', icon: Bot, titleKey: 'agentsTitle', bodyKey: 'agentsBody' },
  { id: 'maintenance', icon: Clock3, titleKey: 'maintenanceTitle', bodyKey: 'maintenanceBody' },
  { id: 'issues', icon: TriangleAlert, titleKey: 'issuesTitle', bodyKey: 'issuesBody' },
];

export function FeaturePreview() {
  const { messages } = useI18n();
  const copy = messages.dashboard.preview;

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>{copy.title}</h2>
      </div>
      <ul className={styles.previewGrid}>
        {PREVIEW_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id} className={styles.featureRow} data-testid={`preview-${item.id}`}>
              <span className={styles.featureIcon} aria-hidden="true">
                <Icon size={18} strokeWidth={2} />
              </span>
              <div className={styles.featureCopy}>
                <strong>{copy[item.titleKey]}</strong>
                <p>{copy[item.bodyKey]}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className={styles.previewFoot}>{copy.footnote}</p>
    </section>
  );
}
