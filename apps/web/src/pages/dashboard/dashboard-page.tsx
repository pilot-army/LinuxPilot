import { useState, useEffect } from 'react';
import { PERMISSIONS } from '@linuxpilot/auth-contracts';
import { useAuth } from '../../auth/AuthProvider';
import { usePermission } from '../../auth/use-permission';
import { AuthError } from '../../features/auth/auth-error';
import { rememberFleetTotal } from '../../features/dashboard/fleet-presence';
import { useDashboard } from '../../features/dashboard/use-dashboard';
import type { ChartPeriod } from '../../features/dashboard/types';
import { useI18n } from '../../i18n';
import { ConnectedDashboard } from './components/connected-dashboard';
import { DashboardErrorState } from './components/dashboard-error-state';
import { DashboardHeader } from './components/dashboard-header';
import { DashboardShell } from './components/dashboard-shell';
import { DashboardSkeleton } from './components/dashboard-skeleton';
import { EnrollmentWizard } from './components/enrollment-wizard';
import { ImportConfigurationDialog } from './components/import-config/import-configuration-dialog';
import { OnboardingDashboard } from './components/onboarding-dashboard';
import styles from './dashboard-page.module.css';

export function DashboardPage() {
  const { error } = useAuth();
  const { messages } = useI18n();
  const canCreate = usePermission(PERMISSIONS.SERVERS_CREATE);
  const [period, setPeriod] = useState<ChartPeriod>('24h');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const { snapshot, announce, loading, refreshing, mode, refresh } = useDashboard(period);
  const servers = snapshot.servers.data ?? [];

  useEffect(() => {
    if (!loading && snapshot.servers.status !== 'error') {
      rememberFleetTotal(snapshot.summary.total);
    }
  }, [loading, snapshot.servers.status, snapshot.summary.total]);

  const liveMessage =
    announce === 'refreshed'
      ? messages.dashboard.states.refreshed
      : announce === 'refreshFailed'
        ? messages.dashboard.states.refreshFailed
        : loading
          ? messages.dashboard.states.loading
          : refreshing
            ? messages.dashboard.states.refreshing
            : '';

  function closeWizard() {
    setWizardOpen(false);
    void refresh();
  }

  function openWizard() {
    setWizardOpen(true);
  }

  return (
    <DashboardShell>
      <div
        className={styles.page}
        data-testid="dashboard-page"
        aria-busy={loading || refreshing || undefined}
      >
        {error ? <AuthError message={messages.auth.errors[error]} /> : null}
        <div className="sr-only" aria-live="polite">
          {liveMessage}
        </div>
        {loading ? <DashboardSkeleton /> : null}
        {mode === 'servers-error' ? (
          <div className={styles.errorPage} data-testid="dashboard-load-error">
            <DashboardErrorState
              title={messages.dashboard.loadError.title}
              body={messages.dashboard.loadError.body}
              retryLabel={messages.dashboard.actions.retryServers}
              onRetry={() => void refresh()}
              testId="dashboard-error-retry"
            />
          </div>
        ) : null}
        {mode === 'onboarding' || mode === 'connected' ? (
          <DashboardHeader
            mode={mode}
            refreshing={refreshing}
            period={period}
            servers={servers}
            onRefresh={() => void refresh()}
            onPeriodChange={setPeriod}
          />
        ) : null}
        {mode === 'onboarding' ? (
          <OnboardingDashboard
            canCreate={canCreate}
            onAddServer={openWizard}
            onImport={() => setImportOpen(true)}
          />
        ) : null}
        {mode === 'connected' ? (
          <ConnectedDashboard
            snapshot={snapshot}
            period={period}
            canCreate={canCreate}
            onAddServer={canCreate ? openWizard : undefined}
          />
        ) : null}
        {canCreate ? (
          <>
            <EnrollmentWizard
              variant="dialog"
              open={wizardOpen}
              onClose={closeWizard}
              onIssued={() => {
                void refresh();
              }}
              onConnected={() => {
                void refresh();
              }}
            />
            <ImportConfigurationDialog
              open={importOpen}
              onClose={() => setImportOpen(false)}
              onImported={() => {
                void refresh();
              }}
            />
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}
