"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import TeamLogo from "./TeamLogo";

const TITLE_META: Record<string, { icon: string; label: string }> = {
  WORLDS: { icon: "🏆", label: "Worlds" },
  MSI: { icon: "⭐", label: "MSI" },
  MASTERS: { icon: "🌟", label: "Masters" },
  MHBA: { icon: "⭐", label: "MHBA" },
};

interface TournamentOption {
  id: string;
  name: string;
}

interface TeamOption {
  id: string;
  name: string;
  tag: string;
  logoUrl?: string | null;
}

interface SeasonEvent {
  id: string;
  title: "WORLDS" | "MSI" | "MASTERS" | "MHBA";
  tournamentId: string | null;
  tournament: TournamentOption | null;
  championTeamId: string | null;
  championTeam: TeamOption | null;
}

interface Season {
  id: string;
  label: string;
  events: SeasonEvent[];
}

export default function AchievementsManager({
  seasons,
  tournaments,
  teams,
}: {
  seasons: Season[];
  tournaments: TournamentOption[];
  teams: TeamOption[];
}) {
  const router = useRouter();
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createSeason() {
    if (!newLabel.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ? "Failed to create season" : "Failed to create season");
      setNewLabel("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create season");
    } finally {
      setCreating(false);
    }
  }

  async function deleteSeason(id: string) {
    if (!confirm("Delete this season and its achievements?")) return;
    await fetch(`/api/seasons/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Season label (e.g. 2026)"
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        <button
          onClick={createSeason}
          disabled={creating || !newLabel.trim()}
          className="rounded-md bg-gradient-to-r from-red-600 to-red-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-900/40 transition hover:from-red-500 hover:to-red-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {creating ? "Adding..." : "Add Season"}
        </button>
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>

      {seasons.length === 0 && (
        <p className="text-sm text-neutral-500">No seasons yet. Add one above to get started.</p>
      )}

      <div className="space-y-4">
        {seasons.map((season) => (
          <SeasonCard
            key={season.id}
            season={season}
            tournaments={tournaments}
            teams={teams}
            onDelete={() => deleteSeason(season.id)}
          />
        ))}
      </div>
    </div>
  );
}

function SeasonCard({
  season,
  tournaments,
  teams,
  onDelete,
}: {
  season: Season;
  tournaments: TournamentOption[];
  teams: TeamOption[];
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">{season.label}</h2>
        <button
          onClick={onDelete}
          className="rounded-md border border-red-500/30 px-3 py-1 text-xs font-semibold text-red-400 transition hover:bg-red-500/10"
        >
          Delete Season
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(["WORLDS", "MSI", "MASTERS", "MHBA"] as const).map((title) => {
          const event = season.events.find((e) => e.title === title);
          return (
            <EventEditor
              key={title}
              seasonId={season.id}
              title={title}
              event={event}
              tournaments={tournaments}
              teams={teams}
            />
          );
        })}
      </div>
    </div>
  );
}

function EventEditor({
  seasonId,
  title,
  event,
  tournaments,
  teams,
}: {
  seasonId: string;
  title: "WORLDS" | "MSI" | "MASTERS" | "MHBA";
  event: SeasonEvent | undefined;
  tournaments: TournamentOption[];
  teams: TeamOption[];
}) {
  const router = useRouter();
  const meta = TITLE_META[title];
  const [tournamentId, setTournamentId] = useState(event?.tournamentId ?? "");
  const [championTeamId, setChampionTeamId] = useState(event?.championTeamId ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/seasons/${seasonId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          tournamentId: tournamentId || null,
          championTeamId: championTeamId || null,
        }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const championTeam = teams.find((t) => t.id === championTeamId);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
        <span>{meta.icon}</span>
        {meta.label}
      </div>

      <label className="mb-1 block text-xs text-neutral-400">Tournament</label>
      <select
        value={tournamentId}
        onChange={(e) => setTournamentId(e.target.value)}
        className="mb-3 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
      >
        <option value="">— None —</option>
        {tournaments.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      <label className="mb-1 block text-xs text-neutral-400">Champion</label>
      <select
        value={championTeamId}
        onChange={(e) => setChampionTeamId(e.target.value)}
        className="mb-3 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
      >
        <option value="">— None —</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      <button
        onClick={save}
        disabled={saving}
        className="mb-3 w-full rounded-md bg-gradient-to-r from-red-600 to-red-500 px-3 py-1.5 text-sm font-semibold text-white shadow-lg shadow-red-900/40 transition hover:from-red-500 hover:to-red-400 disabled:opacity-40"
      >
        {saving ? "Saving..." : "Save"}
      </button>

      {(event?.tournament || championTeam) && (
        <div className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm">
          {event?.tournament ? (
            <Link href={`/tournaments/${event.tournament.id}`} className="text-neutral-300 hover:text-red-400">
              {event.tournament.name}
            </Link>
          ) : (
            <span className="text-neutral-500">No tournament linked</span>
          )}
          {championTeam && (
            <Link href={`/teams/${championTeam.id}`} className="flex items-center gap-1.5 font-semibold text-white hover:text-red-400">
              <TeamLogo logoUrl={championTeam.logoUrl} tag={championTeam.tag} size="sm" />
              {championTeam.name}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
