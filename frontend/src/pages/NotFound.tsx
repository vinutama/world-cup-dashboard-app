import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="mb-4 text-5xl font-bold text-white">404</h1>
      <p className="mb-2 text-lg text-slate-400">Page Not Found</p>
      <p className="mb-8 text-sm text-slate-500">
        The page you're looking for doesn't exist.
      </p>
      <Link
        to="/"
        className="rounded-lg bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-600"
      >
        Go Home
      </Link>
    </div>
  );
}
