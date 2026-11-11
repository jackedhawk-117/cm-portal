import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ROLE_DASHBOARD, ROLE_LABELS } from '../lib/constants';
import { Brand } from './Brand';
import { cx, initials } from '../lib/format';

const PUBLIC_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/departments', label: 'Departments' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact' },
];

export function DisclaimerBanner() {
  return (
    <div className="no-print border-b border-amber-200 bg-amber-100 px-3 py-1.5 text-center text-[11px] font-medium leading-snug text-amber-950 sm:text-xs">
      <ShieldAlert size={13} className="mr-1.5 inline-block align-[-2px]" aria-hidden="true" />
      Recruitment prototype – fictional data only. Not affiliated with or endorsed by the Government of
      Kerala or the Chief Minister’s Office.
    </div>
  );
}

export function PublicNavbar() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    toast.info('You have been signed out.');
    navigate('/');
  };

  const dashboard = user ? ROLE_DASHBOARD[user.role] : '/login';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur no-print">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Brand />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {PUBLIC_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cx(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link to="/track" className="btn-ghost text-sm">
            <Search size={15} /> Track
          </Link>
          {user ? (
            <>
              <Link to={dashboard} className="btn-secondary text-sm">
                <LayoutDashboard size={15} /> Dashboard
              </Link>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-2.5 py-1.5 text-left hover:bg-slate-50"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
                    {initials(user.name)}
                  </span>
                  <span className="max-w-[120px] truncate text-xs font-semibold text-slate-800">{user.name}</span>
                  <ChevronDown size={14} className="text-slate-500" />
                </button>
                {menuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
                    role="menu"
                  >
                    <div className="px-3 py-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
                    </div>
                    <Link to={dashboard} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100" role="menuitem">
                      <LayoutDashboard size={15} /> Open dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
                      role="menuitem"
                    >
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost text-sm">
                Sign in
              </Link>
              <Link to="/register" className="btn-primary text-sm">
                Register <ArrowRight size={15} />
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div id="mobile-nav" className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 lg:hidden">
          <nav className="flex flex-col" aria-label="Mobile navigation">
            {PUBLIC_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cx(
                    'rounded-lg px-3 py-2.5 text-sm font-medium',
                    isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-700 hover:bg-slate-50',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            <NavLink to="/track" className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Track grievance
            </NavLink>
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
            {user ? (
              <>
                <Link to={dashboard} className="btn-primary w-full">
                  <LayoutDashboard size={16} /> Dashboard
                </Link>
                <button type="button" onClick={handleLogout} className="btn-secondary w-full">
                  <LogOut size={16} /> Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary w-full">Sign in</Link>
                <Link to="/register" className="btn-primary w-full">Create an account</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-16 border-t border-brand-900/20 bg-brand-950 text-brand-100 no-print">
      <div className="container-page grid gap-10 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Brand light />
          <p className="mt-4 max-w-md text-sm leading-relaxed text-brand-200">
            A recruitment prototype demonstrating an end-to-end public grievance workflow:
            citizen submission, CMO triage, departmental action and citizen feedback.
          </p>
          <p className="mt-4 max-w-md rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs leading-relaxed text-amber-100">
            <strong>Recruitment prototype – fictional data only.</strong> Not affiliated with or endorsed by the
            Government of Kerala or the Chief Minister’s Office. No official logos or emblems are used.
          </p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-300">Portal</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/how-it-works" className="hover:text-white">How it works</Link></li>
            <li><Link to="/departments" className="hover:text-white">Departments</Link></li>
            <li><Link to="/track" className="hover:text-white">Track a grievance</Link></li>
            <li><Link to="/faq" className="hover:text-white">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-300">Account</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/register" className="hover:text-white">Register as citizen</Link></li>
            <li><Link to="/login" className="hover:text-white">Sign in</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact the prototype team</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-brand-300 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} CM Kerala Grievance Portal – recruitment prototype.</p>
          <p>Built with React, Express, PostgreSQL and Gemini · Demo data only</p>
        </div>
      </div>
    </footer>
  );
}
