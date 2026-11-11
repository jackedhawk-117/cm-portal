import { Link } from 'react-router-dom';

export function BrandMark({ size = 36, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Grievance portal logo"
      className={className}
    >
      <rect width="64" height="64" rx="14" fill="#065f46" />
      <path
        d="M18 20h28a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H32l-9 7v-7h-5a4 4 0 0 1-4-4V24a4 4 0 0 1 4-4z"
        fill="#ecfdf5"
      />
      <path d="M24 30h16M24 37h10" stroke="#065f46" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

export function Brand({ compact = false, light = false }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-lg" aria-label="CM Kerala Grievance Portal home">
      <BrandMark size={compact ? 32 : 38} />
      <span className="leading-tight">
        <span className={`block text-sm font-bold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
          CM Kerala
        </span>
        <span className={`block text-[11px] font-medium ${light ? 'text-brand-100' : 'text-slate-500'}`}>
          Grievance Redressal
        </span>
      </span>
    </Link>
  );
}
