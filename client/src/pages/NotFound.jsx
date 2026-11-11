import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import { useTitle } from '../hooks/useTitle';

export default function NotFound() {
  useTitle('Page not found');
  return (
    <div className="container-page flex min-h-[60vh] max-w-xl flex-col items-center justify-center py-16 text-center">
      <span className="rounded-full bg-brand-50 p-4 text-brand-700">
        <Compass size={30} />
      </span>
      <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">Page not found</h1>
      <p className="mt-2 text-sm text-slate-600">
        The page you are looking for does not exist, or the link is out of date.
      </p>
      <div className="mt-6 flex gap-3">
        <Link to="/" className="btn-primary"><Home size={16} /> Back home</Link>
        <Link to="/track" className="btn-secondary">Track a grievance</Link>
      </div>
    </div>
  );
}
