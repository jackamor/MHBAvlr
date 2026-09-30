"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import TeamLogo from "@/components/TeamLogo";

const TYPES = [
  { value: "SINGLE_ELIMINATION", label: "Single Elimination" },
  { value: "DOUBLE_ELIMINATION", label: "Double Elimination" },
  { value: "TRIPLE_ELIMINATION", label: "Triple Elimination" },
  { value: "ROUND_ROBIN", label: "Round Robin" },
  { value: "REGIONAL", label: "Regional (Groups + Playoffs, VCT-style)" },
];

const PLAYOFF_FORMATS = [
  { value: "SINGLE_ELIMINATION", label: "Single Elimination" },
  { value: "DOUBLE_ELIMINATION", label: "Double Elimination" },
  { value: "TRIPLE_ELIMINATION", label: "Triple Elimination" },
];

const SELECTION_MODES = [
  { value: "ALL", label: "All teams" },
  { value: "REGION", label: "One region" },
  { value: "TOP16_GLOBAL", label: "Top 16 global (by points)" },
  { value: "TOP4_PER_REGION", label: "Top 4 from each region (by points)" },
  { value: "MANUAL", label: "Manually pick teams" },
];

const REGIONS = ["AMERICAS", "EUROPE", "CHINA", "APAC"];

interface Team {
  id: string;
  name: string;
  tag: string;
  region: string;
  logoUrl: string | null;
}

