import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { GuestRoute, ProtectedRoute } from './auth/ProtectedRoute';
import { LocaleProvider } from './i18n';
import { AuthPage } from './pages/auth/auth-page';
import { DashboardPage } from './pages/dashboard/dashboard-page';
import { NotFoundPage } from './pages/not-found/not-found-page';
import { AddServerPage } from './pages/servers/add-server-page';
import { ServerAuditPage } from './pages/servers/server-audit-page';
import { ServerDetailPage } from './pages/servers/server-detail-page';
import { LegacyServerGroupsRedirect } from './pages/servers/legacy-server-groups-redirect';
import { ServerSpacesPage } from './pages/servers/server-spaces-page';
import { ServerSpaceDetailPage } from './pages/servers/server-space-detail-page';
import { ServerOperationsPage } from './pages/servers/server-operations-page';
import { ServerSshKeysPage } from './pages/servers/server-ssh-keys-page';
import { ServersPage } from './pages/servers/servers-page';
import { AppErrorBoundary } from './shared/ui/error-boundary';

export function App() {
  return (
    <LocaleProvider>
      <AppErrorBoundary>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<GuestRoute />}>
                <Route path="/login" element={<AuthPage />} />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/servers" element={<ServersPage />} />
                <Route path="/servers/new" element={<AddServerPage />} />
                <Route path="/servers/:id" element={<ServerDetailPage />} />
                <Route path="/servers/:id/:tab" element={<ServerDetailPage />} />
                <Route path="/server-spaces" element={<ServerSpacesPage />} />
                <Route path="/server-spaces/:spaceSlug" element={<ServerSpaceDetailPage />} />
                <Route path="/server-spaces/:spaceSlug/:tab" element={<ServerSpaceDetailPage />} />
                <Route path="/server-groups" element={<LegacyServerGroupsRedirect />} />
                <Route path="/server-ssh-keys" element={<ServerSshKeysPage />} />
                <Route path="/server-operations" element={<ServerOperationsPage />} />
                <Route path="/server-audit" element={<ServerAuditPage />} />
              </Route>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </AppErrorBoundary>
    </LocaleProvider>
  );
}
