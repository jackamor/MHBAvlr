"use client";

import { useEffect, useState } from "react";

interface Team {
  id: string;
  name: string;
  tag: string;
}
interface Tournament {
  id: string;
  name: string;
}
interface PointEntry {
  id: string;
  points: number;
  placement: string;
  note: string | null;
  team: Team;
  tournament: Tournament | null;
  createdAt: string;
}
interface Championship {
  id: string;
  title:
    | "WORLDS"
    | "MSI"
    | "MHBA"
    | "APAC_CHAMPION"
    | "AMERICAS_CHAMPION"
    | "CHINA_CHAMPION"
    | "EUROPE_CHAMPION"
    | "POINTS_CHAMPION";
  year: number | null;
  team: Team;
}

const TITLE_LABELS: Record<string, string> = {
  WORLDS: "🏆 World Champion",
  MSI: "⭐ MSI Champion",
  MHBA: "⭐ MHBA Champion",
  APAC_CHAMPION: "🌏 APAC Champion",
  AMERICAS_CHAMPION: "🌎 Americas Champion",
  CHINA_CHAMPION: "🐉 China Champion",
  EUROPE_CHAMPION: "🌍 Europe Champion",
  POINTS_CHAMPION: "💠 Points Champion",
};

export default function AdminPointsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [entries, setEntries] = useState<PointEntry[]>([]);
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [form, setForm] = useState({ teamIds: [] as string[], tournamentId: "", points: 100, placement: "1st Place", note: "" });
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [championshipForm, setChampionshipForm] = useState({ teamId: "", title: "WORLDS", year: new Date().getFullYear() });
  const [awarding, setAwarding] = useState(false);

  async function load() {
    const [teamsRes, tournamentsRes, entriesRes, championshipsRes] = await Promise.all([
      fetch("/api/teams"),
      fetch("/api/tournaments"),
      fetch("/api/points"),
      fetch("/api/championships"),
    ]);
    setTeams(await teamsRes.json());
    setTournaments(await tournamentsRes.json());
    setEntries(await entriesRes.json());
    setChampionships(await championshipsRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      setForm({ ...form, teamIds: [], points: 0, note: "" });
      load();
    }
  }

  async function deleteEntry(id: string) {
    if (!confirm("Delete this point entry?")) return;
    await fetch(`/api/points/${id}`, { method: "DELETE" });
    load();
  }

  async function clearAllPoints() {
    if (!confirm("Clear ALL point entries for every team? This cannot be undone.")) return;
    setClearing(true);
    await fetch("/api/points", { method: "DELETE" });
    setClearing(false);
    load();
  }

  async function awardChampionship(e: React.FormEvent) {
    e.preventDefault();
    setAwarding(true);
    const res = await fetch("/api/championships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(championshipForm),
    });
    setAwarding(false);
    if (res.ok) {
      setChampionshipForm({ ...championshipForm, teamId: "" });
      load();
    }
  }

  async function deleteChampionship(id: string) {
    if (!confirm("Remove this championship star?")) return;
    await fetch(`/api/championships/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Points Management</h1>

      <form onSubmit={submit} className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-6 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-neutral-300">
            Teams {form.teamIds.length > 0 && `(${form.teamIds.length} selected)`}
          </span>
          <TeamChecklist teams={teams} selectedIds={form.teamIds} onChange={(ids) => setForm({ ...form, teamIds: ids })} />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-300">Tournament (optional)</span>
          <select
            value={form.tournamentId}
            onChange={(e) => setForm({ ...form, tournamentId: e.target.value })}
            className="w-full rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm"
          >
            <option value="">None</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-300">Placement</span>
          <input
            required
            value={form.placement}
            onChange={(e) => setForm({ ...form, placement: e.target.value })}
            className="w-full rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-300">Points (use negative to deduct)</span>
          <input
            type="number"
            required
            value={form.points}
            onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
            className="w-full rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-neutral-300">Note (optional)</span>
          <input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="w-full rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm"
          />
        </label>

        <button
          disabled={loading || form.teamIds.length === 0}
          className="sm:col-span-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-red-500"
        >
          {loading ? "Adding…" : `Add / Adjust Points${form.teamIds.length > 1 ? ` (${form.teamIds.length} teams)` : ""}`}
        </button>
      </form>

      <section>
        <h2 className="mb-3 text-lg font-bold text-white">Championship Stars</h2>
        <form onSubmit={awardChampionship} className="mb-4 grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-6 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-300">Team</span>
            <select
              required
              value={championshipForm.teamId}
              onChange={(e) => setChampionshipForm({ ...championshipForm, teamId: e.target.value })}
              className="w-full rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm"
            >
              <option value="">Select a team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.tag})</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-300">Title</span>
            <select
              value={championshipForm.title}
              onChange={(e) => setChampionshipForm({ ...championshipForm, title: e.target.value })}
              className="w-full rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm"
            >
              <option value="WORLDS">🏆 World Champion</option>
              <option value="MSI">⭐ MSI Champion</option>
              <option value="MHBA">⭐ MHBA Champion</option>
              <option value="APAC_CHAMPION">🌏 APAC Champion</option>
              <option value="AMERICAS_CHAMPION">🌎 Americas Champion</option>
              <option value="CHINA_CHAMPION">🐉 China Champion</option>
              <option value="EUROPE_CHAMPION">🌍 Europe Champion</option>
              <option value="POINTS_CHAMPION">💠 Points Champion</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-300">Year (optional)</span>
            <input
              type="number"
              value={championshipForm.year}
              onChange={(e) => setChampionshipForm({ ...championshipForm, year: Number(e.target.value) })}
              className="w-full rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm"
            />
          </label>
          <button
            disabled={awarding || !championshipForm.teamId}
            className="sm:col-span-3 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-amber-500"
          >
            {awarding ? "Awarding…" : "Award Star"}
          </button>
        </form>

        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-neutral-400">
              <tr>
                <th className="px-3 py-2">Team</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Year</th>
                <th className="px-3 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {championships.map((c) => (
                <tr key={c.id} className="border-t border-white/5">
                  <td className="px-3 py-2 text-white">{c.team.name}</td>
                  <td className="px-3 py-2 text-amber-400">{TITLE_LABELS[c.title]}</td>
                  <td className="px-3 py-2 text-neutral-400">{c.year ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => deleteChampionship(c.id)}
                      className="rounded-md px-2 py-1 text-xs font-semibold text-neutral-500 hover:bg-red-600/20 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {championships.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-neutral-500">No championships awarded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Recent Entries</h2>
          <button
            onClick={clearAllPoints}
            disabled={clearing || entries.length === 0}
            className="rounded-md border border-red-500/30 bg-red-600/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-600 hover:text-white disabled:opacity-40"
          >
            {clearing ? "Clearing…" : "Clear All Points"}
          </button>
        </div>
        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-neutral-400">
              <tr>
                <th className="px-3 py-2">Team</th>
                <th className="px-3 py-2">Tournament</th>
                <th className="px-3 py-2">Placement</th>
                <th className="px-3 py-2 text-right">Points</th>
                <th className="px-3 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-white/5">
                  <td className="px-3 py-2 text-white">{e.team.name}</td>
                  <td className="px-3 py-2 text-neutral-400">{e.tournament?.name ?? "—"}</td>
                  <td className="px-3 py-2 text-neutral-400">{e.placement}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${e.points < 0 ? "text-red-400" : "text-white"}`}>
                    {e.points >= 0 ? "+" : ""}{e.points}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => deleteEntry(e.id)}
                      className="rounded-md px-2 py-1 text-xs font-semibold text-neutral-500 hover:bg-red-600/20 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function TeamChecklist({
  teams,
  selectedIds,
  onChange,
}: {
  teams: Team[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = teams.filter((t) => `${t.name} ${t.tag}`.toLowerCase().includes(search.toLowerCase()));

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id]);
  }

  return (
    <div className="overflow-hidden rounded-md border border-white/10 bg-neutral-900">
      <div className="flex items-center gap-2 border-b border-white/10 p-2">
        <input
          placeholder="Search teams…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md bg-transparent px-2 py-1 text-sm outline-none placeholder:text-neutral-500"
        />
        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-neutral-400 hover:bg-white/5 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>
      <div className="grid max-h-56 grid-cols-2 gap-x-2 overflow-y-auto p-2 sm:grid-cols-3">
        {filtered.map((t) => (
          <label
            key={t.id}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/5"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(t.id)}
              onChange={() => toggle(t.id)}
              className="accent-red-600"
            />
            <span className="truncate text-neutral-200">{t.name} ({t.tag})</span>
          </label>
        ))}
        {filtered.length === 0 && <p className="col-span-full py-3 text-center text-sm text-neutral-500">No teams found.</p>}
      </div>
    </div>
  );
}
