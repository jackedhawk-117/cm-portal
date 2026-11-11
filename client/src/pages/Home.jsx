import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Construction,
  Droplets,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Landmark,
  MessagesSquare,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  Truck,
  Zap,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { KERALA_DISTRICTS, WORKFLOW_STEPS } from '../lib/constants';
import { useTitle } from '../hooks/useTitle';
import { Spinner } from '../components/ui';

const DEPT_ICONS = {
  PWD: Construction,
  HEALTH: HeartPulse,
  EDUCATION: GraduationCap,
  KSEB: Zap,
  WATER: Droplets,
  LSG: Building2,
  REVENUE: Landmark,
  TRANSPORT: Truck,
  POLICE: Shield,
  SOCIAL: HandHeart,
};

const WORKFLOW_ICONS = [MessagesSquare, ClipboardList, Building2, Search, CheckCircle2, BarChart3];

export default function Home() {
  useTitle('Home');
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get('/stats/public'), api.get('/departments')])
      .then(([statsRes, deptRes]) => {
        if (cancelled) return;
        setStats(statsRes.data);
        setDepartments(deptRes.data);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const submitHref = user?.role === 'CITIZEN' ? '/citizen/new' : user ? '/track' : '/register';

  return (
    <div>
      <section className="hero-pattern border-b border-slate-200">
        <div className="container-page grid gap-10 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-20">
          <div>
            <span className="badge bg-white text-brand-800 ring-1 ring-inset ring-brand-200">
              <Sparkles size={13} /> AI-assisted public grievance redressal
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">
              Your voice.
              <span className="block text-brand-800">A government that responds.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Submit a public grievance to the Chief Minister’s Office, track every step, and hold
              departments accountable. This prototype runs the entire workflow from citizen
              submission to departmental action and citizen feedback.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={submitHref} className="btn-primary px-6 py-3 text-base">
                Submit grievance <ArrowRight size={18} />
              </Link>
              <Link to="/track" className="btn-secondary px-6 py-3 text-base">
                <Search size={17} /> Track grievance
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Free to use · 14 Kerala districts · 10 fictional departments · Demo data only
            </p>
          </div>

          <div className="relative">
            <div className="card overflow-hidden">
              <div className="bg-brand-800 px-5 py-4 text-white">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-200">Live demo statistics</p>
                <p className="mt-1 text-sm text-brand-100">Aggregated from submissions in this prototype database.</p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-2">
                {[
                  { label: 'Grievances submitted', value: stats?.total_grievances, icon: ClipboardList },
                  { label: 'Resolved', value: stats?.resolved_grievances, icon: CheckCircle2 },
                  { label: 'Districts covered', value: stats?.districts_covered, icon: Landmark },
                  { label: 'Departments', value: stats?.departments_count, icon: Building2 },
                ].map((item) => (
                  <div key={item.label} className="p-5">
                    <item.icon size={18} className="text-brand-600" />
                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                      {loading ? <Spinner size={20} className="text-brand-700" /> : (item.value ?? '—')}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 px-5 py-4">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Resolution rate</span>
                  <span className="font-semibold text-brand-800">{stats?.resolution_rate ?? 0}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-brand-600 transition-all"
                    style={{ width: `${stats?.resolution_rate ?? 0}%` }}
                  />
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Clock3 size={12} /> Average resolution: {stats?.avg_resolution_days ?? '—'} days
                </p>
              </div>
            </div>
            <p className="mt-3 text-center text-[11px] text-slate-500">
              Sample statistics update as demo grievances move through the workflow.
            </p>
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Simple, transparent process</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">How your grievance moves</h2>
          </div>
          <Link to="/how-it-works" className="btn-ghost text-sm">
            See the full workflow <ArrowRight size={15} />
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WORKFLOW_STEPS.map((step, index) => {
            const Icon = WORKFLOW_ICONS[index];
            return (
              <div key={step.title} className="card p-5">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Icon size={18} />
                  </span>
                  <span className="text-xs font-bold text-slate-300">0{index + 1}</span>
                </div>
                <h3 className="mt-3 font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="container-page grid gap-8 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <span className="badge bg-brand-50 text-brand-800">
              <Sparkles size={13} /> AI grievance assistant
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Faster triage. Human decisions.
            </h2>
            <p className="mt-3 leading-relaxed text-slate-600">
              When you describe your issue, Gemini analyses it and suggests a category, department and
              priority, plus a neutral summary for the CMO. You can accept or edit every suggestion
              before submitting. AI is advisory only: it never changes a status or makes an official decision.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
              {[
                'Supports English and Malayalam complaints.',
                'Clearly labelled keyword fallback if the AI service is unavailable.',
                'Potential duplicate complaints are flagged for human review, never merged.',
                'Prompts treat complaint text as untrusted data to resist prompt injection.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Example AI suggestion</p>
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">Neutral summary</span>
                <span className="badge bg-brand-50 text-brand-800">Gemini AI</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                Citizen reports a large pothole near a school in Ernakulam causing two-wheeler accidents.
                Urgent road repair and a safety inspection are requested.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-slate-500">Category</p>
                  <p className="mt-0.5 font-semibold text-slate-800">Roads &amp; Potholes</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-slate-500">Department</p>
                  <p className="mt-0.5 font-semibold text-slate-800">Public Works (PWD)</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-slate-500">Priority</p>
                  <p className="mt-0.5 font-semibold text-rose-700">High</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-slate-500">Confidence</p>
                  <p className="mt-0.5 font-semibold text-slate-800">86%</p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-slate-400">
                Illustrative example. A human officer confirms all official fields.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Accountability</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Featured departments</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Grievances are routed to one of {departments.length || 10} fictional departments. Each department
              has a named demo officer who investigates and reports back to the CMO.
            </p>
          </div>
          <Link to="/departments" className="btn-secondary text-sm">
            All departments <ArrowRight size={15} />
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(departments.slice(0, 6).length ? departments.slice(0, 6) : []).map((dept) => {
            const Icon = DEPT_ICONS[dept.code] || Building2;
            return (
              <Link
                key={dept.id}
                to="/departments"
                className="card group p-5 transition hover:-translate-y-0.5 hover:border-brand-200"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-xl bg-brand-50 p-2.5 text-brand-700">
                    <Icon size={20} />
                  </span>
                  <span className="badge bg-slate-100 text-slate-600">{dept.code}</span>
                </div>
                <h3 className="mt-3 font-semibold text-slate-900 group-hover:text-brand-800">{dept.name}</h3>
                <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">{dept.short_description}</p>
                <p className="mt-3 text-xs text-slate-400">
                  {dept.grievance_count} demo grievances · {dept.officer_count} officer
                  {dept.officer_count === 1 ? '' : 's'}
                </p>
              </Link>
            );
          })}
          {loading && (
            <div className="card flex items-center justify-center p-10 text-sm text-slate-500 sm:col-span-2 lg:col-span-3">
              <Spinner className="mr-2" /> Loading departments…
            </div>
          )}
        </div>
      </section>

      <section className="container-page pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-brand-900 px-6 py-12 text-white sm:px-12">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-700/40 blur-2xl" aria-hidden="true" />
          <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Faced a public service issue? Start a grievance today.
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-brand-100">
                It takes about two minutes. Attach a photo or PDF if it helps, and use the AI
                assistant to suggest the right department.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to={submitHref} className="btn bg-white px-5 py-3 text-brand-900 hover:bg-brand-50">
                  Submit grievance <ArrowRight size={17} />
                </Link>
                <Link to="/how-it-works" className="btn border border-white/30 px-5 py-3 text-white hover:bg-white/10">
                  Learn how it works
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-white/10 p-4">
                <TrendingUp size={20} className="mx-auto text-brand-200" />
                <p className="mt-2 text-2xl font-bold">{stats?.resolution_rate ?? 0}%</p>
                <p className="text-[11px] text-brand-200">demo resolution rate</p>
              </div>
              <div className="rounded-xl bg-white/10 p-4">
                <Landmark size={20} className="mx-auto text-brand-200" />
                <p className="mt-2 text-2xl font-bold">{KERALA_DISTRICTS.length}</p>
                <p className="text-[11px] text-brand-200">districts supported</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
