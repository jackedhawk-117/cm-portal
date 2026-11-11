import { Link } from 'react-router-dom';
import { ArrowRight, Compass, Flag, Eye, HeartHandshake, ShieldCheck, Target } from 'lucide-react';
import { useTitle } from '../hooks/useTitle';

export default function About() {
  useTitle('About');
  return (
    <div>
      <section className="bg-brand-900 py-14 text-white">
        <div className="container-page max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-300">About the portal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">A clearer path from complaint to action</h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-brand-100">
            This recruitment prototype demonstrates how a modern public grievance redressal system could work:
            citizens submit issues, the Chief Minister’s Office triages them, departments act, and citizens
            see progress and hold the system accountable.
          </p>
        </div>
      </section>

      <div className="container-page prose-page max-w-4xl py-12">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
          <strong>Prototype notice.</strong> This is not a government service. All departments, officers,
          grievances and statistics are fictional, and no official logos or emblems are used.
        </div>

        <h2>Purpose</h2>
        <p>
          Public grievances often get lost between departments, and citizens have little visibility into what
          happens after they complain. The portal’s purpose is to provide a single, transparent channel where a
          citizen can submit a grievance, receive a reference number and follow the case through a defined
          workflow with clear deadlines.
        </p>

        <h2>Vision</h2>
        <p>
          A public service where every complaint has a visible owner, a deadline and a response — and where
          citizens can see that their voice led to action.
        </p>

        <h2>Mission</h2>
        <p>
          To demonstrate a reliable, accessible and accountable grievance workflow that combines human
          judgement with AI-assisted triage, without letting AI replace official decision-making.
        </p>

        <h2>Objectives</h2>
        <ul>
          <li>Make grievance submission simple for citizens across all 14 Kerala districts.</li>
          <li>Give the CMO a single queue with SLA tracking, escalation and departmental accountability.</li>
          <li>Give department officers a focused workspace to investigate and report.</li>
          <li>Use AI only as an advisory triage aid, with every suggestion validated and clearly labelled.</li>
          <li>Keep personal data out of public tracking while publishing the status timeline.</li>
          <li>Record every status change in an immutable history with role, remark and timestamp.</li>
        </ul>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {[
            { icon: Compass, title: 'Citizen first', body: 'Plain language, accessible forms and a mobile-friendly experience.' },
            { icon: Eye, title: 'Transparent', body: 'Public timelines, explicit statuses and published service-level deadlines.' },
            { icon: ShieldCheck, title: 'Accountable', body: 'Every action is attributed to a role and written to the case history.' },
            { icon: HeartHandshake, title: 'Human in the loop', body: 'AI suggestions never change official fields or statuses automatically.' },
            { icon: Target, title: 'Outcome focused', body: 'Action-taken reports, feedback and reopening close the loop with citizens.' },
            { icon: Flag, title: 'Configurable', body: 'SLA windows and workflow rules live in one place and are enforced server-side.' },
          ].map((item) => (
            <div key={item.title} className="card p-5">
              <span className="rounded-lg bg-brand-50 p-2 text-brand-700">
                <item.icon size={18} />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/how-it-works" className="btn-primary">
            See how it works <ArrowRight size={16} />
          </Link>
          <Link to="/departments" className="btn-secondary">Browse departments</Link>
        </div>
      </div>
    </div>
  );
}
