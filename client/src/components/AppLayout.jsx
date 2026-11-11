import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FilePlus2,
  Home,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ROLE_DASHBOARD, ROLE_LABELS } from '../lib/constants';
import { cx, initials } from '../lib/format';
import { Brand } from './Brand';
import { DisclaimerBanner, PublicFooter, PublicNavbar } from './PublicChrome';

const NAV_BY_ROLE = {
  CITIZEN: [
    { to: '/citizen', label: 'My grievances', icon: LayoutDashboard, end: true },
    { to: '/citizen/new', label: 'Submit grievance', icon: FilePlus2 },
    { to: '/track', label: 'Track a grievance', icon: Search },
  ],
  CMO_ADMIN: [
    { to: '/cmo', label: 'CMO overview', icon: LayoutDashboard, end: true },
  ],
  DEPT_OFFICER: [
    { to: '/officer', label: 'Department queue', icon: Inbox, end: true },
  ],
};

export function AppLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [location.pathname]);

  const nav = NAV_BY_ROLE[user?.role] || [];
  const dashboard = ROLE_DASHBOARD[user?.role] || '/';

  const handleLogout = async () => {
    await logout();
    toast.info('You have been signed out.');
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <DisclaimerBanner />
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white no-print">
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Brand compact />
            <span className="hidden rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 sm:inline">
              {ROLE_LABELS[user?.role] || 'Portal'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="hidden text-xs font-medium text-slate-500 hover:text-brand-800 sm:inline-flex items-center gap-1">
              <ArrowLeft size={13} /> Public site
            </Link>
            <Link
              to={dashboard}
              className="hidden items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 sm:flex"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-800">
                {initials(user?.name)}
              </span>
              <span className="max-w-[140px] truncate">{user?.name}</span>
            </Link>
            <button type="button" onClick={handleLogout} className="btn-ghost btn-sm" title="Sign out">
              <LogOut size={15} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-expanded={open}
              aria-controls="app-mobile-nav"
              aria-label={open ? 'Close menu' : 'Open menu'}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {open && (
          <div id="app-mobile-nav" className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
            <nav className="flex flex-col gap-1" aria-label="Dashboard navigation">
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cx(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium',
                      isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-700 hover:bg-slate-50',
                    )
                  }
                >
                  <item.icon size={17} /> {item.label}
                </NavLink>
              ))}
              <Link to="/" className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Home size={17} /> Public site
              </Link>
            </nav>
          </div>
        )}
      </header>

      <div className="container-page flex flex-1 gap-8 py-6 sm:py-8">
        <aside className="hidden w-60 shrink-0 lg:block no-print">
          <div className="sticky top-24 space-y-4">
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">
                  {initials(user?.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {user?.department?.name || ROLE_LABELS[user?.role]}
                  </p>
                </div>
              </div>
            </div>
            <nav className="card space-y-1 p-2" aria-label="Dashboard navigation">
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cx(
                      'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                    )
                  }
                >
                  <item.icon size={17} /> {item.label}
                </NavLink>
              ))}
              <Link to="/" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
                <Home size={17} /> Public site
              </Link>
            </nav>
            <div className="rounded-xl border border-brand-100 bg-brand-50 p-3 text-xs leading-relaxed text-brand-900">
              <ShieldCheck size={15} className="mb-1" />
              Prototype environment. All names, grievances and statistics are fictional.
            </div>
          </div>
        </aside>

        <main id="main-content" className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      <footer className="mt-auto border-t border-slate-200 bg-white no-print">
        <div className="container-page py-4 text-center text-[11px] leading-relaxed text-slate-500">
          Recruitment prototype – fictional data only. Not affiliated with or endorsed by the Government of Kerala
          or the Chief Minister’s Office.
        </div>
      </footer>
    </div>
  );
}

export function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <DisclaimerBanner />
      <PublicNavbar />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
