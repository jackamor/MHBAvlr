"use client";

import { useState } from "react";
import Link from "next/link";
import TeamLogo from "./TeamLogo";
import RegionBadge from "./RegionBadge";

interface TeamOption {
  id: string;
  name: string;
  tag: string;
  region: string;
  logoUrl?: string | null;
}

interface HistoryEntry {
  id: string;
  tournamentId: string;
  tournamentName: string;
  roundName: string;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null;
  updatedAt: string;
}

interface CompareResult {
  teamA: TeamOption;
  teamB: TeamOption;
  winsA: number;
  winsB: number;
  history: HistoryEntry[];
}

export default function HeadToHeadCompare({ teams }: { teams: TeamOption[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setResult(null);
    setError(null);
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  async function compare() {
    if (selected.length !== 2) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/head-to-head?teamAId=${selected[0]}&teamBId=${selected[1]}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to compare teams");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to compare teams");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-neutral-400">
            <tr>
              <th className="w-10 px-3 py-2"></th>
              <th className="px-3 py-2">Team</th>
              <th className="px-3 py-2">Region</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => {
              const checked = selected.includes(t.id);
              return (
                <tr
                  key={t.id}
                  onClick={() => toggle(t.id)}
                  className={`cursor-pointer border-t border-white/5 transition ${
                    checked ? "bg-red-600/10" : "hover:bg-white/[0.04]"
                  }`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      readOnly
                      checked={checked}
                      className="h-4 w-4 accent-red-500"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 font-semibold text-white">
                      <TeamLogo logoUrl={t.logoUrl} tag={t.tag} size="sm" />
                      {t.name}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <RegionBadge region={t.region} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={compare}
          disabled={selected.length !== 2 || loading}
          className="rounded-md bg-gradient-to-r from-red-600 to-red-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-900/40 transition hover:from-red-500 hover:to-red-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Comparing..." : "Compare"}
        </button>
        <span className="text-xs text-neutral-500">
          {selected.length === 0 && "Select two teams to compare"}
          {selected.length === 1 && "Select one more team"}
          {selected.length === 2 && "Ready to compare"}
        </span>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {result && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center justify-center gap-6">
            <TeamSummary team={result.teamA} wins={result.winsA} highlight={result.winsA > result.winsB} />
            <div className="text-2xl font-black text-neutral-500">VS</div>
            <TeamSummary team={result.teamB} wins={result.winsB} highlight={result.winsB > result.winsA} />
          </div>

          <div className="mt-6">
            <h3 className="mb-2 text-sm font-bold text-white">Match History</h3>
            {result.history.length === 0 && (
              <p className="text-sm text-neutral-500">These teams haven&apos;t played each other yet.</p>
            )}
            <div className="flex flex-col gap-2">
              {result.history.map((m) => (
                <Link
                  key={m.id}
                  href={`/tournaments/${m.tournamentId}`}
                  className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-sm hover:bg-white/[0.06]"
                >
                  <div className="text-neutral-400">
                    {m.tournamentName} <span className="text-neutral-600">·</span> {m.roundName}
                  </div>
                  <div className="font-bold text-white">
                    <span className={m.winnerId === result.teamA.id ? "text-green-400" : ""}>{m.scoreA ?? "-"}</span>
                    {" : "}
                    <span className={m.winnerId === result.teamB.id ? "text-green-400" : ""}>{m.scoreB ?? "-"}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamSummary({ team, wins, highlight }: { team: TeamOption; wins: number; highlight: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <TeamLogo logoUrl={team.logoUrl} tag={team.tag} size="lg" />
      <div className="font-semibold text-white">{team.name}</div>
      <div className={`text-2xl font-black ${highlight ? "text-red-400" : "text-neutral-300"}`}>{wins}</div>
      <div className="text-xs text-neutral-500">wins</div>
    </div>
  );
}
