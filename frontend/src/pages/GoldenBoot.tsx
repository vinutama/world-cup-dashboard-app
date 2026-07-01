import { useState, useEffect } from 'react';
import type { GoldenBootPlayer } from '../types/oracle';

// ─ Helpers ─────────────────────────────────────
const rankColor = (i: number) => {
  if (i === 0) return 'bg-gradient-to-br from-amber-300 to-yellow-600 bg-clip-text text-transparent font-black';
  if (i === 1) return 'bg-gradient-to-br from-gray-300 to-gray-400 bg-clip-text text-transparent font-black';
  if (i === 2) return 'bg-gradient-to-br from-amber-600 to-amber-800 bg-clip-text text-transparent font-black';
  return 'text-zinc-400 font-semibold';
};

// ─ Skeleton ────────────────────────────────────
function GoldenBootSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-xl p-4 animate-pulse"
        >
          <div className="w-6 h-6 bg-zinc-800 rounded" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-zinc-800 rounded mb-2" />
            <div className="h-2 w-full bg-zinc-800 rounded-full" />
          </div>
          <div className="h-6 w-10 bg-zinc-800 rounded" />
        </div>
      ))}
    </div>
  );
}

// ─ Empty State ─────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
      <span className="text-4xl mb-3">🥾</span>
      <p className="text-lg font-medium">{message}</p>
      <p className="text-sm mt-1">Check back closer to the tournament</p>
    </div>
  );
}

// ─ Player Card ─────────────────────────────────
function PlayerCard({ player, rank }: { player: GoldenBootPlayer; rank: number }) {
  return (
    <div className="group flex items-center gap-4 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-xl p-4 mb-3 transition-all duration-300 hover:border-cyan-500/50 hover:bg-zinc-800/40 hover:shadow-[0_0_16px_rgba(6,182,212,0.08)]">
      {/* Rank */}
      <span className={`w-8 text-center text-2xl ${rankColor(rank)}`}>
        {rank + 1}
      </span>

      {/* Name + Progress bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">
            {player.player}
          </span>
        </div>
        <div className="w-full h-2.5 bg-zinc-800/80 rounded-full overflow-hidden p-[1px]">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.8)] transition-all duration-1000 ease-out"
            style={{ width: `${player.probability}%` }}
          />
        </div>
      </div>

      {/* Probability */}
      <span className="text-2xl font-bold tabular-nums text-cyan-400 w-14 text-right">
        {player.probability}%
      </span>
    </div>
  );
}

// ─ Main Component ──────────────────────────────
export default function GoldenBoot() {
  const [players, setPlayers] = useState<GoldenBootPlayer[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch('/api/v1/predictions/golden-boot')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: GoldenBootPlayer[]) => {
        if (!cancelled) {
          setPlayers(data);
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
    <div className="min-h-screen text-zinc-100 font-sans relative animate-fade-in">
      {/* Ambient cyberpunk orb */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-zinc-100 tracking-tight flex items-center gap-3">
          <span className="text-amber-400">🥾</span> Golden Boot
        </h1>
        <p className="text-zinc-500 text-sm mt-1 ml-1">
          Top 10 players predicted to be the 2026 World Cup top goalscorer — powered by Polymarket
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 border border-rose-500/30 bg-rose-500/10 text-rose-400 text-sm p-3 rounded-xl">
          Could not load Golden Boot predictions. Please try again later.
        </div>
      )}

      {/* Content */}
      {loading && <GoldenBootSkeleton />}
      {!loading && !error && players !== null && players.length === 0 && (
        <EmptyState message="No Golden Boot predictions available" />
      )}
      {!loading && !error && players !== null && players.length > 0 && (
        <div>
          {players.map((player, i) => (
            <PlayerCard key={player.player} player={player} rank={i} />
          ))}
        </div>
      )}
    </div>
  );
}
