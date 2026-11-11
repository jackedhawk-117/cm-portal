import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_DASHBOARD } from '../lib/constants';
import { PageLoader } from './ui';

/**
 * Guard for dashboard routes. Optionally restricts by role; a signed-in user
 * who hits the wrong dashboard is redirected to their own.
 */
export function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader label="Checking your session…" />;
  if (!user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={ROLE_DASHBOARD[user.role] || '/'} replace />;
  }
  return <Outlet />;
}

export function DashboardRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return <Navigate to={user ? ROLE_DASHBOARD[user.role] : '/login'} replace />;
}
