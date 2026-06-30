import { useState, useEffect } from 'react';

// ─ Types ────────────────────────────────────────
interface TeamStanding {
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

interface GroupStanding {
  group: string;
  teams: TeamStanding[];
}

// ─ Helpers ──────────────────────────────────────
function flagUrl(name: string): string {
  // Map full team names to country codes for flagsapi
  const map: Record<string, string> = {
    'Argentina': 'ar', 'Australia': 'au', 'Austria': 'at', 'Belgium': 'be',
    'Bosnia and Herzegovina': 'ba', 'Brazil': 'br', 'Canada': 'ca',
    'Cabo Verde': 'cv', 'Colombia': 'co', "Côte d'Ivoire": 'ci',
    'Croatia': 'hr', 'DR Congo': 'cd', 'Ecuador': 'ec', 'Egypt': 'eg',
    'England': 'gb-eng', 'France': 'fr', 'Germany': 'de', 'Ghana': 'gh',
    'Japan': 'jp', 'Mexico': 'mx', 'Morocco': 'ma', 'Netherlands': 'nl',
    'Norway': 'no', 'Paraguay': 'py', 'Portugal': 'pt', 'Senegal': 'sn',
    'South Africa': 'za', 'Spain': 'es', 'Sweden': 'se', 'Switzerland': 'ch',
    'USA': 'us',
  };
  const code = map[name] || name.slice(0, 2).toLowerCase();
  return `https://flagsapi.com/${code.toUpperCase()}/flat/24.png`;
}

// ─ Skeleton ─────────────────────────────────────
function GroupSkeleton() {
  return (
    <div className="rounded-xl border border-blue-900/30 bg-slate-800/60 p-4 backdrop-blur-sm animate-pulse">
      <div className="mb-3 h-5 w-32 rounded bg-slate-700" />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="h-4 w-6 rounded bg-slate-700" />
            <div className="h-4 flex-1 rounded bg-slate-700" />
            <div className="h-4 w-6 rounded bg-slate-700" />
            <div className="h-4 w-6 rounded bg-slate-700" />
            <div className="h-4 w-6 rounded bg-slate-700" />
            <div className="h-4 w-6 rounded bg-slate-700" />
            <div className="h-4 w-6 rounded bg-slate-700" />
            <div className="h-4 w-8 rounded bg-slate-700" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─ Group Table ───────────────────────────────────
function GroupTable({ group, teams }: GroupStanding) {
  return (
    <div className="group rounded-xl border border-blue-900/30 bg-slate-800/60 p-4 backdrop-blur-sm transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5">
      {/* Group header */}
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-blue-400">
        Group {group.replace('Group ', '')}
      </h3>

      {/* Table header */}
      <div className="mb-2 grid grid-cols-[28px_1fr_24px_24px_24px_24px_24px_24px_32px] gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        <span>#</span>
        <span>Team</span>
        <span className="text-center">P</span>
        <span className="text-center">W</span>
        <span className="text-center">D</span>
        <span className="text-center">L</span>
        <span className="text-center">GF</span>
        <span className="text-center">GA</span>
        <span className="text-center">PTS</span>
      </div>

      {/* Team rows */}
      {teams.map((t, i) => {
        const isTopTwo = i < 2;
        return (
          <div
            key={t.teamName}
            className={`grid grid-cols-[28px_1fr_24px_24px_24px_24px_24px_24px_32px] gap-1.5 rounded-lg px-1.5 py-2 text-sm transition-colors ${
              isTopTwo
                ? 'bg-emerald-900/10 text-white'
                : 'text-slate-400 hover:bg-slate-700/40'
            }`}
          >
            <span className={`text-center text-xs font-bold ${isTopTwo ? 'text-emerald-400' : 'text-slate-600'}`}>
              {i + 1}
            </span>
            <div className="flex items-center gap-1.5 truncate font-medium">
              <img
                src={flagUrl(t.teamName)}
                alt=""
                className="h-4 w-6 rounded-sm object-cover shadow-sm"
                loading="lazy"
              />
              <span className="truncate">{t.teamName}</span>
            </div>
            <span className="text-center font-medium">{t.played}</span>
            <span className="text-center">{t.wins}</span>
            <span className="text-center">{t.draws}</span>
            <span className="text-center">{t.losses}</span>
            <span className="text-center">{t.goalsFor}</span>
            <span className="text-center">{t.goalsAgainst}</span>
            <span className={`text-center font-bold ${isTopTwo ? 'text-emerald-400' : ''}`}>
              {t.points}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─ Main Component ───────────────────────────────
export default function Standings() {
  const [groups, setGroups] = useState<GroupStanding[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/standings')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setGroups)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
          Group Standings
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Live World Cup 2026 group tables — powered by ESPN
        </p>
      </div>

      {/* Loading */}
      {!groups && !error && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <GroupSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-800/40 bg-red-950/30 p-6 text-center backdrop-blur-sm">
          <p className="text-lg text-red-400">⚠️ Could not load standings</p>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
        </div>
      )}

      {/* Standings grid */}
      {groups && !error && (
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map((g) => (
            <GroupTable key={g.group} group={g.group} teams={g.teams} />
          ))}
        </div>
      )}
    </div>
  );
}
