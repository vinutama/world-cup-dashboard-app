import type { GlobalFavorite } from '../types/oracle';

// ─ Team → ISO 3166-1 alpha-3 Code ─────────────
const teamCodeMap: Record<string, string> = {
  Argentina: 'ARG', Australia: 'AUS', Austria: 'AUT', Belgium: 'BEL',
  'Bosnia and Herzegovina': 'BIH', Brazil: 'BRA', Canada: 'CAN',
  'Cabo Verde': 'CPV', Colombia: 'COL', "Côte d'Ivoire": 'CIV',
  Croatia: 'HRV', 'DR Congo': 'COD', Denmark: 'DNK', Ecuador: 'ECU',
  Egypt: 'EGY', England: 'ENG', France: 'FRA', Germany: 'DEU',
  Ghana: 'GHA', Japan: 'JPN', Mexico: 'MEX', Morocco: 'MAR',
  Netherlands: 'NLD', Nigeria: 'NGA', Norway: 'NOR', Paraguay: 'PRY',
  Poland: 'POL', Portugal: 'PRT', Senegal: 'SEN', Serbia: 'SRB',
  'South Africa': 'ZAF', Spain: 'ESP', Sweden: 'SWE', Switzerland: 'CHE',
  USA: 'USA', Wales: 'WAL', Uruguay: 'URY',
  'South Korea': 'KOR', 'Korea Republic': 'KOR', 'Saudi Arabia': 'SAU',
  Iran: 'IRN', Tunisia: 'TUN', Algeria: 'DZA', Nigeria: 'NGA',
  Turkey: 'TUR', Hungary: 'HUN', Cameroon: 'CMR', 'Costa Rica': 'CRI',
  Scotland: 'SCO', Ireland: 'IRL', Russia: 'RUS', Ukraine: 'UKR',
  Mali: 'MLI', Zambia: 'ZMB', 'Czech Republic': 'CZE', Greece: 'GRC',
  Romania: 'ROU', Slovakia: 'SVK', Slovenia: 'SVN', Iceland: 'ISL',
  Bulgaria: 'BGR',
};

function flagUrl(team: string): string {
  const code = teamCodeMap[team] || team.slice(0, 3).toUpperCase();
  return `https://polymarket-upload.s3.us-east-2.amazonaws.com/country-flags/${code.toLowerCase()}.png`;
}

// ─ Props ────────────────────────────────────────
interface WisdomWheelProps {
  data: GlobalFavorite[];
}

// ─ Skeleton ─────────────────────────────────────
export function WisdomWheelSkeleton() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="w-[300px] h-[300px] rounded-full bg-zinc-900/40 border border-zinc-800 animate-pulse" />
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
  const RADIUS = 130;
  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{
        transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${RADIUS}px)`,
      }}
    >
      <div
        className="flex items-center gap-1 transition-all duration-300 hover:scale-110"
        style={{ transform: `rotate(-${angle}deg)` }}
      >
        <img
          src={flagUrl(team)}
          alt={team}
          className="w-7 h-5 rounded-sm object-cover shrink-0 shadow-[0_0_6px_rgba(0,0,0,0.5)]"
          loading="lazy"
        />
        <span className="text-[11px] font-bold text-cyan-300 tabular-nums drop-shadow-[0_0_4px_rgba(6,182,212,0.4)]">
          {probability}
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
      <div className="relative w-[320px] h-[320px] group">
        {/* Rotating ring */}
        <div className="absolute inset-0 animate-spin-slow group-hover:[animation-play-state:paused]">
          {/* Outer ring glow */}
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

        {/* Center hub */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_24px_rgba(6,182,212,0.35)] z-10 flex items-center justify-center">
          <span className="text-white font-black text-xs tracking-tight">
            ⚽
          </span>
        </div>
      </div>
    </div>
  );
}
