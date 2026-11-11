import { Lock } from 'lucide-react';
import { formatDateTime } from '../lib/format';
import { ROLE_LABELS, STATUS_STYLES } from '../lib/constants';
import { cx } from '../lib/format';

const DOT_COLORS = {
  Submitted: 'bg-sky-500',
  'Under Review': 'bg-amber-500',
  'In Progress': 'bg-indigo-500',
  Resolved: 'bg-emerald-500',
  Reopened: 'bg-rose-500',
};

/** Vertical public/internal status timeline. */
export function Timeline({ events = [], showActor = false }) {
  if (!events.length) {
    return <p className="text-sm text-slate-500">No status updates yet.</p>;
  }
  return (
    <ol className="relative space-y-5 border-l border-slate-200 pl-6">
      {events.map((event, index) => {
        const changed = event.from_status && event.from_status !== event.to_status;
        return (
          <li key={`${event.id || index}-${event.created_at}`} className="relative">
            <span
              className={cx(
                'absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white',
                DOT_COLORS[event.to_status] || 'bg-slate-400',
              )}
              aria-hidden="true"
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className={cx('badge', STATUS_STYLES[event.to_status] || 'bg-slate-100 text-slate-700')}>
                {changed ? `${event.from_status} → ${event.to_status}` : event.to_status}
              </span>
              {event.is_internal && (
                <span className="badge bg-slate-200 text-slate-700">
                  <Lock size={11} /> Internal note
                </span>
              )}
              <span className="text-[11px] font-medium text-slate-400">
                {formatDateTime(event.created_at)}
              </span>
            </div>
            {event.remark && <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{event.remark}</p>}
            <p className="mt-1 text-[11px] text-slate-500">
              {ROLE_LABELS[event.changed_by_role] || event.changed_by_role || 'System'}
              {showActor && event.changed_by_name ? ` · ${event.changed_by_name}` : ''}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
