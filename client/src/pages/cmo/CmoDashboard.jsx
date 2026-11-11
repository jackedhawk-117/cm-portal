import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FilterX,
  Gauge,
  Inbox,
  Search,
  Timer,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useTitle } from '../../hooks/useTitle';
import { CmoCharts } from '../../components/CmoCharts';
import { GrievanceTable } from '../../components/GrievanceTable';
import { ErrorState, PageLoader, Pagination, StatCard } from '../../components/ui';
import { KERALA_DISTRICTS, PRIORITIES, STATUSES } from '../../lib/constants';

const EMPTY_FILTERS = {
  district: '',
  category_id: '',
  priority: '',
  status: '',
  overdue: '',
  search: '',
};

/** CMO office dashboard: SLA counts, filters, paginated queue and charts. */
export default function CmoDashboard() {
  useTitle('CMO dashboard');

  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [meta, setMeta] = useState({ departments: [], categories: [] });
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const [list, setList] = useState(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    setStatsError(null);
    Promise.all([api.get('/stats/cmo'), api.get('/departments'), api.get('/categories')])
      .then(([statsRes, deptRes, catRes]) => {
        if (cancelled) return;
        setStats(statsRes.data);
        setMeta({ departments: deptRes.data || [], categories: catRes.data || [] });
      })
      .catch((err) => !cancelled && setStatsError(err.message))
      .finally(() => !cancelled && setStatsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;
    setListLoading(true);
    setListError(null);
    const params = new URLSearchParams({ page: String(page), limit: '10', sort });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    api
      .get(`/grievances?${params.toString()}`)
      .then((res) => !cancelled && setList(res))
      .catch((err) => !cancelled && setListError(err.message))
      .finally(() => !cancelled && setListLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filters, page, sort, reloadKey]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    updateFilter('search', searchInput.trim());
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSearchInput('');
    setSort('newest');
    setPage(1);
  };

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters],
  );

  if (statsLoading && !stats) return <PageLoader label="Loading CMO dashboard…" />;
  if (statsError && !stats) {
    return <ErrorState message={statsError} onRetry={() => setReloadKey((k) => k + 1)} />;
  }

  const counts = stats?.counts || {};
  const sla = stats?.sla_days || { High: 3, Medium: 7, Low: 15 };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Chief Minister’s Office</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Grievance overview
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review new cases, forward them to departments and monitor service-level deadlines.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
          SLA: High {sla.High}d · Medium {sla.Medium}d · Low {sla.Low}d
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total grievances" value={counts.total ?? '—'} icon={Inbox} tone="brand" hint="All time" />
        <StatCard label="Pending" value={counts.pending ?? '—'} icon={Clock3} tone="amber" hint="Not yet resolved" />
        <StatCard label="Resolved" value={counts.resolved ?? '—'} icon={CheckCircle2} tone="emerald" hint="Closed by CMO" />
        <StatCard
          label="Overdue (SLA)"
          value={counts.overdue ?? '—'}
          icon={AlertTriangle}
          tone="rose"
          hint="Escalation recommended"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Submitted" value={counts.submitted} />
        <MiniStat label="Under review" value={counts.under_review} />
        <MiniStat label="In progress" value={counts.in_progress} />
        <MiniStat label="Reopened" value={counts.reopened} />
      </div>

      <CmoCharts stats={stats} />

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Grievance queue</h2>
            <p className="text-sm text-slate-500">
              {list?.pagination ? `${list.pagination.total} matching case${list.pagination.total === 1 ? '' : 's'}` : 'Loading cases…'}
              {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} active`}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Gauge size={15} />
            {counts.avg_resolution_days
              ? `Average resolution ${counts.avg_resolution_days} days`
              : 'No resolved cases yet'}
          </div>
        </div>

        <form onSubmit={submitSearch} className="card card-pad grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <label htmlFor="cmo-search" className="label">Search</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-3 text-slate-400" />
              <input
                id="cmo-search"
                className="input py-2.5 pl-9 text-sm"
                placeholder="Reference ID or subject"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="filter-district" className="label">District</label>
            <select
              id="filter-district"
              className="input py-2.5 text-sm"
              value={filters.district}
              onChange={(e) => updateFilter('district', e.target.value)}
            >
              <option value="">All districts</option>
              {KERALA_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="filter-category" className="label">Category</label>
            <select
              id="filter-category"
              className="input py-2.5 text-sm"
              value={filters.category_id}
              onChange={(e) => updateFilter('category_id', e.target.value)}
            >
              <option value="">All categories</option>
              {meta.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="filter-status" className="label">Status</label>
            <select
              id="filter-status"
              className="input py-2.5 text-sm"
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="filter-priority" className="label">Priority</label>
            <select
              id="filter-priority"
              className="input py-2.5 text-sm"
              value={filters.priority}
              onChange={(e) => updateFilter('priority', e.target.value)}
            >
              <option value="">All priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-6">
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-700"
                checked={filters.overdue === 'true'}
                onChange={(e) => updateFilter('overdue', e.target.checked ? 'true' : '')}
              />
              <Timer size={14} /> Overdue only
            </label>
            <select
              className="input w-auto py-2 text-xs"
              aria-label="Sort order"
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="priority">Priority first</option>
            </select>
            <button type="submit" className="btn-secondary btn-sm">Search</button>
            <button type="button" className="btn-ghost btn-sm" onClick={resetFilters}>
              <FilterX size={14} /> Reset
            </button>
          </div>
        </form>

        {listError ? (
          <ErrorState message={listError} onRetry={() => setReloadKey((k) => k + 1)} />
        ) : (
          <>
            <GrievanceTable
              items={list?.data || []}
              loading={listLoading}
              emptyTitle="No grievances match these filters"
              emptyAction={
                <button type="button" className="btn-secondary btn-sm" onClick={resetFilters}>
                  Clear filters
                </button>
              }
            />
            {list?.pagination && (
              <Pagination page={list.pagination.page} totalPages={list.pagination.totalPages} onChange={setPage} />
            )}
          </>
        )}
      </section>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value ?? 0}</p>
    </div>
  );
}
