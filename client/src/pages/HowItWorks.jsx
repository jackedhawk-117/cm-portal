import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, ListChecks, ShieldCheck } from 'lucide-react';
import { useTitle } from '../hooks/useTitle';
import { WORKFLOW_STEPS } from '../lib/constants';
import { StatusBadge } from '../components/ui';

const SLA = [
  { priority: 'High', days: 3, tone: 'text-rose-700 bg-rose-50 border-rose-200', example: 'Safety risk, hospital or school emergency, essential service outage.' },
  { priority: 'Medium', days: 7, tone: 'text-amber-800 bg-amber-50 border-amber-200', example: 'Repeated service failure or significant disruption.' },
  { priority: 'Low', days: 15, tone: 'text-slate-700 bg-slate-50 border-slate-200', example: 'Certificates, receipts, billing queries or minor inconvenience.' },
];

export default function HowItWorks() {
  useTitle('How it works');
  return (
    <div>
      <section className="hero-pattern border-b border-slate-200 py-14">
        <div className="container-page max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">The six-step workflow</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            From submission to resolution, every step is visible
          </h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-slate-600">
            The workflow is enforced on the server with a transition table. Illegal status changes are
            rejected, and every change writes a history row with the role, remark and timestamp.
          </p>
        </div>
      </section>

      <section className="container-page max-w-5xl py-12">
        <ol className="relative space-y-4">
          {WORKFLOW_STEPS.map((step, index) => (
            <li key={step.title} className="relative flex gap-4 sm:gap-6">
              <div className="flex flex-col items-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-800 text-sm font-bold text-white">
                  {index + 1}
                </span>
                {index < WORKFLOW_STEPS.length - 1 && <span className="mt-1 w-px flex-1 bg-brand-200" aria-hidden="true" />}
              </div>
              <div className="card mb-2 flex-1 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-slate-900">{step.title}</h2>
                  <StatusBadge status={step.status} />
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="card p-5">
            <Clock3 size={18} className="text-brand-700" />
            <h2 className="mt-2 text-sm font-semibold text-slate-900">SLA-aware</h2>
            <p className="mt-1 text-sm text-slate-600">
              Unresolved cases become overdue automatically, based on priority. The CMO can escalate and raise priority.
            </p>
          </div>
          <div className="card p-5">
            <ListChecks size={18} className="text-brand-700" />
            <h2 className="mt-2 text-sm font-semibold text-slate-900">Server-enforced</h2>
            <p className="mt-1 text-sm text-slate-600">
              Only the correct role can perform each transition. Invalid moves return 409 with a clear message.
            </p>
          </div>
          <div className="card p-5">
            <ShieldCheck size={18} className="text-brand-700" />
            <h2 className="mt-2 text-sm font-semibold text-slate-900">Auditable</h2>
            <p className="mt-1 text-sm text-slate-600">
              Multi-step changes run in database transactions and every status event is recorded permanently.
            </p>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Service-level deadlines</h2>
          <p className="mt-2 text-sm text-slate-600">
            The SLA starts when the grievance is submitted. Overdue status is computed live from the database,
            so it is never stale.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {SLA.map((item) => (
              <div key={item.priority} className={`rounded-2xl border p-5 ${item.tone}`}>
                <p className="text-xs font-semibold uppercase tracking-wide">{item.priority} priority</p>
                <p className="mt-1 text-3xl font-bold">{item.days} days</p>
                <p className="mt-1 text-xs leading-relaxed opacity-80">{item.example}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Status meanings</h2>
          <div className="mt-4 space-y-3">
            {[
              ['Submitted', 'The citizen has filed the grievance and it is waiting for CMO review.'],
              ['Under Review', 'The CMO is reviewing the details, AI suggestions and potential duplicates.'],
              ['In Progress', 'A department officer has been assigned and is investigating or acting.'],
              ['Resolved', 'The CMO accepted the action-taken report. The citizen can give feedback or reopen.'],
              ['Reopened', 'The citizen reopened a resolved case; it returns to the CMO for re-review.'],
            ].map(([status, meaning]) => (
              <div key={status} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:gap-4">
                <div className="sm:w-36"><StatusBadge status={status} /></div>
                <p className="text-sm text-slate-600">{meaning}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/register" className="btn-primary">
            Submit your first grievance <ArrowRight size={16} />
          </Link>
          <Link to="/track" className="btn-secondary">Track an existing grievance</Link>
        </div>
      </section>
    </div>
  );
}
