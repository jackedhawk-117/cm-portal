import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Construction,
  Droplets,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Landmark,
  Mail,
  Search,
  Shield,
  Truck,
  Users,
  Zap,
} from 'lucide-react';
import { api } from '../lib/api';
import { useTitle } from '../hooks/useTitle';
import { EmptyState, ErrorState, PageLoader } from '../components/ui';

const ICONS = {
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

export default function Departments() {
  useTitle('Departments');
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get('/departments')
      .then((res) => !cancelled && setDepartments(res.data))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter(
      (d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || d.short_description.toLowerCase().includes(q),
    );
  }, [departments, query]);

  return (
    <div>
      <section className="bg-brand-900 py-12 text-white">
        <div className="container-page">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-300">Fictional departments</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">The departments that handle grievances</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-brand-100 sm:text-base">
            Each grievance is routed to one of these prototype departments. Every department has a demo
            officer account and a visible workload, making the CMO assignment step realistic.
          </p>
        </div>
      </section>

      <div className="container-page py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {loading ? 'Loading departments…' : `${departments.length} departments · demo data`}
          </p>
          <label className="relative w-full max-w-sm">
            <span className="sr-only">Search departments</span>
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="search"
              className="input pl-9"
              placeholder="Search by name or code…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>

        {loading && <div className="mt-8"><PageLoader label="Loading departments…" /></div>}
        {error && <div className="mt-8"><ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} /></div>}
        {!loading && !error && !filtered.length && (
          <div className="mt-8">
            <EmptyState title="No departments match your search" description="Try a different department name or code." />
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((dept) => {
              const Icon = ICONS[dept.code] || Building2;
              return (
                <article key={dept.id} className="card card-pad">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-xl bg-brand-50 p-2.5 text-brand-700">
                      <Icon size={20} />
                    </span>
                    <span className="badge bg-slate-100 text-slate-600">{dept.code}</span>
                  </div>
                  <h2 className="mt-3 text-base font-semibold text-slate-900">{dept.name}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{dept.short_description}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Users size={13} /> {dept.officer_count} demo officer{dept.officer_count === 1 ? '' : 's'}
                    </span>
                    <span>{dept.grievance_count} grievances</span>
                  </div>
                  {dept.contact_email && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                      <Mail size={12} /> {dept.contact_email} (fictional)
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
