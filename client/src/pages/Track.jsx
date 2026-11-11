import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, FileSearch, Info, Search, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { useTitle } from '../hooks/useTitle';
import { OverdueBadge, PriorityBadge, Spinner, StatusBadge } from '../components/ui';
import { Timeline } from '../components/Timeline';
import { formatDate, formatDateTime } from '../lib/format';

export default function Track() {
  useTitle('Track grievance');
  const [params, setParams] = useSearchParams();
  const [refNo, setRefNo] = useState((params.get('ref') || '').toUpperCase());
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const lookup = async (value) => {
    const normalized = value.trim().toUpperCase();
    if (!/^CMK-\d{4}-\d{6}$/.test(normalized)) {
      setError('Enter a reference ID in the format CMK-2026-000123.');
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/track/${encodeURIComponent(normalized)}`);
      setResult(res.data);
      setParams({ ref: normalized }, { replace: true });
    } catch (err) {
      setResult(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initial = params.get('ref');
    if (initial) lookup(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    lookup(refNo);
  };

  return (
    <div>
      <section className="hero-pattern border-b border-slate-200 py-12">
        <div className="container-page max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Public tracking</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Track your grievance</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
            Enter the reference ID you received when submitting. You will see the current status, the
            assigned department and the public status history. Personal details are never shown publicly.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <label htmlFor="ref-no" className="sr-only">Reference ID</label>
            <div className="relative flex-1">
              <FileSearch size={17} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input
                id="ref-no"
                className="input py-3 pl-10 font-mono uppercase tracking-wide"
                placeholder="CMK-2026-000123"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value.toUpperCase())}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <button type="submit" className="btn-primary px-6 py-3" disabled={loading}>
              {loading ? <><Spinner /> Searching…</> : <><Search size={17} /> Track</>}
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-500">
            Tip: you can also open the grievance from your citizen dashboard for full detail and attachments.
          </p>
        </div>
      </section>

      <div className="container-page max-w-3xl py-10">
        {error && (
          <div className="card card-pad border-rose-200 bg-rose-50/50">
            <h2 className="text-sm font-semibold text-rose-900">We could not find that grievance</h2>
            <p className="mt-1 text-sm text-rose-800">{error}</p>
            <p className="mt-2 text-xs text-rose-700">
              Check the reference format and try again. Reference IDs are case-insensitive.
            </p>
          </div>
        )}

        {result && (
          <article className="card overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-semibold text-brand-800">{result.ref_no}</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">{result.subject}</h2>
                </div>
                <StatusBadge status={result.status} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <PriorityBadge priority={result.priority} />
                {result.is_overdue && <OverdueBadge overdue />}
                <span className="text-slate-500">SLA: {result.sla_days} days</span>
                {result.escalation_count > 0 && (
                  <span className="badge bg-rose-50 text-rose-700">Escalated ×{result.escalation_count}</span>
                )}
              </div>
            </div>

            <dl className="grid gap-4 px-5 py-5 text-sm sm:grid-cols-2 sm:px-6">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</dt>
                <dd className="mt-1 font-medium text-slate-800">{result.category?.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned department</dt>
                <dd className="mt-1 font-medium text-slate-800">{result.department?.name || 'Awaiting CMO assignment'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">District</dt>
                <dd className="mt-1 font-medium text-slate-800">{result.district}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted</dt>
                <dd className="mt-1 font-medium text-slate-800">{formatDateTime(result.created_at)}</dd>
              </div>
              {result.resolved_at && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resolved</dt>
                  <dd className="mt-1 font-medium text-emerald-700">{formatDate(result.resolved_at)}</dd>
                </div>
              )}
            </dl>

            <div className="border-t border-slate-100 px-5 py-5 sm:px-6">
              <h3 className="text-sm font-semibold text-slate-900">Status history</h3>
              <div className="mt-4">
                <Timeline events={result.timeline} />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 text-xs sm:px-6">
              <p className="flex items-center gap-1.5 text-slate-500">
                <ShieldCheck size={14} /> Personal data is hidden from public tracking.
              </p>
              <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-brand-800 hover:underline">
                Sign in for full details <ArrowRight size={13} />
              </Link>
            </div>
          </article>
        )}

        {!result && !error && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <Info size={22} className="mx-auto text-slate-400" />
            <h2 className="mt-3 text-sm font-semibold text-slate-900">Your reference ID looks like this</h2>
            <p className="mt-1 font-mono text-lg font-bold tracking-wide text-brand-800">CMK-2026-000123</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              It is shown immediately after you submit a grievance and in your citizen dashboard.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
