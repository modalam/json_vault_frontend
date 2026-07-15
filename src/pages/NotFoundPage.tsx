import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-2xl font-semibold text-white">Page not found</h1>
      <p className="text-slate-400">That route does not exist.</p>
      <Link to="/" className="rounded bg-brand px-4 py-2 text-sm text-white">
        Create a blob
      </Link>
    </div>
  );
}
