import { useState } from 'react';
import { CheckCircle2, Clock3, Mail, MapPin, MessageSquare, Send } from 'lucide-react';
import { api } from '../lib/api';
import { useTitle } from '../hooks/useTitle';
import { Field, InlineError, Spinner } from '../components/ui';
import { useToast } from '../context/ToastContext';

export default function Contact() {
  useTitle('Contact us');
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const setField = (key) => (e) => {
    setForm((current) => ({ ...current, [key]: e.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter your name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email';
    if (form.subject.trim().length < 3) next.subject = 'Enter a subject';
    if (form.message.trim().length < 10) next.message = 'Message must be at least 10 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.post('/contact', form);
      setSubmitted(true);
      setForm({ name: '', email: '', subject: '', message: '' });
      toast.success('Your enquiry has been recorded.');
    } catch (err) {
      if (err.details?.length) {
        const mapped = {};
        for (const issue of err.details) mapped[issue.path] = issue.message;
        setErrors(mapped);
      }
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <section className="bg-brand-900 py-12 text-white">
        <div className="container-page">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-300">Contact</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Talk to the prototype team</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-brand-100 sm:text-base">
            Questions about the workflow, the API or the demo accounts? Send a message and it will be
            saved in the contact enquiries table for this prototype.
          </p>
        </div>
      </section>

      <div className="container-page grid max-w-5xl gap-8 py-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card card-pad">
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="rounded-full bg-emerald-50 p-3 text-emerald-700">
                <CheckCircle2 size={24} />
              </span>
              <h2 className="text-lg font-semibold text-slate-900">Enquiry recorded</h2>
              <p className="max-w-md text-sm text-slate-600">
                Thank you. Your message has been stored in the prototype database. This is not an official
                government contact channel and no email will be sent.
              </p>
              <button type="button" className="btn-secondary btn-sm mt-2" onClick={() => setSubmitted(false)}>
                Send another message
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-brand-700" />
                <h2 className="text-lg font-semibold text-slate-900">Send us a message</h2>
              </div>
              <p className="mt-1 text-sm text-slate-600">Fields marked * are required.</p>
              <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Your name" htmlFor="contact-name" error={errors.name} required>
                    <input id="contact-name" className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={setField('name')} autoComplete="name" placeholder="Fictional name" />
                  </Field>
                  <Field label="Email address" htmlFor="contact-email" error={errors.email} required>
                    <input id="contact-email" type="email" className={`input ${errors.email ? 'input-error' : ''}`} value={form.email} onChange={setField('email')} autoComplete="email" placeholder="you@example.com" />
                  </Field>
                </div>
                <Field label="Subject" htmlFor="contact-subject" error={errors.subject} required>
                  <input id="contact-subject" className={`input ${errors.subject ? 'input-error' : ''}`} value={form.subject} onChange={setField('subject')} placeholder="What is your question about?" />
                </Field>
                <Field label="Message" htmlFor="contact-message" error={errors.message} hint={`${form.message.length}/3000 characters`} required>
                  <textarea id="contact-message" rows={6} className={`input ${errors.message ? 'input-error' : ''}`} value={form.message} onChange={setField('message')} maxLength={3000} placeholder="Write your enquiry here…" />
                </Field>
                {submitError && <InlineError message={submitError} />}
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? <><Spinner /> Sending…</> : <><Send size={16} /> Send message</>}
                </button>
              </form>
            </>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card card-pad">
            <h2 className="text-sm font-semibold text-slate-900">Prototype contact details</h2>
            <ul className="mt-3 space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <Mail size={16} className="mt-0.5 text-brand-700" />
                <span>grievance@demo.test <span className="text-xs text-slate-400">(fictional)</span></span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 text-brand-700" />
                <span>No physical office. This portal is a recruitment prototype and is not an official government channel.</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock3 size={16} className="mt-0.5 text-brand-700" />
                <span>Demo support is best-effort only.</span>
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
            <strong>Recruitment prototype.</strong> Do not submit real personal data or genuine grievances here.
            All departments, officers and cases are fictional.
          </div>
        </aside>
      </div>
    </div>
  );
}
