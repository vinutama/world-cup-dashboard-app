import { Link } from 'react-router-dom';

export default function Welcome() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center md:py-20">
      <h1 className="mb-4 text-3xl font-bold text-white md:text-5xl">FIFA World Cup Dashboard</h1>
      <p className="mx-auto mb-8 max-w-lg text-base text-slate-400 md:text-lg">
        Browse through every FIFA World Cup tournament from 1930 to today. View match results, goal
        scorers, and tournament details.
      </p>
      <Link
        to="/tournaments"
        className="min-h-[44px] min-w-[180px] rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-500 hover:scale-105 active:scale-95"
      >
        Browse Tournaments
      </Link>
    </div>
  );
}
