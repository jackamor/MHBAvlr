import type { EloHistoryPoint } from "@/lib/elo";

const WIDTH = 720;
const HEIGHT = 200;
const PAD_X = 12;
const PAD_Y = 20;

export default function EloChart({
  history,
  peak,
  current,
}: {
  history: EloHistoryPoint[];
  peak: number;
  current: number;
}) {
  if (history.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-neutral-500">
        Not enough completed matches yet to chart Elo history.
      </div>
    );
  }

  const elos = history.map((h) => h.elo);
  const min = Math.min(...elos, current);
  const max = Math.max(...elos, current, peak);
  const range = Math.max(max - min, 1);

  const x = (i: number) =>
    history.length === 1
      ? WIDTH / 2
      : PAD_X + (i / (history.length - 1)) * (WIDTH - PAD_X * 2);
  const y = (elo: number) =>
    HEIGHT - PAD_Y - ((elo - min) / range) * (HEIGHT - PAD_Y * 2);

  const points = history.map((h, i) => `${x(i)},${y(h.elo)}`).join(" ");
  const peakY = y(peak);
  const lastPoint = history[history.length - 1];

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center gap-6">
        <div>
          <div className="text-2xl font-black text-white">{current}</div>
          <div className="text-xs text-neutral-500">Current Elo</div>
        </div>
        <div>
          <div className="text-2xl font-black text-emerald-400">{peak}</div>
          <div className="text-xs text-neutral-500">Peak Elo</div>
        </div>
        <div className="ml-auto text-xs text-neutral-500">
          Last {history.length} game{history.length === 1 ? "" : "s"}
        </div>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" preserveAspectRatio="none">
        <line
          x1={PAD_X}
          x2={WIDTH - PAD_X}
          y1={peakY}
          y2={peakY}
          stroke="#34d399"
          strokeDasharray="4 4"
          strokeWidth={1}
        />
        <polyline points={points} fill="none" stroke="#38bdf8" strokeWidth={2} />
        {history.map((h, i) => (
          <circle
            key={h.matchId}
            cx={x(i)}
            cy={y(h.elo)}
            r={3}
            fill={h.won ? "#34d399" : "#f87171"}
          >
            <title>
              {h.won ? "W" : "L"} vs {h.opponent.tag} · {h.tournamentName} · {h.elo} Elo
            </title>
          </circle>
        ))}
        <circle cx={x(history.length - 1)} cy={y(lastPoint.elo)} r={5} fill="#38bdf8" />
      </svg>
    </div>
  );
}
