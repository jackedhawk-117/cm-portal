import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileSearch,
  FilterX,
  Inbox,
  Search,
  Send,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useTitle } from '../../hooks/useTitle';
import { GrievanceTable } from '../../components/GrievanceTable';
import { ErrorState, Pagination, StatCard } from '../../components/ui';
import { PRIORITIES, STATUSES } from '../../lib/constants';

const OFFICER_STATUSES = STATUSES.filter((s) => ['In Progress', 'Resolved', 'Reopened'].includes(s));

/** Department queue for a DEPT_OFFICER. The server enforces the scope. */
export default function OfficerDashboard() {
  useTitle('Department dashboard');
  const { user } = useAuth();

  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: '10', sort });
    if (status) params.set('status', status);
    if (priority) params.set('priority', priority);
    if (search) params.set('search', search);
    api
      .get(`/grievances?${params.toString()}`)
      .then((res) => !cancelled && setList(res))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [status, priority, sort, search, page, reloadKey]);

  const summary = list?.summary || { total: 0, pending: 0, resolved: 0, overdue: 0 };

  const counts = useMemo(() => {
    const items = list?.data || [];
    return {
      waitingReview: items.filter((g) => g.report_status === 'submitted').length,
      changesRequested: items.filter((g) => g.report_status === 'changes_requested').length,
    };
  }, [list]);

  const submitSearch = (event) => {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const reset = () => {
    setStatus('');
    setPriority('');
    setSort('newest');
    setSearch('');
    setSearchInput('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
          {user?.department?.name || 'Department'} · Officer workspace
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Department queue
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Cases forwarded by the CMO to {user?.department?.name || 'your department'}. Investigate, add remarks
          and submit an action-taken report for CMO review.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Assigned cases" value={summary.total} icon={Inbox} tone="brand" hint="In your department" />
        <StatCard label="Pending" value={summary.pending} icon={Clock3} tone="amber" hint="Not resolved" />
        <StatCard label="Resolved" value={summary.resolved} icon={CheckCircle2} tone="emerald" hint="Accepted by CMO" />
        <StatCard label="Overdue" value={summary.overdue} icon={AlertTriangle} tone="rose" hint="Past SLA" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StepCard
          icon={FileSearch}
          title="1. Investigate"
          text="Open a case, review the complaint and any attachment, then add investigation remarks."
        />
        <StepCard
          icon={Send}
          title="2. Submit report"
          text="Write the action-taken report and optionally attach evidence (JPG, PNG or PDF)."
        />
        <StepCard
          icon={ClipboardCheck}
          title="3. CMO review"
          text={`${counts.waitingReview} report${counts.waitingReview === 1 ? '' : 's'} awaiting review · ${counts.changesRequested} sent back`}
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-3">
          <div>
            <label htmlFor="officer-status" className="label">Status</label>
            <select
              id="officer-status"
              className="input w-auto py-2 text-sm"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            >
              <option value="">All statuses</option>
              {OFFICER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="officer-priority" className="label">Priority</label>
            <select
              id="officer-priority"
              className="input w-auto py-2 text-sm"
              value={priority}
              onChange={(e) => { setPriority(e.target.value); setPage(1); }}
            >
              <option value="">All priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="officer-sort" className="label">Sort</label>
            <select
              id="officer-sort"
              className="input w-auto py-2 text-sm"
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="priority">Priority first</option>
            </select>
          </div>
          {(status || priority || search || sort !== 'newest') && (
            <button type="button" className="btn-ghost btn-sm self-end" onClick={reset}>
              <FilterX size={14} /> Reset
            </button>
          )}
        </div>

        <form onSubmit={submitSearch} className="flex w-full max-w-sm gap-2">
          <div className="relative flex-1">
            <label htmlFor="officer-search" className="sr-only">Search queue</label>
            <Search size={15} className="absolute left-3 top-3 text-slate-400" />
            <input
              id="officer-search"
              className="input py-2.5 pl-9 text-sm"
              placeholder="Reference ID or subject"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-secondary btn-sm">Search</button>
        </form>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : (
        <>
          <GrievanceTable
            items={list?.data || []}
            loading={loading}
            emptyTitle="No cases in this view"
            emptyAction={
              <button type="button" className="btn-secondary btn-sm" onClick={reset}>
                Clear filters
              </button>
            }
          />
          {list?.pagination && (
            <Pagination page={list.pagination.page} totalPages={list.pagination.totalPages} onChange={setPage} />
          )}
        </>
      )}

      <p className="rounded-xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-500">
        Newly forwarded cases appear here immediately. After the CMO accepts your action-taken report, the case
        moves to Resolved. A citizen may reopen a resolved case, which returns it to the CMO for review.
      </p>
    </div>
  );
}

function StepCard({ icon: Icon, title, text }) {
  return (
    <div className="card p-4">
      <span className="inline-flex rounded-xl bg-brand-50 p-2 text-brand-800">
        <Icon size={18} />
      </span>
      <h2 className="mt-2 text-sm font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{text}</p>
    </div>
  );
}
