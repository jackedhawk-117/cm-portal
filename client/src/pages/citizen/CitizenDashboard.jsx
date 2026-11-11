import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock3, FilePlus2, Inbox, Search, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useTitle } from '../../hooks/useTitle';
import { GrievanceTable } from '../../components/GrievanceTable';
import { ErrorState, Pagination, StatCard } from '../../components/ui';
import { STATUSES } from '../../lib/constants';

const FILTERS = ['All', ...STATUSES];

export default function CitizenDashboard() {
  useTitle('My grievances');
  const { user } = useAuth();
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: '8' });
    if (status !== 'All') params.set('status', status);
    if (search) params.set('search', search);
    api
      .get(`/grievances?${params.toString()}`)
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, status, search, reloadKey]);

  const changeStatus = (next) => {
    setStatus(next);
    setPage(1);
  };

  const submitSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const summary = data?.summary || { total: 0, pending: 0, resolved: 0, overdue: 0 };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Citizen dashboard</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            My grievances
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Welcome, {user?.name?.split(' ')[0]}. Track every case you have submitted and follow the CMO’s response.
          </p>
        </div>
        <Link to="/citizen/new" className="btn-primary">
          <FilePlus2 size={16} /> New grievance
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={summary.total} icon={Inbox} tone="brand" />
        <StatCard label="Pending" value={summary.pending} icon={Clock3} tone="amber" />
        <StatCard label="Resolved" value={summary.resolved} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Overdue" value={summary.overdue} icon={AlertTriangle} tone="rose" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by status">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={status === item}
              onClick={() => changeStatus(item)}
              className={
                status === item
                  ? 'rounded-full bg-brand-800 px-3.5 py-1.5 text-xs font-semibold text-white'
                  : 'rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:border-brand-300 hover:text-brand-800'
              }
            >
              {item}
            </button>
          ))}
        </div>
        <form onSubmit={submitSearch} className="flex w-full max-w-sm gap-2">
          <div className="relative flex-1">
            <label htmlFor="citizen-search" className="sr-only">Search my grievances</label>
            <Search size={15} className="absolute left-3 top-3 text-slate-400" />
            <input
              id="citizen-search"
              className="input py-2.5 pl-9 pr-8 text-sm"
              placeholder="Search reference or subject"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }} className="absolute right-2 top-2.5 rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>
          <button type="submit" className="btn-secondary btn-sm">Search</button>
        </form>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : (
        <>
          <GrievanceTable
            items={data?.data || []}
            loading={loading}
            emptyTitle={status === 'All' && !search ? 'You have not submitted a grievance yet' : 'No grievances match these filters'}
            emptyAction={
              <Link to="/citizen/new" className="btn-primary btn-sm">
                <FilePlus2 size={15} /> Submit a grievance
              </Link>
            }
          />
          {data?.pagination && (
            <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
