import { Link } from 'react-router-dom';
import { ArrowUpRight, Inbox } from 'lucide-react';
import { EmptyState, OverdueBadge, PriorityBadge, Spinner, StatusBadge } from './ui';
import { formatDate } from '../lib/format';

/**
 * Responsive grievance list: table on desktop, stacked cards on mobile.
 * Rows link to the shared detail page.
 */
export function GrievanceTable({ items = [], loading = false, emptyAction, emptyTitle = 'No grievances found' }) {
  if (loading) {
    return (
      <div className="card flex items-center justify-center gap-3 p-12 text-sm text-slate-500">
        <Spinner /> Loading grievances…
      </div>
    );
  }
  if (!items.length) {
    return (
      <EmptyState
        icon={Inbox}
        title={emptyTitle}
        description="Try changing the filters, or submit a new grievance if you have not already."
        action={emptyAction}
      />
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="table-th">Reference</th>
              <th scope="col" className="table-th">Subject</th>
              <th scope="col" className="table-th">District</th>
              <th scope="col" className="table-th">Department</th>
              <th scope="col" className="table-th">Priority</th>
              <th scope="col" className="table-th">Status</th>
              <th scope="col" className="table-th">Submitted</th>
              <th scope="col" className="table-th"><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {items.map((g) => (
              <tr key={g.id} className="group hover:bg-brand-50/40">
                <td className="table-td whitespace-nowrap">
                  <Link to={`/grievances/${g.id}`} className="font-mono text-xs font-semibold text-brand-800 hover:underline">
                    {g.ref_no}
                  </Link>
                  {g.is_overdue && <span className="ml-2 inline-block align-middle"><OverdueBadge overdue /></span>}
                </td>
                <td className="table-td max-w-[18rem]">
                  <Link to={`/grievances/${g.id}`} className="line-clamp-2 font-medium text-slate-900 group-hover:text-brand-800">
                    {g.subject}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500">{g.category_name}</p>
                </td>
                <td className="table-td whitespace-nowrap text-xs">{g.district}</td>
                <td className="table-td whitespace-nowrap text-xs">{g.department_name || <span className="text-slate-400">Unassigned</span>}</td>
                <td className="table-td"><PriorityBadge priority={g.priority} /></td>
                <td className="table-td"><StatusBadge status={g.status} /></td>
                <td className="table-td whitespace-nowrap text-xs text-slate-500">{formatDate(g.created_at)}</td>
                <td className="table-td text-right">
                  <Link to={`/grievances/${g.id}`} aria-label={`Open ${g.ref_no}`} className="inline-flex rounded-lg p-1.5 text-slate-400 hover:bg-brand-100 hover:text-brand-800">
                    <ArrowUpRight size={16} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 md:hidden">
        {items.map((g) => (
          <li key={g.id} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <Link to={`/grievances/${g.id}`} className="font-mono text-xs font-semibold text-brand-800">
                {g.ref_no}
              </Link>
              <StatusBadge status={g.status} />
            </div>
            <Link to={`/grievances/${g.id}`} className="mt-2 block text-sm font-semibold text-slate-900">
              {g.subject}
            </Link>
            <p className="mt-1 text-xs text-slate-500">
              {g.category_name} · {g.district}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <PriorityBadge priority={g.priority} />
              {g.is_overdue && <OverdueBadge overdue />}
              <span>· {formatDate(g.created_at)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
