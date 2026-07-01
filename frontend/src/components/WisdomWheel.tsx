import type { GlobalFavorite } from '../types/oracle';

// ─ Team → Flag Code ────────────────────────────
const teamFlagMap: Record<string, string> = {
  Argentina: 'ar', Australia: 'au', Austria: 'at', Belgium: 'be',
  'Bosnia and Herzegovina': 'ba', Brazil: 'br', Canada: 'ca',
  'Cabo Verde': 'cv', Colombia: 'co', "Côte d'Ivoire": 'ci',
  Croatia: 'hr', 'DR Congo': 'cd', Ecuador: 'ec', Egypt: 'eg',
  England: 'gb-eng', France: 'fr', Germany: 'de', Ghana: 'gh',
  Japan: 'jp', Mexico: 'mx', Morocco: 'ma', Netherlands: 'nl',
  Norway: 'no', Paraguay: 'py', Portugal: 'pt', Senegal: 'sn',
  'South Africa': 'za', Spain: 'es', Sweden: 'se', Switzerland: 'ch',
  USA: 'us', Wales: 'gb-wls', Uruguay: 'uy',
  'South Korea': 'kr', 'Korea Republic': 'kr', 'Saudi Arabia': 'sa',
  Iran: 'ir', Denmark: 'dk', Poland: 'pl', Serbia: 'rs',
  Cameroon: 'cm', 'Costa Rica': 'cr', Tunisia: 'tn',
  Algeria: 'dz', Nigeria: 'ng', Turkey: 'tr', Hungary: 'hu',
  Scotland: 'gb-sct', Ireland: 'ie', Russia: 'ru', Ukraine: 'ua',
  Mali: 'ml', Zambia: 'zm',
};

function flagUrl(team: string): string {
  const code = teamFlagMap[team] || team.slice(0, 2).toLowerCase();
  return `https://flagsapi.com/${code.toUpperCase()}/flat/48.png`;
}

// ─ Props ────────────────────────────────────────
interface WisdomWheelProps {
  data: GlobalFavorite[];
}

// ─ Skeleton ─────────────────────────────────────
export function WisdomWheelSkeleton() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-[320px] h-[320px] rounded-full bg-zinc-900/40 border border-zinc-800 animate-pulse" />
    </div>
  );
}

// ─ Segment ──────────────────────────────────────
function Segment({
  team,
  probability,
  angle,
}: {
  team: string;
  probability: number;
  angle: number;
}) {
  const RADIUS = 140;
  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{
        transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${RADIUS}px)`,
      }}
    >
      <div className="flex items-center gap-1.5 bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 rounded-full px-2.5 py-1.5 transition-all duration-300 hover:border-cyan-500/60 hover:bg-zinc-800/80 hover:shadow-[0_0_14px_rgba(6,182,212,0.2)] whitespace-nowrap">
        <img
          src={flagUrl(team)}
          alt={team}
          className="w-5 h-4 rounded-sm object-cover shrink-0"
          loading="lazy"
        />
        <span className="text-xs font-semibold text-zinc-200">{team}</span>
        <span className="text-xs font-bold text-cyan-400 tabular-nums">
          {probability}%
        </span>
      </div>
    </div>
  );
}

// ─ Main Component ──────────────────────────────
export default function WisdomWheel({ data }: WisdomWheelProps) {
  if (!data || data.length === 0) return null;

  const items = data.slice(0, 10);
  const ANGLE_STEP = 360 / items.length;

  return (
    <div className="flex items-center justify-center py-8 overflow-hidden">
      <div className="relative w-[340px] h-[340px] group">
        {/* Rotating ring */}
        <div className="absolute inset-0 animate-spin-slow group-hover:[animation-play-state:paused]">
          {/* Decorative outer ring glow */}
          <div className="absolute inset-0 rounded-full border border-cyan-500/10 shadow-[0_0_40px_rgba(6,182,212,0.06)]" />

          {items.map((item, i) => (
            <Segment
              key={item.team}
              team={item.team}
              probability={item.probability}
              angle={ANGLE_STEP * i}
            />
          ))}
        </div>

        {/* Center hub — fixed, non-rotating */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_24px_rgba(6,182,212,0.35)] z-10 flex items-center justify-center">
          <span className="text-white font-black text-sm tracking-tight">
            ⚽
          </span>
        </div>
      </div>
    </div>
  );
}
