import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTitle } from '../hooks/useTitle';
import { ROLE_DASHBOARD } from '../lib/constants';
import { Field, InlineError, Spinner } from '../components/ui';

export default function Register() {
  useTitle('Create an account');
  const { user, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate(ROLE_DASHBOARD[user.role] || '/', { replace: true });
  }, [user, navigate]);

  const setField = (key) => (e) => {
    setForm((current) => ({ ...current, [key]: e.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter your full name';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Enter a valid email address';
    }
    if (!/^(\+91)?[6-9]\d{9}$/.test(form.mobile.replace(/[\s-]/g, ''))) {
      next.mobile = 'Enter a valid 10-digit Indian mobile number';
    }
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      next.password = 'At least 8 characters with a letter and a number';
    }
    if (form.password !== form.confirm) next.confirm = 'Passwords do not match';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const created = await register({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        mobile: form.mobile.replace(/[\s-]/g, ''),
        password: form.password,
      });
      toast.success('Account created. You can now submit a grievance.');
      navigate(ROLE_DASHBOARD[created.role] || '/citizen', { replace: true });
    } catch (err) {
      if (err.details?.length) {
        const mapped = {};
        for (const issue of err.details) mapped[issue.path] = issue.message;
        setErrors(mapped);
      }
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="hero-pattern">
      <div className="container-page grid max-w-5xl gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <span className="badge bg-white text-brand-800 ring-1 ring-inset ring-brand-200">Citizen registration</span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Create your citizen account
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Register to submit grievances, download attachments, follow the timeline and give feedback or
            reopen a resolved case.
          </p>
          <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
            {[
              'Use fictional details only – this is a recruitment prototype.',
              'Your personal data is hidden from public tracking.',
              'One account can track all your grievances in one dashboard.',
              'Demo password: Demo@12345 after seeding (not for real accounts).',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand-600" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="card card-pad w-full">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Register</h2>
          <p className="mt-1 text-sm text-slate-600">Mobile number is required for updates and login. Email is optional.</p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            <Field label="Full name" htmlFor="reg-name" error={errors.name} required>
              <input id="reg-name" className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={setField('name')} autoComplete="name" placeholder="Fictional full name" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mobile number (primary ID)" htmlFor="reg-mobile" error={errors.mobile} required>
                <input id="reg-mobile" type="tel" className={`input ${errors.mobile ? 'input-error' : ''}`} value={form.mobile} onChange={setField('mobile')} autoComplete="tel" placeholder="98765 43210" />
              </Field>
              <Field label="Email address (optional)" htmlFor="reg-email" error={errors.email}>
                <input id="reg-email" type="email" className={`input ${errors.email ? 'input-error' : ''}`} value={form.email} onChange={setField('email')} autoComplete="email" placeholder="Optional email" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Password" htmlFor="reg-password" error={errors.password} hint="Min. 8 characters, one letter and one number" required>
                <div className="relative">
                  <input id="reg-password" type={showPassword ? 'text' : 'password'} className={`input pr-10 ${errors.password ? 'input-error' : ''}`} value={form.password} onChange={setField('password')} autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-1.5 top-1.5 rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              <Field label="Confirm password" htmlFor="reg-confirm" error={errors.confirm} required>
                <input id="reg-confirm" type={showPassword ? 'text' : 'password'} className={`input ${errors.confirm ? 'input-error' : ''}`} value={form.confirm} onChange={setField('confirm')} autoComplete="new-password" />
              </Field>
            </div>
            {error && <InlineError message={error} />}
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? <><Spinner /> Creating account…</> : <><UserPlus size={16} /> Create account</>}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-600">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-brand-800 hover:underline">Sign in</Link>
          </p>
          <p className="mt-3 rounded-lg bg-slate-50 p-2.5 text-center text-[11px] leading-relaxed text-slate-500">
            By registering you acknowledge that this is a recruitment prototype with fictional data and no
            official government affiliation.
          </p>
        </div>
      </div>
    </div>
  );
}
