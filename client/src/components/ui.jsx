import { AlertTriangle, Inbox, Loader2, RotateCcw } from 'lucide-react';
import { cx } from '../lib/format';
import { PRIORITY_STYLES, STATUS_STYLES } from '../lib/constants';

export function Spinner({ size = 18, className = '' }) {
  return (
    <Loader2
      size={size}
      className={cx('animate-spin', className)}
      aria-hidden="true"
    />
  );
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-500">
      <Spinner size={28} className="text-brand-700" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="card card-pad flex flex-col items-center gap-3 text-center">
      <span className="rounded-full bg-rose-50 p-3 text-rose-600">
        <AlertTriangle size={22} />
      </span>
      <div>
        <h3 className="font-semibold text-slate-900">Unable to load this section</h3>
        <p className="mt-1 text-sm text-slate-600">{message}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary btn-sm">
          <RotateCcw size={14} /> Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action, icon: Icon = Inbox }) {
  return (
    <div className="card card-pad flex flex-col items-center gap-3 text-center">
      <span className="rounded-full bg-slate-100 p-3 text-slate-500">
        <Icon size={22} />
      </span>
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {description && <p className="mt-1 max-w-md text-sm text-slate-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className={cx('badge', STATUS_STYLES[status] || 'bg-slate-100 text-slate-700')}>
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  return (
    <span className={cx('badge', PRIORITY_STYLES[priority] || 'bg-slate-100 text-slate-700')}>
      {priority}
    </span>
  );
}

export function SourceBadge({ source }) {
  if (!source) {
    return <span className="badge bg-slate-100 text-slate-600">Not analysed</span>;
  }
  if (source === 'gemini') {
    return <span className="badge bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200">Gemini AI</span>;
  }
  return (
    <span className="badge bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-300">
      Fallback (not AI)
    </span>
  );
}

export function OverdueBadge({ overdue }) {
  if (!overdue) return null;
  return (
    <span className="badge bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200">
      Overdue
    </span>
  );
}

export function StatCard({ label, value, icon: Icon, hint, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-800',
    amber: 'bg-amber-50 text-amber-800',
    emerald: 'bg-emerald-50 text-emerald-700',
    rose: 'bg-rose-50 text-rose-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    slate: 'bg-slate-100 text-slate-700',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        {Icon && (
          <span className={cx('rounded-xl p-2.5', tones[tone])}>
            <Icon size={20} aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  );
}

export function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;
  const pages = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  for (let p = start; p <= end; p += 1) pages.push(p);

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Pagination">
      <button
        type="button"
        className="btn-secondary btn-sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </button>
      <div className="flex items-center gap-1">
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cx(
              'min-w-8 rounded-lg px-2.5 py-1.5 text-xs font-semibold',
              p === page ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            {p}
          </button>
        ))}
        <span className="ml-2 text-xs text-slate-500">
          Page {page} of {totalPages}
        </span>
      </div>
      <button
        type="button"
        className="btn-secondary btn-sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}

export function Field({ label, htmlFor, hint, error, required, children, className = '' }) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-rose-600">*</span>}
      </label>
      {children}
      {hint && !error && <p className="hint">{hint}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export function InlineError({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function Stars({ value, onChange, readOnly = false, size = 22 }) {
  return (
    <div className="flex items-center gap-1" role={readOnly ? 'img' : 'radiogroup'} aria-label={`Rating: ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          aria-label={`${star} star${star === 1 ? '' : 's'}`}
          aria-pressed={value === star}
          className={readOnly ? 'cursor-default' : 'rounded p-0.5 hover:scale-110 transition-transform'}
        >
          <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z"
              fill={star <= value ? '#f59e0b' : '#e2e8f0'}
            />
          </svg>
        </button>
      ))}
    </div>
  );
}
