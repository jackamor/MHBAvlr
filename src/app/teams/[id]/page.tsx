import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getTeamsWithPoints } from "@/lib/points";
import { getEloLeaderboard, getTeamEloHistory } from "@/lib/elo";
import RegionBadge from "@/components/RegionBadge";
import MatchCard from "@/components/MatchCard";
import EloChart from "@/components/EloChart";
import { getRecentForm } from "@/lib/form";
import FormBadges from "@/components/FormBadges";
import PastGamesWidget from "@/components/PastGamesWidget";
import TeamLogoEditor from "@/components/TeamLogoEditor";
import DeleteTeamButton from "@/components/DeleteTeamButton";
import ChampionshipStars from "@/components/ChampionshipStars";

const HISTORY_PAGE_SIZE = 30;

const SEASON_EVENT_META: Record<string, { icon: string; label: string }> = {
  WORLDS: { icon: "🏆", label: "Worlds" },
  MSI: { icon: "⭐", label: "MSI" },
  MASTERS: { icon: "🌟", label: "Masters" },
  MHBA: { icon: "⭐", label: "MHBA" },
};

export default async function TeamProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ historyPage?: string }>;
}) {
  const { id } = await params;
  const { historyPage } = await searchParams;
  const page = Math.max(1, Number(historyPage) || 1);
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      pointEntries: { include: { tournament: true }, orderBy: { createdAt: "desc" } },
      championships: { orderBy: { year: "desc" } },
      seasonEventChampion: { include: { season: true, tournament: true }, orderBy: { season: { createdAt: "desc" } } },
      matchesAsA: { include: { teamB: true, tournament: true } },
      matchesAsB: { include: { teamA: true, tournament: true } },
    },
  });
  if (!team) notFound();

  const totalPoints = team.pointEntries.reduce((s, p) => s + p.points, 0);

  const [globalRanked, regionalRanked, eloGlobalRanked, eloRegionalRanked, eloHistory] = await Promise.all([
    getTeamsWithPoints(),
    getTeamsWithPoints(team.region),
    getEloLeaderboard(),
    getEloLeaderboard(team.region),
    getTeamEloHistory(team.id),
  ]);
  const form = (await getRecentForm([team.id]))[team.id] ?? [];
  const globalRank = globalRanked.findIndex((t) => t.id === team.id) + 1;
  const regionalRank = regionalRanked.findIndex((t) => t.id === team.id) + 1;
  const eloGlobalRank = eloGlobalRanked.findIndex((t) => t.id === team.id) + 1;
  const eloRegionalRank = eloRegionalRanked.findIndex((t) => t.id === team.id) + 1;

  const allMatches = [
    ...team.matchesAsA.map((m) => ({ ...m, opponent: m.teamB, isTeamA: true })),
    ...team.matchesAsB.map((m) => ({ ...m, opponent: m.teamA, isTeamA: false })),
  ];
  const upcoming = allMatches.filter((m) => m.status !== "COMPLETED");
  const completed = allMatches
    .filter((m) => m.status === "COMPLETED")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const totalHistoryPages = Math.max(1, Math.ceil(completed.length / HISTORY_PAGE_SIZE));
  const currentPage = Math.min(page, totalHistoryPages);
  const pagedCompleted = completed.slice(
    (currentPage - 1) * HISTORY_PAGE_SIZE,
    currentPage * HISTORY_PAGE_SIZE
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center gap-4">
          <TeamLogoEditor teamId={team.id} tag={team.tag} logoUrl={team.logoUrl} />
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
              {team.name}
              <ChampionshipStars championships={team.championships} />
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <RegionBadge region={team.region} />
              <span className="text-sm text-neutral-400">Tag: {team.tag}</span>
            </div>
            <div className="mt-2">
              <FormBadges results={form} />
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-white">{totalPoints}</div>
          <div className="text-xs text-neutral-400">circuit points</div>
          <div className="mt-1 flex items-center justify-end gap-1.5 text-xs font-semibold">
            {globalRank > 0 && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-300">#{globalRank} Global</span>
            )}
            {regionalRank > 0 && (
              <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-red-300">#{regionalRank} {team.region}</span>
            )}
          </div>
          <div className="mt-2 text-lg font-bold text-sky-300">{team.elo} <span className="text-xs font-medium text-neutral-500">Elo</span></div>
          <div className="mt-1 flex items-center justify-end gap-1.5 text-xs font-semibold">
            {eloGlobalRank > 0 && (
              <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-sky-300">#{eloGlobalRank} Global</span>
            )}
            {eloRegionalRank > 0 && (
              <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-sky-400">#{eloRegionalRank} {team.region}</span>
            )}
          </div>
          <div className="mt-3">
            <DeleteTeamButton teamId={team.id} name={team.name} />
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold text-white">Elo Rating</h2>
        <EloChart history={eloHistory.history} peak={eloHistory.peak} current={eloHistory.current} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-white">Upcoming Matches</h2>
        <div className="flex flex-col gap-2">
          {upcoming.map((m) => (
            <MatchCard
              key={m.id}
              tournamentId={m.tournamentId}
              tournamentName={m.tournament.name}
              tournamentLogoUrl={m.tournament.logoUrl}
              roundName={m.roundName}
              teamA={{ id: team.id, name: team.name, tag: team.tag, logoUrl: team.logoUrl }}
              teamB={m.opponent}
              teamAScore={m.isTeamA ? m.teamAScore : m.teamBScore}
              teamBScore={m.isTeamA ? m.teamBScore : m.teamAScore}
              status={m.status}
              scheduledAt={m.scheduledAt?.toISOString()}
            />
          ))}
          {upcoming.length === 0 && <p className="text-sm text-neutral-500">No upcoming matches.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-white">Previous Matches</h2>
        <PastGamesWidget
          teamId={team.id}
          teamTag={team.tag}
          teamLogoUrl={team.logoUrl}
          games={pagedCompleted
            .filter((m) => m.opponent)
            .map((m) => ({
              id: m.id,
              tournamentId: m.tournamentId,
              tournamentName: m.tournament.name,
              tournamentLogoUrl: m.tournament.logoUrl,
              roundName: m.roundName,
              opponent: m.opponent!,
              teamScore: m.isTeamA ? m.teamAScore : m.teamBScore,
              opponentScore: m.isTeamA ? m.teamBScore : m.teamAScore,
              won: m.winnerId === team.id,
              updatedAt: m.updatedAt.toISOString(),
            }))}
        />
        {totalHistoryPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Link
              href={`/teams/${team.id}?historyPage=${currentPage - 1}`}
              aria-disabled={currentPage <= 1}
              className={`rounded-md border border-white/10 px-3 py-1.5 text-xs font-semibold ${
                currentPage <= 1
                  ? "pointer-events-none text-neutral-600"
                  : "text-neutral-300 hover:bg-white/10"
              }`}
            >
              ← Prev
            </Link>
            <span className="text-xs text-neutral-500">
              Page {currentPage} of {totalHistoryPages}
            </span>
            <Link
              href={`/teams/${team.id}?historyPage=${currentPage + 1}`}
              aria-disabled={currentPage >= totalHistoryPages}
              className={`rounded-md border border-white/10 px-3 py-1.5 text-xs font-semibold ${
                currentPage >= totalHistoryPages
                  ? "pointer-events-none text-neutral-600"
                  : "text-neutral-300 hover:bg-white/10"
              }`}
            >
              Next →
            </Link>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-white">Achievements</h2>
        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-neutral-400">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Season</th>
                <th className="px-3 py-2">Tournament</th>
              </tr>
            </thead>
            <tbody>
              {team.seasonEventChampion.map((e) => (
                <tr key={e.id} className="border-t border-white/5">
                  <td className="px-3 py-2 font-semibold text-white">
                    {SEASON_EVENT_META[e.title]?.icon ?? "⭐"} {SEASON_EVENT_META[e.title]?.label ?? e.title}
                  </td>
                  <td className="px-3 py-2 text-neutral-400">{e.season.label}</td>
                  <td className="px-3 py-2 text-neutral-400">
                    {e.tournament ? (
                      <Link href={`/tournaments/${e.tournament.id}`} className="hover:text-red-400">
                        {e.tournament.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {team.seasonEventChampion.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-neutral-500">
                    No achievements yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-white">Points History</h2>
        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-neutral-400">
              <tr>
                <th className="px-3 py-2">Placement</th>
                <th className="px-3 py-2">Tournament</th>
                <th className="px-3 py-2">Note</th>
                <th className="px-3 py-2 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {team.pointEntries.map((p) => (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="px-3 py-2 text-white">{p.placement}</td>
                  <td className="px-3 py-2 text-neutral-400">{p.tournament?.name ?? "—"}</td>
                  <td className="px-3 py-2 text-neutral-400">{p.note ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-semibold text-white">+{p.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
