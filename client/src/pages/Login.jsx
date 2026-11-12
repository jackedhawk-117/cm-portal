import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck, Smartphone, Sparkles, UserCheck, UserPlus, Users } from 'lucide-react';
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
  const { user, login, sendOtp, verifyOtp, completeRegistration } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Mode: 'otp' or 'password'
  const initialMode = params.get('tab') === 'otp' ? 'otp' : 'password';
  const [authMode, setAuthMode] = useState(initialMode);

  // Password login form
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  // OTP login form
  const [otpMobile, setOtpMobile] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpName, setOtpName] = useState('');
  const [otpStep, setOtpStep] = useState('phone'); // 'phone' | 'verify' | 'name'
  const [registrationToken, setRegistrationToken] = useState(null);
  const [devOtp, setDevOtp] = useState(null);
  const [countdown, setCountdown] = useState(0);

  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const nextParam = params.get('next');
  const safeNext = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : null;

  useEffect(() => {
    if (user) navigate(safeNext || ROLE_DASHBOARD[user.role] || '/', { replace: true });
  }, [user, navigate, safeNext]);

  // Resend countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handlePasswordSubmit = async (e) => {
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

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(null);
    const cleaned = otpMobile.replace(/[\s-]/g, '');
    if (!/^(\+91)?[6-9]\d{9}$/.test(cleaned)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    setSubmitting(true);
    try {
      const res = await sendOtp(cleaned);
      setDevOtp(res.dev_otp || null);
      setOtpStep('verify');
      setCountdown(60);
      toast.success('Verification code sent to your mobile number');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError('Please enter a 6-digit verification code');
      return;
    }
    setSubmitting(true);
    try {
      const cleaned = otpMobile.replace(/[\s-]/g, '');
      const res = await verifyOtp(cleaned, otpCode.trim());

      // If phone number is not yet in database, prompt for citizen's name
      if (res.needs_name) {
        setRegistrationToken(res.registration_token);
        setOtpStep('name');
        toast.info('Number verified! Please enter your name to complete your registration.');
        return;
      }

      // Existing citizen logged in
      toast.success(`Welcome back, ${res.name.split(' ')[0]}.`);
      navigate(safeNext || ROLE_DASHBOARD[res.role] || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    setError(null);
    if (otpName.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters)');
      return;
    }
    setSubmitting(true);
    try {
      const signedIn = await completeRegistration(registrationToken, otpName.trim());
      toast.success(`Welcome, ${signedIn.name.split(' ')[0]}! Your account is created.`);
      navigate(safeNext || ROLE_DASHBOARD[signedIn.role] || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const useDemo = (email) => {
    setAuthMode('password');
    setForm({ email, password: 'Demo@12345' });
    setError(null);
  };

  return (
    <div className="hero-pattern">
      <div className="container-page grid min-h-[calc(100vh-14rem)] max-w-5xl items-center gap-10 py-12 lg:grid-cols-2">
        <div className="hidden lg:block">
          <span className="badge bg-white text-brand-800 ring-1 ring-inset ring-brand-200">
            <ShieldCheck size={13} /> Secure access
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Welcome back to the grievance portal
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600">
            Citizens can sign in instantly using their mobile phone via OTP, or with a password. CMO
            administrators and officers use their assigned credentials.
          </p>

          <div className="mt-6 space-y-2.5">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => useDemo(account.email)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white/80 p-3 text-left transition hover:border-brand-500 hover:bg-brand-50/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-800">
                    <account.icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{account.label}</p>
                    <p className="text-xs text-slate-500">{account.hint}</p>
                  </div>
                </div>
                <code className="text-xs font-medium text-slate-600">{account.email}</code>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Click a demo account to fill the password form. Shared password: <code className="rounded bg-slate-200 px-1 py-0.5">Demo@12345</code>
          </p>
        </div>

        <div className="card card-pad w-full">
          {/* Mobile screen demo pills */}
          <div className="lg:hidden mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Demo accounts</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => useDemo(a.email)}
                  className="badge bg-slate-100 text-slate-700 hover:bg-brand-50"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-600">
            {authMode === 'otp'
              ? 'Enter your mobile number to receive a one-time verification code.'
              : 'Enter your registered email or mobile number and password.'}
          </p>

          {/* Authentication Mode Switcher Tabs */}
          <div className="mt-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setAuthMode('otp');
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 transition ${
                authMode === 'otp'
                  ? 'bg-white font-semibold text-brand-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone size={15} /> Mobile OTP (Citizens)
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('password');
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 transition ${
                authMode === 'password'
                  ? 'bg-white font-semibold text-brand-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound size={15} /> Password Sign-in
            </button>
          </div>

          {/* MODE 1: Mobile OTP Login */}
          {authMode === 'otp' ? (
            <div className="mt-5">
              {otpStep === 'phone' && (
                <form className="space-y-4" onSubmit={handleSendOtp} noValidate>
                  <Field label="10-digit Indian Mobile number" htmlFor="otp-mobile" required>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm font-medium text-slate-500">+91</span>
                      <input
                        id="otp-mobile"
                        type="tel"
                        autoComplete="tel"
                        className="input pl-12"
                        value={otpMobile}
                        onChange={(e) => setOtpMobile(e.target.value)}
                        placeholder="98765 43210"
                        autoFocus
                        required
                      />
                    </div>
                  </Field>
                  {error && <InlineError message={error} />}
                  <button type="submit" className="btn-primary w-full" disabled={submitting}>
                    {submitting ? <><Spinner /> Sending OTP…</> : <><Smartphone size={16} /> Send verification code</>}
                  </button>
                </form>
              )}

              {otpStep === 'verify' && (
                <form className="space-y-4" onSubmit={handleVerifyOtp} noValidate>
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5 text-xs text-slate-700">
                    <div>
                      <span>Code sent to </span>
                      <strong className="font-semibold">+91 {otpMobile}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpStep('phone');
                        setOtpCode('');
                        setError(null);
                      }}
                      className="font-semibold text-brand-800 hover:underline"
                    >
                      Change
                    </button>
                  </div>

                  {devOtp && (
                    <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800">
                      <div>
                        <span className="font-semibold">Demo Code: </span>
                        <code className="rounded border border-emerald-300 bg-white px-1.5 py-0.5 font-mono text-sm font-bold text-emerald-900">
                          {devOtp}
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOtpCode(devOtp)}
                        className="font-semibold text-emerald-700 underline hover:text-emerald-900"
                      >
                        Auto-fill
                      </button>
                    </div>
                  )}

                  <Field label="6-digit verification code" htmlFor="otp-code" required>
                    <input
                      id="otp-code"
                      type="text"
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength={6}
                      className="input text-center font-mono text-lg tracking-widest"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="••••••"
                      autoFocus
                      required
                    />
                  </Field>

                  {error && <InlineError message={error} />}

                  <button type="submit" className="btn-primary w-full" disabled={submitting}>
                    {submitting ? <><Spinner /> Verifying…</> : <><LockKeyhole size={16} /> Verify & Sign in</>}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={countdown > 0 || submitting}
                      className="text-xs font-semibold text-brand-800 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Did not get the code? Resend OTP'}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: Prompt for Name if number is non-existent in database */}
              {otpStep === 'name' && (
                <form className="space-y-4" onSubmit={handleCompleteRegistration} noValidate>
                  <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-3.5 text-xs text-brand-900">
                    <div className="flex items-center gap-1.5 font-semibold text-brand-800 text-sm">
                      <Sparkles size={16} /> Welcome to the Portal!
                    </div>
                    <p className="mt-1 text-slate-600 leading-relaxed">
                      Mobile number <strong>+91 {otpMobile}</strong> is verified. Since this is your first time signing in, please enter your full name to complete your registration.
                    </p>
                  </div>

                  <Field label="Full Name" htmlFor="new-citizen-name" hint="As you would like it to appear on submitted grievances" required>
                    <input
                      id="new-citizen-name"
                      type="text"
                      className="input"
                      value={otpName}
                      onChange={(e) => setOtpName(e.target.value)}
                      placeholder="e.g. Suresh Kumar"
                      autoFocus
                      required
                    />
                  </Field>

                  {error && <InlineError message={error} />}

                  <button type="submit" className="btn-primary w-full" disabled={submitting}>
                    {submitting ? <><Spinner /> Completing setup…</> : <><UserPlus size={16} /> Complete Registration & Enter</>}
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* MODE 2: Password Login */
            <form className="mt-5 space-y-4" onSubmit={handlePasswordSubmit} noValidate>
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
          )}

          <p className="mt-5 text-center text-sm text-slate-600">
            New citizen?{' '}
            <Link to="/register" className="font-semibold text-brand-800 hover:underline">
              Create an account
            </Link>
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
