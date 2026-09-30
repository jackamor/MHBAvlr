"use client";

import { useState } from "react";
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
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

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
  const hovered = hoverIndex !== null ? history[hoverIndex] : null;
  const prevElo = hoverIndex !== null && hoverIndex > 0 ? history[hoverIndex - 1].elo : null;

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

      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full overflow-visible"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoverIndex(null)}
        >
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
            <g key={h.matchId} onMouseEnter={() => setHoverIndex(i)}>
              {/* Larger invisible hit target so the tooltip is easy to trigger */}
              <circle cx={x(i)} cy={y(h.elo)} r={10} fill="transparent" />
              <circle
                cx={x(i)}
                cy={y(h.elo)}
                r={hoverIndex === i ? 5 : 3}
                fill={h.won ? "#34d399" : "#f87171"}
                stroke={hoverIndex === i ? "#ffffff" : "none"}
                strokeWidth={1.5}
                className="transition-all"
              />
            </g>
          ))}
          <circle cx={x(history.length - 1)} cy={y(lastPoint.elo)} r={5} fill="#38bdf8" />
        </svg>

        {hovered && hoverIndex !== null && (
          <div
            className="pointer-events-none absolute z-10 w-48 -translate-x-1/2 rounded-lg border border-white/10 bg-neutral-900 p-2.5 text-xs shadow-xl"
            style={{
              left: `${(x(hoverIndex) / WIDTH) * 100}%`,
              top: `${(y(hovered.elo) / HEIGHT) * 100}%`,
              transform: y(hovered.elo) < 60 ? "translate(-50%, 12px)" : "translate(-50%, -115%)",
            }}
          >
            <div className="mb-1 flex items-center justify-between">
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-black ${
                  hovered.won ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                }`}
              >
                {hovered.won ? "WIN" : "LOSS"}
              </span>
              <span className="text-[10px] text-neutral-500">
                {new Date(hovered.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </div>
            <div className="font-semibold text-white">vs {hovered.opponent.name}</div>
            <div className="truncate text-[11px] text-neutral-500">{hovered.tournamentName}</div>
            <div className="mt-1.5 flex items-center justify-between border-t border-white/10 pt-1.5">
              <span className="font-mono font-bold text-sky-300">{hovered.elo} Elo</span>
              {prevElo !== null && (
                <span className={`font-mono text-[11px] font-bold ${hovered.elo >= prevElo ? "text-emerald-400" : "text-red-400"}`}>
                  {hovered.elo >= prevElo ? "+" : ""}
                  {hovered.elo - prevElo}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
