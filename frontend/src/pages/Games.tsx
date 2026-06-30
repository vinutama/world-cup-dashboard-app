import { useState, useEffect } from 'react';
import type { GameItem } from '../types/oracle';

// ─ Helpers ─────────────────────────────────────
const API_BASE = '/api/v1';

function formatGameDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function percentBar(pct: number, accent: string) {
  const barClass =
    accent === 'home'
      ? 'bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]'
      : accent === 'away'
        ? 'bg-gradient-to-r from-rose-500 to-red-400 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
        : 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]';
  return (
    <div className="w-full h-2 bg-zinc-800/80 rounded-full overflow-hidden p-[1px]">
      <div
        className={`h-full rounded-full transition-all duration-1000 ease-out ${barClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─ Skeleton ────────────────────────────────────
function GamesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-5 animate-pulse"
        >
          <div className="h-4 w-32 bg-zinc-800 rounded mb-4" />
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 w-20 bg-zinc-800 rounded" />
            <div className="h-4 w-8 bg-zinc-800 rounded" />
            <div className="h-5 w-20 bg-zinc-800 rounded" />
          </div>
          <div className="h-2 w-full bg-zinc-800 rounded mb-2" />
          <div className="h-2 w-full bg-zinc-800 rounded mb-2" />
          <div className="h-2 w-full bg-zinc-800 rounded" />
        </div>
      ))}
    </div>
  );
}

// ─ Empty State ─────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
      <span className="text-4xl mb-3">🎯</span>
      <p className="text-lg font-medium">{message}</p>
      <p className="text-sm mt-1">Check back closer to match time</p>
    </div>
  );
}

// ─ Match Card ──────────────────────────────────
function MatchCard({ game }: { game: GameItem }) {
  const isPast = game.date && new Date(game.date + 'T23:59:59Z') < new Date();
  const cardClass = isPast
    ? 'opacity-60 border-zinc-800/50'
    : 'hover:border-cyan-500/50 hover:bg-zinc-800/40 hover:shadow-[0_0_16px_rgba(6,182,212,0.08)]';

  return (
    <div
      className={`group bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-5 transition-all duration-300 ${cardClass}`}
    >
      {/* Date + source badge */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-zinc-500 font-mono">{formatGameDate(game.date)}</span>
        <span className="text-[10px] uppercase tracking-wider text-zinc-600 bg-zinc-800/60 px-2 py-0.5 rounded-full">
          {isPast ? 'Completed' : 'Upcoming'}
        </span>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between mb-5">
        {/* Team 1 */}
        <div className="flex-1 text-center">
          <span className="block text-sm font-bold text-zinc-100 truncate">{game.team1}</span>
          <span className={`text-lg font-black tabular-nums ${game.percentHome >= game.percentAway ? 'text-emerald-400' : 'text-zinc-500'}`}>
            {game.percentHome}%
          </span>
        </div>

        {/* VS */}
        <div className="flex-shrink-0 mx-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center">
            <span className="text-xs font-bold text-zinc-400">VS</span>
          </div>
        </div>

        {/* Draw */}
        <div className="flex-shrink-0 text-center mx-2">
          <span className="block text-[10px] text-zinc-500 uppercase tracking-wider">Draw</span>
          <span className="text-lg font-bold text-amber-400 tabular-nums">{game.percentDraw}%</span>
        </div>

        {/* VS */}
        <div className="flex-shrink-0 mx-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center">
            <span className="text-xs font-bold text-zinc-400">VS</span>
          </div>
        </div>

        {/* Team 2 */}
        <div className="flex-1 text-center">
          <span className="block text-sm font-bold text-zinc-100 truncate">{game.team2}</span>
          <span className={`text-lg font-black tabular-nums ${game.percentAway >= game.percentHome ? 'text-rose-400' : 'text-zinc-500'}`}>
            {game.percentAway}%
          </span>
        </div>
      </div>

      {/* Probability bars */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <span className="w-16 truncate text-right">{game.team1}</span>
          <div className="flex-1">{percentBar(game.percentHome, 'home')}</div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <span className="w-16 truncate text-right">Draw</span>
          <div className="flex-1">{percentBar(game.percentDraw, 'draw')}</div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <span className="w-16 truncate text-right">{game.team2}</span>
          <div className="flex-1">{percentBar(game.percentAway, 'away')}</div>
        </div>
      </div>

      {/* Volume footer */}
      <div className="border-t border-zinc-800/60 pt-2.5 mt-3 flex items-center justify-between">
        <span className="text-[11px] text-zinc-600">
          Vol: <span className="text-zinc-400 font-mono">{formatVolume(game.volume)}</span>
        </span>
        <span className="text-[10px] text-zinc-600">{game.source}</span>
      </div>
    </div>
  );
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
}

// ─ Main Page ───────────────────────────────────
export default function Games() {
  const [games, setGames] = useState<GameItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`${API_BASE}/games`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: GameItem[]) => {
        if (!cancelled) {
          setGames(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-zinc-100 flex items-center gap-3">
          <span className="text-cyan-400 text-2xl">⚽</span> World Cup 2026 Matches
        </h1>
        <p className="text-sm text-zinc-500 mt-1 ml-9">
          Live Polymarket moneyline odds for all group-stage fixtures
        </p>
      </div>

      {/* Content */}
      {loading && <GamesSkeleton />}
      {error && <EmptyState message="Could not load match data" />}
      {!loading && !error && games !== null && games.length === 0 && (
        <EmptyState message="No matches available" />
      )}
      {!loading && !error && games !== null && games.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {games.map((game) => (
            <MatchCard key={game.slug} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
