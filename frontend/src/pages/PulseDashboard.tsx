import { useState, useEffect } from 'react';
import type { GlobalFavorite, UpcomingMatch } from '../types/oracle';

// ─ Helpers ─────────────────────────────────────
const rankColor = (i: number) => {
  if (i === 0) return 'bg-gradient-to-br from-amber-300 to-yellow-600 bg-clip-text text-transparent font-black';
  if (i === 1) return 'bg-gradient-to-br from-slate-300 to-slate-500 bg-clip-text text-transparent font-black';
  if (i === 2) return 'bg-gradient-to-br from-amber-600 to-orange-800 bg-clip-text text-transparent font-black';
  return 'text-zinc-400 font-semibold';
};

function formatDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─ Skeletons ───────────────────────────────────
function WheelSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-xl p-4 animate-pulse">
          <div className="w-6 h-6 bg-zinc-800 rounded" />
          <div className="flex-1 flex items-center gap-3">
            <div className="h-4 w-24 bg-zinc-800 rounded" />
            <div className="flex-1 h-2 bg-zinc-800 rounded-full" />
          </div>
          <div className="h-4 w-8 bg-zinc-800 rounded" />
        </div>
      ))}
    </div>
  );
}

function OracleListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-xl p-4 animate-pulse">
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 bg-zinc-800 rounded" />
            <div className="h-3 w-24 bg-zinc-800 rounded" />
          </div>
          <div className="h-5 w-16 bg-zinc-800 rounded" />
        </div>
      ))}
    </div>
  );
}

// ─ Wisdom Wheel ────────────────────────────────
function WisdomWheel({ data }: { data: GlobalFavorite[] }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-zinc-100 mb-5 flex items-center gap-2">
        <span className="text-cyan-400">◈</span> Wisdom Wheel
        <span className="text-xs text-zinc-500 font-normal ml-auto">Top 10 Nations</span>
      </h2>

      <div className="space-y-3">
        {data.map((fav, i) => (
          <div
            key={fav.team}
            className="group flex items-center gap-4 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-xl p-4 transition-all duration-300 hover:border-cyan-500/50 hover:bg-zinc-800/40 hover:shadow-[0_0_16px_rgba(6,182,212,0.08)]"
          >
            {/* Rank */}
            <span className={`w-6 text-center text-lg ${rankColor(i)}`}>
              {i + 1}
            </span>

            {/* Name + Progress bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">
                  {fav.team}
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-800/80 rounded-full overflow-hidden p-[1px]">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.8)] transition-all duration-1000 ease-out"
                  style={{ width: `${fav.probability}%` }}
                />
              </div>
            </div>

            {/* Probability */}
            <span className="text-sm font-bold text-cyan-400 tabular-nums w-10 text-right">
              {fav.probability}%
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─ Match Oracle ────────────────────────────────
function MatchOracleList({ data, loading }: { data: UpcomingMatch[] | null; loading: boolean }) {
  if (loading) return <OracleListSkeleton />;
  if (!data || data.length === 0) {
    return (
      <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-6 rounded-2xl text-center text-zinc-500 text-sm">
        No upcoming match predictions available.
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-6 rounded-2xl overflow-hidden shadow-2xl group hover:border-emerald-500/30 transition-all duration-300">
      {/* Cyber Scanner accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse" />

      <h2 className="text-xl font-bold text-zinc-100 mb-5 flex items-center gap-2">
        <span className="text-emerald-400">◈</span> Match Oracle
        <span className="text-xs text-zinc-500 font-normal ml-auto">Next 10 Matches</span>
      </h2>

      <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
        {data.map((m, i) => {
          const homeOdds = m.odds?.[0] ? (parseFloat(m.odds[0]) * 100).toFixed(0) : '-';
          const awayOdds = m.odds?.[1] ? (parseFloat(m.odds[1]) * 100).toFixed(0) : '-';
          return (
            <div
              key={m.id || i}
              className="flex items-center gap-3 bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-3.5 transition-all duration-200 hover:border-emerald-500/40 hover:bg-zinc-700/40"
            >
              {/* Rank + match info */}
              <span className="text-xs font-bold text-zinc-500 w-5 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-zinc-200 truncate">
                  {m.match}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {formatDate(m.endDate)}
                </div>
              </div>
              {/* Odds pills */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  {homeOdds}%
                </span>
                <span className="text-xs text-zinc-600">vs</span>
                <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                  {awayOdds}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─ PulseDashboard ──────────────────────────────
export default function PulseDashboard() {
  const [leaderboard, setLeaderboard] = useState<GlobalFavorite[]>([]);
  const [oracle, setOracle] = useState<UpcomingMatch[] | null>(null);
  const [loadingWheel, setLoadingWheel] = useState(true);
  const [loadingOracle, setLoadingOracle] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch Wisdom Wheel
    fetch('/api/v1/predictions/global')
      .then((r) => (r.ok ? r.json() : Promise.reject(`status ${r.status}`)))
      .then((data: GlobalFavorite[]) => {
        setLeaderboard(data);
        setLoadingWheel(false);
      })
      .catch((e) => {
        setError(`Failed to load leaderboard: ${e}`);
        setLoadingWheel(false);
      });

    // Fetch Match Oracle — returns array of 10 upcoming matches
    fetch('/api/v1/predictions/match/next')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: UpcomingMatch[] | null) => {
        setOracle(data);
        setLoadingOracle(false);
      })
      .catch(() => setLoadingOracle(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-6 font-sans relative animate-fade-in">
      {/* Ambient cyberpunk orb */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-zinc-100 tracking-tight">
          Pulse <span className="text-cyan-400">Oracle</span>
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Prediction insights powered by Polymarket
        </p>
      </div>

      {error && (
        <div className="mb-6 border border-rose-500/30 bg-rose-500/10 text-rose-400 text-sm p-3 rounded-xl">
          {error}
        </div>
      )}

      {/* 12-col responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
        {/* Left: Wisdom Wheel */}
        <div className="lg:col-span-7">
          {loadingWheel ? <WheelSkeleton /> : <WisdomWheel data={leaderboard} />}
        </div>

        {/* Right: Match Oracle */}
        <div className="lg:col-span-5">
          <MatchOracleList data={oracle} loading={loadingOracle} />
        </div>
      </div>
    </div>
  );
}
