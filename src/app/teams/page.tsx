"use client";

import { useEffect, useState } from "react";
import TeamCard from "@/components/TeamCard";
import TeamLogo from "@/components/TeamLogo";

interface Team {
  id: string;
  name: string;
  tag: string;
  region: string;
  logoUrl: string | null;
  pointEntries: { points: number }[];
  championships: { title: string; year: number | null }[];
}

const REGIONS = ["AMERICAS", "EUROPE", "CHINA", "APAC"] as const;

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [regionFilter, setRegionFilter] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", tag: "", region: "AMERICAS", logoUrl: "" });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/teams${regionFilter ? `?region=${regionFilter}` : ""}`);
    setTeams(await res.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionFilter]);

  async function onLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    setUploading(false);
    if (res.ok) {
      const { url } = await res.json();
      setForm((f) => ({ ...f, logoUrl: url }));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      setForm({ name: "", tag: "", region: "AMERICAS", logoUrl: "" });
      setShowForm(false);
      load();
    } else {
      const data = await res.json();
      setError(typeof data.error === "string" ? data.error : "Failed to create team. Check the fields and try again.");
    }
  }

  async function deleteTeam(id: string, name: string) {
    if (!confirm(`Delete ${name}? This also removes their roster spot in any tournaments.`)) return;
    await fetch(`/api/teams/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Teams</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
        >
          {showForm ? "Cancel" : "+ Add Team"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-4">
          <input
            required
            placeholder="Team name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            required
            placeholder="Tag (e.g. SEN)"
            value={form.tag}
            onChange={(e) => setForm({ ...form, tag: e.target.value })}
            className="rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm"
          />
          <select
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
            className="rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm"
          >
            {REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <input
            placeholder="Logo URL (optional)"
            value={form.logoUrl}
            onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
            className="rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm sm:col-span-2"
          />
          <label className="flex items-center gap-2 rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-neutral-300">
            <TeamLogo logoUrl={form.logoUrl} tag={form.tag || "?"} size="sm" />
            <span>{uploading ? "Uploading…" : "Upload logo"}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
              className="hidden"
              onChange={onLogoFileChange}
            />
          </label>
          {error && <p className="text-sm text-red-400 sm:col-span-4">{error}</p>}
          <button
            disabled={loading}
            className="rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
          >
            {loading ? "Saving…" : "Create team"}
          </button>
        </form>
      )}

      <div className="flex gap-2">
        <FilterButton active={regionFilter === ""} onClick={() => setRegionFilter("")}>All</FilterButton>
        {REGIONS.map((r) => (
          <FilterButton key={r} active={regionFilter === r} onClick={() => setRegionFilter(r)}>
            {r}
          </FilterButton>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => (
          <div key={t.id} className="group relative">
            <TeamCard
              id={t.id}
              name={t.name}
              tag={t.tag}
              region={t.region}
              logoUrl={t.logoUrl}
              championships={t.championships}
              points={t.pointEntries.reduce((s, p) => s + p.points, 0)}
            />
            <button
              onClick={(e) => {
                e.preventDefault();
                deleteTeam(t.id, t.name);
              }}
              title="Delete team"
              className="absolute right-2 top-2 hidden rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-red-300 opacity-0 backdrop-blur transition hover:bg-red-600 hover:text-white group-hover:block group-hover:opacity-100"
            >
              Delete
            </button>
          </div>
        ))}
        {teams.length === 0 && <p className="text-sm text-neutral-500">No teams yet.</p>}
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
        active ? "bg-red-600 text-white" : "bg-white/5 text-neutral-300 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}
