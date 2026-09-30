"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import TeamLogo from "@/components/TeamLogo";
import TournamentLogoEditor from "@/components/TournamentLogoEditor";
import ChampionshipStars from "@/components/ChampionshipStars";

interface TeamRef {
  id: string;
  name: string;
  tag: string;
  logoUrl?: string | null;
  championships?: { title: string; year: number | null }[];
}

/** Titles worth calling out inline in the bracket (keeps match rows uncluttered). */
const BRACKET_TITLES = new Set(["WORLDS", "POINTS_CHAMPION"]);

interface MatchData {
  id: string;
  section: string;
  roundName: string;
  matchIndex: number;
  bestOf: number;
  groupName?: string | null;
  teamA?: TeamRef | null;
  teamB?: TeamRef | null;
  teamAScore: number;
  teamBScore: number;
  teamAAdvantage: number;
  teamBAdvantage: number;
  winnerId?: string | null;
  status: string;
}

interface TournamentData {
  id: string;
  name: string;
  type: string;
  status: string;
  logoUrl: string | null;
  advanceCount: number | null;
  matches: MatchData[];
  teams: { team: TeamRef; seed: number | null }[];
}

const BRACKET_THEMES = {
  default: { label: "Default (Red)", bar: "bg-red-600/20", barMuted: "bg-red-600/10", text: "text-red-400", connector: "border-red-500/30" },
  championship: { label: "Championship (Gold)", bar: "bg-amber-500/25", barMuted: "bg-amber-500/10", text: "text-amber-400", connector: "border-amber-400/40" },
  masters: { label: "Masters (Purple)", bar: "bg-violet-600/25", barMuted: "bg-violet-600/10", text: "text-violet-300", connector: "border-violet-400/40" },
} as const;
type BracketThemeKey = keyof typeof BRACKET_THEMES;

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<TournamentData | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [themeKey, setThemeKey] = useState<BracketThemeKey>("default");

  useEffect(() => {
    const saved = window.localStorage.getItem("bracketTheme");
    if (saved && saved in BRACKET_THEMES) setThemeKey(saved as BracketThemeKey);
  }, []);

  function changeTheme(key: BracketThemeKey) {
    setThemeKey(key);
    window.localStorage.setItem("bracketTheme", key);
  }

  const load = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${id}`);
    if (res.ok) setData(await res.json());
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) return <p className="text-neutral-500">Loading…</p>;

  const groupMatches = data.matches.filter((m) => m.section === "GROUP");
  const bracketMatches = data.matches.filter((m) => m.section !== "GROUP");

  const groupNames = Array.from(new Set(groupMatches.map((m) => m.groupName ?? "Group")));
  const groupsComplete =
    groupMatches.length > 0 && groupMatches.every((m) => m.status === "COMPLETED");
  const playoffsGenerated = bracketMatches.length > 0;

  async function generatePlayoffs() {
    setAdvancing(true);
    setAdvanceError(null);
    const res = await fetch(`/api/tournaments/${id}/advance`, { method: "POST" });
    setAdvancing(false);
    if (res.ok) load();
    else {
      const d = await res.json();
      setAdvanceError(d.error ?? "Failed to generate playoffs");
    }
  }

  async function deleteTournament() {
    if (!confirm(`Delete "${data!.name}"? This removes all its matches and cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/tournaments/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/tournaments");
    } else {
      setDeleting(false);
    }
  }

  async function removeMatch(matchId: string) {
    await fetch(`/api/matches/${matchId}`, { method: "DELETE" });
    load();
  }

  const bracketRounds = groupIntoRounds(bracketMatches);
  const upperRounds = bracketRounds.filter((r) => r.section === "UPPER");
  const middleRounds = bracketRounds.filter((r) => r.section === "MIDDLE");
  const lowerRounds = bracketRounds.filter((r) => r.section === "LOWER");
  const playoffRounds = bracketRounds.filter((r) => r.section === "PLAYOFF");
  const grandFinal = bracketRounds.find((r) => r.section === "GRAND_FINAL");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <TournamentLogoEditor tournamentId={data.id} name={data.name} logoUrl={data.logoUrl} onSaved={load} />
          <div>
            <h1 className="text-2xl font-bold text-white">{data.name}</h1>
            <p className="text-sm text-neutral-400">{data.type.replaceAll("_", " ")} · {data.status}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-2">
            {data.teams.map((t) => (
              <Link
                key={t.team.id}
                href={`/teams/${t.team.id}`}
                className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs text-neutral-300 hover:bg-white/10"
              >
                <TeamLogo logoUrl={t.team.logoUrl} tag={t.team.tag} size="sm" />
                {t.seed ? `#${t.seed} ` : ""}{t.team.tag}
              </Link>
            ))}
          </div>
          <button
            onClick={deleteTournament}
            disabled={deleting}
            className="rounded-md border border-red-500/30 bg-red-600/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-600 hover:text-white disabled:opacity-40"
          >
            {deleting ? "Deleting…" : "Delete Tournament"}
          </button>
        </div>
      </div>

      {groupNames.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-lg font-bold text-white">
            {data.type === "ROUND_ROBIN" ? "Round Robin" : "Group Stage"}
          </h2>
          {groupNames.map((g) => (
            <GroupTable
              key={g}
              groupName={g}
              matches={groupMatches.filter((m) => (m.groupName ?? "Group") === g)}
              advanceCount={data.advanceCount}
              onSave={load}
              onRemove={removeMatch}
            />
          ))}
          {data.type === "REGIONAL" && !playoffsGenerated && (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <button
                disabled={!groupsComplete || advancing}
                onClick={generatePlayoffs}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-red-500"
              >
                {advancing ? "Generating…" : "Generate Playoff Bracket"}
              </button>
              {!groupsComplete && (
                <p className="mt-2 text-xs text-neutral-500">Complete all group matches to unlock playoffs.</p>
              )}
              {advanceError && <p className="mt-2 text-xs text-red-400">{advanceError}</p>}
            </div>
          )}
        </section>
      )}

      {bracketMatches.length > 0 && (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white">Bracket</h2>
            <label className="flex items-center gap-2 text-xs text-neutral-400">
              Theme
              <select
                value={themeKey}
                onChange={(e) => changeTheme(e.target.value as BracketThemeKey)}
                className="rounded-md border border-white/10 bg-neutral-900 px-2 py-1 text-xs text-neutral-200"
              >
                {Object.entries(BRACKET_THEMES).map(([key, t]) => (
                  <option key={key} value={key}>{t.label}</option>
                ))}
              </select>
            </label>
          </div>
          {playoffRounds.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-gradient-to-b from-neutral-900 to-neutral-950 p-6">
              <BracketChain
                rounds={playoffRounds}
                onSave={load}
                onRemove={removeMatch}
                finalBadge="champion"
                connectorClass={BRACKET_THEMES[themeKey].connector}
              />
            </div>
          )}
          {(upperRounds.length > 0 || middleRounds.length > 0 || lowerRounds.length > 0) && (
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-gradient-to-b from-neutral-900 to-neutral-950 p-6">
              <div className="flex flex-col gap-8">
                {upperRounds.length > 0 && (
                  <BracketSideLabel label="Upper Bracket" barClass={BRACKET_THEMES[themeKey].bar} textClass={BRACKET_THEMES[themeKey].text}>
                    <BracketChain
                      rounds={grandFinal ? [...upperRounds, grandFinal] : upperRounds}
                      onSave={load}
                      onRemove={removeMatch}
                      finalBadge={grandFinal ? "champion" : "qualified"}
                      qualifiedAtRoundIndex={grandFinal ? upperRounds.length - 1 : undefined}
                      connectorClass={BRACKET_THEMES[themeKey].connector}
                    />
                  </BracketSideLabel>
                )}
                {middleRounds.length > 0 && (
                  <BracketSideLabel label="Middle Bracket" barClass={BRACKET_THEMES[themeKey].barMuted} textClass="text-neutral-400">
                    <BracketChain
                      rounds={middleRounds}
                      onSave={load}
                      onRemove={removeMatch}
                      finalBadge="qualified"
                      connectorClass={BRACKET_THEMES[themeKey].connector}
                    />
                  </BracketSideLabel>
                )}
                {lowerRounds.length > 0 && (
                  <BracketSideLabel label="Lower Bracket" barClass={BRACKET_THEMES[themeKey].barMuted} textClass="text-neutral-400">
                    <BracketChain
                      rounds={lowerRounds}
                      onSave={load}
                      onRemove={removeMatch}
                      // "Qualified" only applies when there's no grand final (triple elimination);
                      // in double elimination the lower final winner advances into the grand final instead.
                      finalBadge={grandFinal ? undefined : "qualified"}
                      connectorClass={BRACKET_THEMES[themeKey].connector}
                    />
                  </BracketSideLabel>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function BracketSideLabel({
  label,
  barClass,
  textClass,
  children,
}: {
  label: string;
  barClass: string;
  textClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-stretch gap-3">
      <div className={`flex w-6 shrink-0 items-center justify-center rounded-md ${barClass}`}>
        <span className={`[writing-mode:vertical-rl] rotate-180 whitespace-nowrap text-[10px] font-bold uppercase tracking-widest ${textClass}`}>
          {label}
        </span>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function ChampionBadge({ match }: { match: MatchData }) {
  if (match.status !== "COMPLETED" || !match.winnerId) return null;
  const winner = match.winnerId === match.teamA?.id ? match.teamA : match.teamB;
  if (!winner) return null;
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <span className="text-lg">🏆</span>
      <TeamLogo logoUrl={winner.logoUrl} tag={winner.tag} size="md" />
      <span className="text-center text-xs font-bold text-amber-300">{winner.name}</span>
    </div>
  );
}

function QualifiedBadge({ match }: { match: MatchData }) {
  if (match.status !== "COMPLETED" || !match.winnerId) return null;
  const winner = match.winnerId === match.teamA?.id ? match.teamA : match.teamB;
  if (!winner) return null;
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
      <span className="text-lg">✅</span>
      <TeamLogo logoUrl={winner.logoUrl} tag={winner.tag} size="md" />
      <span className="text-center text-xs font-bold text-emerald-300">Qualified</span>
    </div>
  );
}

interface RoundGroup {
  key: string;
  section: string;
  roundName: string;
  matches: MatchData[];
}

/** Group flat match list into ordered rounds per bracket section (ordered by match count, largest first). */
function groupIntoRounds(matches: MatchData[]): RoundGroup[] {
  const map = new Map<string, MatchData[]>();
  const firstSeen = new Map<string, number>();
  matches.forEach((m, i) => {
    const key = `${m.section}::${m.roundName}`;
    if (!map.has(key)) {
      map.set(key, []);
      firstSeen.set(key, i);
    }
    map.get(key)!.push(m);
  });

  const groups: RoundGroup[] = Array.from(map.entries()).map(([key, ms]) => {
    const [section, roundName] = key.split("::");
    return { key, section, roundName, matches: ms.sort((a, b) => a.matchIndex - b.matchIndex) };
  });

  const bySection = new Map<string, RoundGroup[]>();
  for (const g of groups) {
    if (!bySection.has(g.section)) bySection.set(g.section, []);
    bySection.get(g.section)!.push(g);
  }
  for (const list of bySection.values()) {
    list.sort((a, b) => b.matches.length - a.matches.length || firstSeen.get(a.key)! - firstSeen.get(b.key)!);
  }
  return Array.from(bySection.values()).flat();
}

const SLOT_HEIGHT = 92;
const ROUND_WIDTH = 208;

function BracketChain({
  rounds,
  onSave,
  onRemove,
  finalBadge,
  qualifiedAtRoundIndex,
  connectorClass,
}: {
  rounds: RoundGroup[];
  onSave: () => void;
  onRemove: (matchId: string) => void;
  finalBadge?: "champion" | "qualified";
  qualifiedAtRoundIndex?: number;
  connectorClass: string;
}) {
  const maxCount = Math.max(...rounds.map((r) => r.matches.length));
  const totalHeight = maxCount * SLOT_HEIGHT;
  const finalRound = rounds[rounds.length - 1];
  const finalMatch = finalRound?.matches[0];

  return (
    <div className="flex items-stretch">
      {rounds.map((round, i) => (
        <div key={round.key} className="flex items-stretch">
          <div className="flex shrink-0 flex-col" style={{ width: ROUND_WIDTH }}>
            <h4 className="mb-3 text-center text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              {round.section === "GRAND_FINAL" ? "Grand Final" : round.roundName}
            </h4>
            <div className="flex flex-col justify-around gap-2" style={{ height: totalHeight }}>
              {round.matches.map((m) => (
                <MatchEditor key={m.id} match={m} onSave={onSave} onRemove={onRemove} />
              ))}
            </div>
          </div>
          {i < rounds.length - 1 && (
            <BracketConnector
              countA={round.matches.length}
              countB={rounds[i + 1].matches.length}
              height={totalHeight}
              colorClass={connectorClass}
            />
          )}
          {qualifiedAtRoundIndex === i && round.matches[0] && (
            <div className="flex shrink-0 flex-col items-center justify-center gap-2 px-4" style={{ width: 152 }}>
              <QualifiedBadge match={round.matches[0]} />
            </div>
          )}
        </div>
      ))}
      {finalBadge && finalMatch && (
        <div className="flex shrink-0 flex-col items-center justify-center gap-2 pl-8" style={{ width: 160 }}>
          {finalBadge === "champion" ? <ChampionBadge match={finalMatch} /> : <QualifiedBadge match={finalMatch} />}
        </div>
      )}
    </div>
  );
}

function BracketConnector({
  countA,
  countB,
  height,
  colorClass,
}: {
  countA: number;
  countB: number;
  height: number;
  colorClass: string;
}) {
  if (countB > 0 && countA > 0 && countB === countA / 2) {
    return (
      <div className="flex w-6 shrink-0 flex-col justify-around pt-8" style={{ height }}>
        {Array.from({ length: countB }).map((_, i) => (
          <div key={i} className="flex flex-1 flex-col justify-center">
            <div className={`h-1/2 rounded-br-md border-r-2 border-b-2 ${colorClass}`} />
            <div className={`h-1/2 rounded-tr-md border-t-2 border-r-2 ${colorClass}`} />
          </div>
        ))}
      </div>
    );
  }
  // Same team count between rounds (e.g. lower-bracket drop-in stages): straight connectors.
  return (
    <div className="flex w-6 shrink-0 flex-col justify-around pt-8" style={{ height }}>
      {Array.from({ length: countA }).map((_, i) => (
        <div key={i} className="flex flex-1 items-center">
          <div className={`h-0 w-full border-t-2 ${colorClass}`} />
        </div>
      ))}
    </div>
  );
}

function GroupTable({
  groupName,
  matches,
  advanceCount,
  onSave,
  onRemove,
}: {
  groupName: string;
  matches: MatchData[];
  advanceCount: number | null;
  onSave: () => void;
  onRemove: (matchId: string) => void;
}) {
  const standings = new Map<
    string,
    { team: TeamRef; wins: number; losses: number; scoreFor: number; scoreAgainst: number }
  >();
  for (const m of matches) {
    if (!m.teamA || !m.teamB) continue;
    if (!standings.has(m.teamA.id))
      standings.set(m.teamA.id, { team: m.teamA, wins: 0, losses: 0, scoreFor: 0, scoreAgainst: 0 });
    if (!standings.has(m.teamB.id))
      standings.set(m.teamB.id, { team: m.teamB, wins: 0, losses: 0, scoreFor: 0, scoreAgainst: 0 });
    if (m.status !== "COMPLETED") continue;
    standings.get(m.teamA.id)!.scoreFor += m.teamAScore;
    standings.get(m.teamA.id)!.scoreAgainst += m.teamBScore;
    standings.get(m.teamB.id)!.scoreFor += m.teamBScore;
    standings.get(m.teamB.id)!.scoreAgainst += m.teamAScore;
    if (m.winnerId === m.teamA.id) {
      standings.get(m.teamA.id)!.wins++;
      standings.get(m.teamB.id)!.losses++;
    } else if (m.winnerId === m.teamB.id) {
      standings.get(m.teamB.id)!.wins++;
      standings.get(m.teamA.id)!.losses++;
    }
  }
  const ranked = [...standings.values()].sort(
    (a, b) => b.wins - a.wins || b.scoreFor - b.scoreAgainst - (a.scoreFor - a.scoreAgainst)
  );
  const cutoff = advanceCount ?? Math.ceil(ranked.length / 2);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-[11px] uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2 font-semibold text-neutral-300">{groupName}</th>
              <th className="px-3 py-2 text-right">Rec</th>
              <th className="px-3 py-2 text-right">Score</th>
              <th className="px-3 py-2 text-right">Δ</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r, i) => {
              const diff = r.scoreFor - r.scoreAgainst;
              return (
                <tr
                  key={r.team.id}
                  className={`border-t border-white/5 border-l-4 ${
                    i < cutoff ? "border-l-emerald-500" : "border-l-red-500/70"
                  }`}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <TeamLogo logoUrl={r.team.logoUrl} tag={r.team.tag} size="sm" />
                      <span className="font-medium text-white">{r.team.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-neutral-300">{r.wins}–{r.losses}</td>
                  <td className="px-3 py-2 text-right font-mono text-neutral-300">
                    {r.scoreFor}/{r.scoreAgainst}
                  </td>
                  <td className={`px-3 py-2 text-right font-semibold ${diff > 0 ? "text-emerald-400" : diff < 0 ? "text-red-400" : "text-neutral-400"}`}>
                    {diff > 0 ? "+" : ""}{diff}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="space-y-2">
        {matches.map((m) => (
          <MatchEditor key={m.id} match={m} onSave={onSave} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}

function MatchEditor({
  match,
  onSave,
  onRemove,
}: {
  match: MatchData;
  onSave: () => void;
  onRemove?: (matchId: string) => void;
}) {
  const [a, setA] = useState(match.teamAScore);
  const [b, setB] = useState(match.teamBScore);
  const disabled = !match.teamA || !match.teamB;

  async function commit(nextA: number, nextB: number) {
    if (disabled) return;
    if (nextA === match.teamAScore && nextB === match.teamBScore) return;
    await fetch(`/api/matches/${match.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamAScore: nextA, teamBScore: nextB }),
    });
    onSave();
  }

  return (
    <div
      className={`group relative w-full overflow-hidden rounded-md border bg-neutral-950/80 shadow-sm ${
        match.status === "LIVE" ? "border-red-500/60" : "border-white/10"
      }`}
    >
      <TeamRow
        name={match.teamA?.name ?? "TBD"}
        tag={match.teamA?.tag ?? "TBD"}
        logoUrl={match.teamA?.logoUrl}
        championships={match.teamA?.championships}
        advantage={match.teamAAdvantage}
        value={a}
        onChange={setA}
        onBlur={() => commit(a, b)}
        disabled={disabled}
        isWinner={match.winnerId === match.teamA?.id}
      />
      <div className="h-px bg-white/10" />
      <TeamRow
        name={match.teamB?.name ?? "TBD"}
        tag={match.teamB?.tag ?? "TBD"}
        logoUrl={match.teamB?.logoUrl}
        championships={match.teamB?.championships}
        advantage={match.teamBAdvantage}
        value={b}
        onChange={setB}
        onBlur={() => commit(a, b)}
        disabled={disabled}
        isWinner={match.winnerId === match.teamB?.id}
      />
    </div>
  );
}

function TeamRow({
  name,
  tag,
  logoUrl,
  championships,
  advantage,
  value,
  onChange,
  onBlur,
  disabled,
  isWinner,
}: {
  name: string;
  tag: string;
  logoUrl?: string | null;
  championships?: { title: string; year: number | null }[];
  advantage: number;
  value: number;
  onChange: (v: number) => void;
  onBlur: () => void;
  disabled: boolean;
  isWinner: boolean;
}) {
  const highlightedTitles = championships?.filter((c) => BRACKET_TITLES.has(c.title));

  return (
    <div className={`flex items-center justify-between gap-2 px-2 py-1.5 ${isWinner ? "bg-white/[0.06]" : ""}`}>
      <span
        className={`flex min-w-0 items-center gap-1.5 truncate text-[13px] ${
          isWinner ? "font-semibold text-white" : "text-neutral-400"
        }`}
      >
        <TeamLogo logoUrl={logoUrl} tag={tag} size="sm" />
        <span className="truncate">{name}</span>
        {highlightedTitles && highlightedTitles.length > 0 && (
          <ChampionshipStars championships={highlightedTitles} size="sm" />
        )}
        {advantage > 0 && (
          <span className="shrink-0 rounded bg-amber-500/20 px-1 text-[10px] font-bold text-amber-400">+{advantage}</span>
        )}
      </span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        disabled={disabled}
        onKeyDown={(e) => {
          if (["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Enter"].includes(e.key)) return;
          if (!/^[0-9]$/.test(e.key)) e.preventDefault();
        }}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "") || 0))}
        onBlur={onBlur}
        className="w-8 shrink-0 rounded-md bg-transparent text-center font-mono text-sm font-bold text-white outline-none transition focus:bg-white/10 focus:ring-1 focus:ring-red-500 disabled:opacity-30"
      />
    </div>
  );
}
