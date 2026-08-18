import type {
  ChartPeriod,
  DashboardServer,
  DashboardSnapshot,
} from '../../../features/dashboard/types';
import { AggregateResources } from './aggregate-resources';
import { AttentionRequired } from './attention-required';
import { DashboardQuickActions } from './dashboard-quick-actions';
import { InfrastructureDistribution } from './infrastructure-distribution';
import { MaintenanceOverview } from './maintenance-overview';
import { RecentConnections } from './recent-connections';
import { ServerActivity } from './server-activity';
import { ServerOverview } from './server-overview';
import { TopLoadedServers } from './top-loaded-servers';
import { useI18n } from '../../../i18n';
import styles from '../dashboard-page.module.css';

type ConnectedDashboardProps = {
  snapshot: DashboardSnapshot;
  period: ChartPeriod;
  canCreate: boolean;
  onAddServer?: () => void;
};

export function ConnectedDashboard({
  snapshot,
  period,
  canCreate,
  onAddServer,
}: ConnectedDashboardProps) {
  const { messages } = useI18n();
  const servers = snapshot.servers.data ?? [];
  const history = snapshot.load.data?.points ?? [];

  return (
    <div className={styles.connected} data-testid="connected-dashboard">
      <div className={styles.row2}>
        <ServerOverview
          summary={snapshot.summary}
          heartbeat={history}
          periodLabel={messages.dashboard.chart.periods[period]}
        />
        <AggregateResources summary={snapshot.summary} history={history} />
      </div>
      <div className={styles.row2}>
        <InfrastructureDistribution servers={servers} />
        <MaintenanceOverview
          summary={snapshot.summary}
          pendingOperations={snapshot.pendingOperations}
        />
      </div>
      <div className={styles.row2}>
        <TopLoadedServers servers={servers} />
        <AttentionRequired result={snapshot.issues} />
      </div>
      <div className={styles.row3}>
        <ServerActivity result={snapshot.weekActivity} />
        <RecentConnections result={snapshot.connections} />
        <DashboardQuickActions canCreate={canCreate} onAddServer={onAddServer} />
      </div>
    </div>
  );
}

export type { DashboardServer };
