import { useState, useEffect } from 'react';
import type { ContinentPrediction } from '../types/oracle';

// ── Continent metadata ──────────────────────────────
const continentMeta: Record<string, { emoji: string; neon: string; bar: string }> = {
  Europe:        { emoji: '🌍', neon: 'text-cyan-400',       bar: 'from-cyan-500 to-sky-400' },
  'South America': { emoji: '🌎', neon: 'text-emerald-400',    bar: 'from-emerald-500 to-green-400' },
  'North America': { emoji: '🌎', neon: 'text-blue-400',       bar: 'from-blue-500 to-blue-400' },
  Africa:        { emoji: '🌍', neon: 'text-amber-400',      bar: 'from-amber-500 to-yellow-400' },
  Asia:          { emoji: '🌏', neon: 'text-rose-400',       bar: 'from-rose-500 to-pink-400' },
  Oceania:       { emoji: '🌊', neon: 'text-violet-400',     bar: 'from-violet-500 to-purple-400' },
};

const defaultMeta = { emoji: '🏳', neon: 'text-zinc-400', bar: 'from-zinc-500 to-zinc-400' };

// ── Skeleton ────────────────────────────────────────
export function ContinentSkeleton() {
  return (
    <section>
      <h2 className="text-xl font-bold text-zinc-100 mb-5 flex items-center gap-2">
        <span className="text-cyan-400">◈</span> Continent Pulse
      </h2>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-xl p-4 animate-pulse"
          >
            <div className="w-8 h-8 bg-zinc-800 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-20 bg-zinc-800 rounded" />
              <div className="h-2 w-full bg-zinc-800 rounded-full" />
            </div>
            <div className="h-4 w-10 bg-zinc-800 rounded" />
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Component ───────────────────────────────────────
export default function TopContinentList() {
  const [data, setData] = useState<ContinentPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/predictions/continent')
      .then((r) => (r.ok ? r.json() : Promise.reject(`status ${r.status}`)))
      .then((json: ContinentPrediction[]) => {
        setData(json);
        setLoading(false);
      })
      .catch((e) => {
        setError(`Failed to load continent data: ${e}`);
        setLoading(false);
      });
  }, []);

  if (loading) return <ContinentSkeleton />;

  return (
    <section>
      <h2 className="text-xl font-bold text-zinc-100 mb-5 flex items-center gap-2">
        <span className="text-cyan-400">◈</span> Continent Pulse
        <span className="text-xs text-zinc-500 font-normal ml-auto">Who will win?</span>
      </h2>

      {error && (
        <div className="border border-rose-500/30 bg-rose-500/10 text-rose-400 text-sm p-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {data.map((c) => {
          const meta = continentMeta[c.continent] ?? defaultMeta;
          return (
            <div
              key={c.continent}
              className="group flex items-center gap-3 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-xl p-4 transition-all duration-300 hover:border-cyan-500/50 hover:bg-zinc-800/40 hover:shadow-[0_0_16px_rgba(6,182,212,0.08)]"
            >
              {/* Emoji icon */}
              <span className="text-2xl">{meta.emoji}</span>

              {/* Name + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">
                    {c.label}
                  </span>
                  <span className={`text-xs font-bold ${meta.neon} tabular-nums ml-2`}>
                    {c.probability}%
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-800/80 rounded-full overflow-hidden p-[1px]">
                  <div
                    className={`h-full bg-gradient-to-r ${meta.bar} rounded-full shadow-[0_0_12px_rgba(6,182,212,0.8)] transition-all duration-1000 ease-out`}
                    style={{ width: `${c.probability}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
