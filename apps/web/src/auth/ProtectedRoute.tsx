import { Navigate, Outlet } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from './AuthProvider';

function SessionRestore() {
  const { messages } = useI18n();

  return (
    <div className="boot-screen">
      <span className="boot-spinner" aria-hidden="true" />
      <p>{messages.auth.session.restoring}</p>
    </div>
  );
}

export function ProtectedRoute() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <SessionRestore />;
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <SessionRestore />;
  }

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
