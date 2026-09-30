"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TeamLogo from "./TeamLogo";

export interface PastGame {
  id: string;
  tournamentId: string;
  tournamentName: string;
  tournamentLogoUrl?: string | null;
  roundName: string;
  opponent: { id: string; name: string; tag: string; logoUrl?: string | null };
  teamScore: number;
  opponentScore: number;
  won: boolean;
  updatedAt: string;
}

const STYLES = {
  cards: { label: "Cards" },
  compact: { label: "Compact" },
  timeline: { label: "Timeline" },
  grid: { label: "Grid" },
} as const;
type StyleKey = keyof typeof STYLES;

const STORAGE_KEY = "pastGamesStyle";

export default function PastGamesWidget({
  teamTag,
  teamLogoUrl,
  games,
}: {
  teamId: string;
  teamTag: string;
  teamLogoUrl?: string | null;
  games: PastGame[];
}) {
  const [style, setStyle] = useState<StyleKey>("cards");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && saved in STYLES) setStyle(saved as StyleKey);
  }, []);

  function changeStyle(key: StyleKey) {
    setStyle(key);
    window.localStorage.setItem(STORAGE_KEY, key);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1 rounded-full bg-white/5 p-1 text-xs font-bold uppercase tracking-wide w-fit">
        {(Object.entries(STYLES) as [StyleKey, { label: string }][]).map(([key, s]) => (
          <button
            key={key}
            type="button"
            onClick={() => changeStyle(key)}
            className={`rounded-full px-3 py-1 transition ${
              style === key ? "bg-white text-neutral-900" : "text-neutral-400 hover:text-white"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {games.length === 0 ? (
        <p className="text-sm text-neutral-500">No completed matches.</p>
      ) : style === "cards" ? (
        <CardsStyle teamTag={teamTag} teamLogoUrl={teamLogoUrl} games={games} />
      ) : style === "compact" ? (
        <CompactStyle teamTag={teamTag} teamLogoUrl={teamLogoUrl} games={games} />
      ) : style === "timeline" ? (
        <TimelineStyle teamTag={teamTag} teamLogoUrl={teamLogoUrl} games={games} />
      ) : (
        <GridStyle games={games} />
      )}
    </div>
  );
}

function CardsStyle({
  teamTag,
  teamLogoUrl,
  games,
}: {
  teamTag: string;
  teamLogoUrl?: string | null;
  games: PastGame[];
}) {
  return (
    <div className="flex flex-col gap-2">
      {games.map((g) => (
        <Link
          key={g.id}
          href={`/tournaments/${g.tournamentId}`}
          className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-3 transition hover:border-red-500/40 hover:bg-white/[0.06]"
        >
          <div className="hidden w-36 shrink-0 items-center gap-2 sm:flex">
            <TeamLogo logoUrl={g.tournamentLogoUrl} tag={g.tournamentName} size="sm" />
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-neutral-300">{g.tournamentName}</div>
              <div className="truncate text-[11px] text-neutral-500">{g.roundName}</div>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              <span className={`truncate text-sm ${g.won ? "font-bold text-white" : "font-medium text-neutral-300"}`}>
                {teamTag}
              </span>
              <TeamLogo logoUrl={teamLogoUrl} tag={teamTag} size="sm" />
            </div>
            <div className="flex shrink-0 overflow-hidden rounded-md font-mono text-sm font-bold">
              <span className={`px-2.5 py-1 ${g.won ? "bg-emerald-600/80 text-white" : "bg-red-600/40 text-neutral-200"}`}>
                {g.teamScore}
              </span>
              <span className={`px-2.5 py-1 ${!g.won ? "bg-emerald-600/80 text-white" : "bg-red-600/40 text-neutral-200"}`}>
                {g.opponentScore}
              </span>
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <TeamLogo logoUrl={g.opponent.logoUrl} tag={g.opponent.tag} size="sm" />
              <span className={`truncate text-sm ${!g.won ? "font-bold text-white" : "font-medium text-neutral-300"}`}>
                {g.opponent.name}
              </span>
            </div>
          </div>
          <div className="w-16 shrink-0 text-right text-xs text-neutral-500">FINAL</div>
        </Link>
      ))}
    </div>
  );
}

function CompactStyle({
  teamTag,
  teamLogoUrl,
  games,
}: {
  teamTag: string;
  teamLogoUrl?: string | null;
  games: PastGame[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      {games.map((g, i) => (
        <Link
          key={g.id}
          href={`/tournaments/${g.tournamentId}`}
          className={`flex items-center gap-3 px-3 py-2 text-sm transition hover:bg-white/[0.06] ${
            i > 0 ? "border-t border-white/5" : ""
          }`}
        >
          <span className={`w-6 shrink-0 text-center text-xs font-black ${g.won ? "text-emerald-400" : "text-red-400"}`}>
            {g.won ? "W" : "L"}
          </span>
          <TeamLogo logoUrl={teamLogoUrl} tag={teamTag} size="sm" />
          <span className="w-14 shrink-0 text-right font-mono font-bold text-white">
            {g.teamScore}-{g.opponentScore}
          </span>
          <TeamLogo logoUrl={g.opponent.logoUrl} tag={g.opponent.tag} size="sm" />
          <span className="truncate text-neutral-300">{g.opponent.name}</span>
          <span className="ml-auto shrink-0 truncate text-xs text-neutral-500">{g.tournamentName}</span>
        </Link>
      ))}
    </div>
  );
}

function TimelineStyle({
  teamTag,
  teamLogoUrl,
  games,
}: {
  teamTag: string;
  teamLogoUrl?: string | null;
  games: PastGame[];
}) {
  return (
    <div className="relative ml-3 flex flex-col gap-4 border-l-2 border-white/10 pl-6">
      {games.map((g) => (
        <Link key={g.id} href={`/tournaments/${g.tournamentId}`} className="group relative block">
          <span
            className={`absolute -left-[29px] top-1.5 h-3 w-3 rounded-full ring-4 ring-neutral-950 ${
              g.won ? "bg-emerald-400" : "bg-red-400"
            }`}
          />
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 transition group-hover:border-red-500/40 group-hover:bg-white/[0.06]">
            <div className="mb-1 flex items-center justify-between text-[11px] text-neutral-500">
              <span>{g.tournamentName} · {g.roundName}</span>
              <span>{new Date(g.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TeamLogo logoUrl={teamLogoUrl} tag={teamTag} size="sm" />
              <span className={g.won ? "font-bold text-white" : "text-neutral-300"}>{teamTag}</span>
              <span className="font-mono font-bold text-neutral-300">
                {g.teamScore} – {g.opponentScore}
              </span>
              <span className={!g.won ? "font-bold text-white" : "text-neutral-300"}>{g.opponent.tag}</span>
              <TeamLogo logoUrl={g.opponent.logoUrl} tag={g.opponent.tag} size="sm" />
              <span
                className={`ml-auto rounded px-2 py-0.5 text-xs font-black ${
                  g.won ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                }`}
              >
                {g.won ? "WIN" : "LOSS"}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function GridStyle({ games }: { games: PastGame[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
      {games.map((g) => (
        <Link
          key={g.id}
          href={`/tournaments/${g.tournamentId}`}
          className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition hover:brightness-125 ${
            g.won ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/30 bg-red-500/10"
          }`}
        >
          <TeamLogo logoUrl={g.opponent.logoUrl} tag={g.opponent.tag} size="sm" />
          <span className="truncate text-xs font-semibold text-neutral-300">vs {g.opponent.tag}</span>
          <span className={`font-mono text-lg font-black ${g.won ? "text-emerald-400" : "text-red-400"}`}>
            {g.teamScore}-{g.opponentScore}
          </span>
          <span className="truncate text-[10px] text-neutral-500">{g.tournamentName}</span>
        </Link>
      ))}
    </div>
  );
}