export default function NewTournamentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState("SINGLE_ELIMINATION");
  const [bestOf, setBestOf] = useState(3);
  const [selectionMode, setSelectionMode] = useState("ALL");
  const [selectionRegion, setSelectionRegion] = useState("AMERICAS");
  const [roundRobinGamesPerTeam, setRoundRobinGamesPerTeam] = useState(3);
  const [groupCount, setGroupCount] = useState(2);
  const [groupBestOf, setGroupBestOf] = useState(1);
  const [advanceCount, setAdvanceCount] = useState(4);
  const [playoffBestOf, setPlayoffBestOf] = useState(3);
  const [advantageCount, setAdvantageCount] = useState(2);
  const [playoffFormat, setPlayoffFormat] = useState("DOUBLE_ELIMINATION");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [manualTeamIds, setManualTeamIds] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => r.json())
      .then(setAllTeams);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const teamSelection =
      selectionMode === "REGION"
        ? { mode: "REGION", region: selectionRegion }
        : selectionMode === "MANUAL"
        ? { mode: "MANUAL", teamIds: manualTeamIds }
        : { mode: selectionMode };

    const body: Record<string, unknown> = { name, type, bestOf, teamSelection };
    if (type === "ROUND_ROBIN") body.gamesPerTeam = roundRobinGamesPerTeam;
    if (type === "REGIONAL") {
      body.groupCount = groupCount;
      body.groupBestOf = groupBestOf;
      body.advanceCount = advanceCount;
      body.playoffBestOf = playoffBestOf;
      body.advantageCount = advantageCount;
      body.playoffFormat = playoffFormat;
    }

    const res = await fetch("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      router.push(`/tournaments/${data.id}`);
    } else {
      const data = await res.json();
      setError(JSON.stringify(data.error));
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Create Tournament</h1>
      <form onSubmit={submit} className="space-y-5 rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <Field label="Tournament name">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Series type">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>

        {type !== "REGIONAL" && (
          <Field label="Best of (games per match)">
            <input
              type="number"
              min={1}
              max={7}
              value={bestOf}
              onChange={(e) => setBestOf(Number(e.target.value))}
              className="w-full rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm"
            />
          </Field>
        )}

        {type === "ROUND_ROBIN" && (
          <Field label="Games per team">
            <input
              type="number"
              min={1}
              max={30}
              value={roundRobinGamesPerTeam}
              onChange={(e) => setRoundRobinGamesPerTeam(Number(e.target.value))}
              className="w-full rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Each team plays this many games against randomly matched opponents — not necessarily every other team.
            </p>
          </Field>
        )}

        {type === "REGIONAL" && (
          <>
            <Field label="Number of groups">
              <input
                type="number"
                min={1}
                max={8}
                value={groupCount}
                onChange={(e) => setGroupCount(Number(e.target.value))}
                className="w-full rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Group stage best of">
              <input
                type="number"
                min={1}
                max={7}
                value={groupBestOf}
                onChange={(e) => setGroupBestOf(Number(e.target.value))}
                className="w-full rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Teams advancing per group to playoffs">
              <input
                type="number"
                min={1}
                max={8}
                value={advanceCount}
                onChange={(e) => setAdvanceCount(Number(e.target.value))}
                className="w-full rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Playoff best of">
              <input
                type="number"
                min={1}
                max={7}
                value={playoffBestOf}
                onChange={(e) => setPlayoffBestOf(Number(e.target.value))}
                className="w-full rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Playoff bracket format">
              <select
                value={playoffFormat}
                onChange={(e) => setPlayoffFormat(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm"
              >
                {PLAYOFF_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Top seeds that get a 1-game head start in playoffs">
              <input
                type="number"
                min={0}
                max={8}
                value={advantageCount}
                onChange={(e) => setAdvantageCount(Number(e.target.value))}
                className="w-full rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-neutral-500">
                After the group stage completes, use &quot;Generate Playoffs&quot; on the tournament page.
              </p>
            </Field>
          </>
        )}

        <Field label="Team selection">
          <select
            value={selectionMode}
            onChange={(e) => setSelectionMode(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm"
          >
            {SELECTION_MODES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </Field>

        {selectionMode === "REGION" && (
          <Field label="Region">
            <select
              value={selectionRegion}
              onChange={(e) => setSelectionRegion(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>
        )}

        {selectionMode === "MANUAL" && (
          <Field label="Teams">
            <TeamMultiSelect teams={allTeams} selectedIds={manualTeamIds} onChange={setManualTeamIds} />
          </Field>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          disabled={loading || (selectionMode === "MANUAL" && manualTeamIds.length < 2)}
          className="w-full rounded-md bg-gradient-to-r from-red-600 to-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition hover:from-red-500 hover:to-red-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Creating…" : "Create Tournament"}
        </button>
      </form>
    </div>
  );
}

function TeamMultiSelect({
  teams,
  selectedIds,
  onChange,
}: {
  teams: Team[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = teams.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
  const grouped = REGIONS.map((region) => ({
    region,
    teams: filtered.filter((t) => t.region === region),
  })).filter((g) => g.teams.length > 0);

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id]);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-left text-sm text-white transition hover:border-white/20"
      >
        <span>{selectedIds.length === 0 ? "Select teams…" : `${selectedIds.length} team${selectedIds.length === 1 ? "" : "s"} selected`}</span>
        <span className={`text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-white/10 bg-neutral-900 shadow-xl shadow-black/50">
          <input
            autoFocus
            placeholder="Search teams…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border-b border-white/10 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-neutral-500"
          />
          <div className="max-h-64 overflow-y-auto p-1">
            {grouped.map((g) => (
              <div key={g.region}>
                <div className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-neutral-500">{g.region}</div>
                {g.teams.map((t) => (
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
                    <TeamLogo logoUrl={t.logoUrl} tag={t.tag} size="sm" />
                    <span className="truncate text-neutral-200">{t.name}</span>
                  </label>
                ))}
              </div>
            ))}
            {grouped.length === 0 && <p className="px-2 py-3 text-center text-sm text-neutral-500">No teams found.</p>}
          </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {teams
            .filter((t) => selectedIds.includes(t.id))
            .map((t) => (
              <span
                key={t.id}
                className="flex items-center gap-1 rounded-full bg-red-600/15 py-1 pl-2 pr-1 text-xs text-red-200"
              >
                {t.tag}
                <button type="button" onClick={() => toggle(t.id)} className="rounded-full px-1 hover:bg-red-600/30">
                  ×
                </button>
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-300">{label}</span>
      {children}
    </label>
  );
}
