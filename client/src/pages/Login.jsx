import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Building2, Eye, EyeOff, LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTitle } from '../hooks/useTitle';
import { ROLE_DASHBOARD } from '../lib/constants';
import { Field, InlineError, Spinner } from '../components/ui';

const DEMO_ACCOUNTS = [
  { label: 'Citizen', email: 'citizen@demo.test', icon: Users, hint: 'Submit and track grievances' },
  { label: 'CMO admin', email: 'cmo@demo.test', icon: ShieldCheck, hint: 'Review, assign and resolve' },
  { label: 'PWD officer', email: 'officer.pwd@demo.test', icon: Building2, hint: 'Department queue' },
];

export default function Login() {
  useTitle('Sign in');
  const { user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const nextParam = params.get('next');
  const safeNext = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : null;

  useEffect(() => {
    if (user) navigate(ROLE_DASHBOARD[user.role] || '/', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const signedIn = await login(form.email.trim(), form.password);
      toast.success(`Welcome back, ${signedIn.name.split(' ')[0]}.`);
      navigate(safeNext || ROLE_DASHBOARD[signedIn.role] || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const useDemo = (email) => {
    setForm({ email, password: 'Demo@12345' });
    setError(null);
  };

  return (
    <div className="hero-pattern">
      <div className="container-page grid min-h-[calc(100vh-14rem)] max-w-5xl items-center gap-10 py-12 lg:grid-cols-2">
        <div className="hidden lg:block">
          <span className="badge bg-white text-brand-800 ring-1 ring-inset ring-brand-200">
            <ShieldCheck size={13} /> Secure demo access
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Welcome back to the grievance portal
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600">
            Citizens, CMO administrators and department officers use the same sign-in page. Your role
            decides which dashboard and actions are available.
          </p>
          <div className="mt-6 space-y-2.5">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => useDemo(account.email)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-brand-300 hover:bg-brand-50"
              >
                <span className="rounded-lg bg-brand-50 p-2 text-brand-700"><account.icon size={17} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{account.label}</span>
                  <span className="block truncate text-xs text-slate-500">{account.email} · {account.hint}</span>
                </span>
                <ArrowRight size={15} className="text-slate-400" />
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">Click a demo account to fill the form. Shared password: <code className="rounded bg-slate-200 px-1 py-0.5">Demo@12345</code></p>
        </div>

        <div className="card card-pad w-full">
          <div className="lg:hidden">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Demo accounts</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button key={a.email} type="button" onClick={() => useDemo(a.email)} className="badge bg-slate-100 text-slate-700 hover:bg-brand-50">
                  {a.label}
                </button>
              ))}
            </div>
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900 lg:mt-0">Sign in</h2>
          <p className="mt-1 text-sm text-slate-600">Enter your registered email or mobile number and password.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            <Field label="Email or Mobile number" htmlFor="login-identifier" required>
              <input
                id="login-identifier"
                type="text"
                autoComplete="username"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com or 98765 43210"
                required
              />
            </Field>
            <Field label="Password" htmlFor="login-password" required>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input pr-11"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1.5 top-1.5 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            {error && <InlineError message={error} />}
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? <><Spinner /> Signing in…</> : <><LockKeyhole size={16} /> Sign in</>}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-600">
            New citizen?{' '}
            <Link to="/register" className="font-semibold text-brand-800 hover:underline">Create an account</Link>
          </p>
          <p className="mt-3 rounded-lg bg-slate-50 p-2.5 text-center text-[11px] leading-relaxed text-slate-500">
            Recruitment prototype with fictional data. Not affiliated with the Government of Kerala or the
            Chief Minister’s Office.
          </p>
        </div>
      </div>
    </div>
  );
}
