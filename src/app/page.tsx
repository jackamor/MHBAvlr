import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getTopTeamsGlobal } from "@/lib/points";
import MatchCard from "@/components/MatchCard";
import TeamCard from "@/components/TeamCard";
import HeadToHeadCompare from "@/components/HeadToHeadCompare";

export default async function Home() {
  const [upcoming, live, recent, topTeams, allTeams] = await Promise.all([
    prisma.match.findMany({
      where: { status: "SCHEDULED", teamAId: { not: null }, teamBId: { not: null } },
      include: { teamA: true, teamB: true, tournament: true },
      orderBy: { scheduledAt: "asc" },
      take: 6,
    }),
    prisma.match.findMany({
      where: { status: "LIVE" },
      include: { teamA: true, teamB: true, tournament: true },
      take: 6,
    }),
    prisma.match.findMany({
      where: { status: "COMPLETED" },
      include: { teamA: true, teamB: true, tournament: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    getTopTeamsGlobal(5),
    prisma.team.findMany({
      select: { id: true, name: true, tag: true, region: true, logoUrl: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-red-600/25 via-neutral-900 to-neutral-950 p-8 shadow-2xl shadow-black/40 sm:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-red-600/20 blur-3xl" />
        <h1 className="relative text-3xl font-black tracking-tight text-white sm:text-5xl">
          Track every team. Every region. Every bracket.
        </h1>
        <p className="relative mt-3 max-w-2xl text-neutral-300 sm:text-lg">
          Manage team profiles, regional leaderboards, and run single elimination,
          double elimination, round robin, or VCT-style regional tournaments.
        </p>
        <div className="relative mt-6 flex gap-3">
          <Link
            href="/teams"
            className="rounded-md bg-gradient-to-r from-red-600 to-red-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-900/40 transition hover:from-red-500 hover:to-red-400"
          >
            Browse Teams
          </Link>
          <Link
            href="/tournaments/new"
            className="rounded-md border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Create Tournament
          </Link>
        </div>
      </section>

      {live.length > 0 && (
        <Section title="Live Now" list>
          {live.map((m) => (
            <MatchCard
              key={m.id}
              tournamentId={m.tournamentId}
              tournamentName={m.tournament.name}
              tournamentLogoUrl={m.tournament.logoUrl}
              roundName={m.roundName}
              teamA={m.teamA}
              teamB={m.teamB}
              teamAScore={m.teamAScore}
              teamBScore={m.teamBScore}
              status={m.status}
              winnerId={m.winnerId}
            />
          ))}
        </Section>
      )}

      <Section title="Upcoming Matches" list>
        {upcoming.length === 0 && <Empty>No upcoming matches scheduled.</Empty>}
        {upcoming.map((m) => (
          <MatchCard
            key={m.id}
            tournamentId={m.tournamentId}
            tournamentName={m.tournament.name}
            tournamentLogoUrl={m.tournament.logoUrl}
            roundName={m.roundName}
            teamA={m.teamA}
            teamB={m.teamB}
            teamAScore={m.teamAScore}
            teamBScore={m.teamBScore}
            status={m.status}
            scheduledAt={m.scheduledAt?.toISOString()}
          />
        ))}
      </Section>

      <Section title="Recent Results" list>
        {recent.length === 0 && <Empty>No completed matches yet.</Empty>}
        {recent.map((m) => (
          <MatchCard
            key={m.id}
            tournamentId={m.tournamentId}
            tournamentName={m.tournament.name}
            tournamentLogoUrl={m.tournament.logoUrl}
            roundName={m.roundName}
            teamA={m.teamA}
            teamB={m.teamB}
            teamAScore={m.teamAScore}
            teamBScore={m.teamBScore}
            status={m.status}
            winnerId={m.winnerId}
          />
        ))}
      </Section>

      <Section title="Global Top 5">
        {topTeams.map((t) => (
          <TeamCard key={t.id} id={t.id} name={t.name} tag={t.tag} region={t.region} points={t.totalPoints} logoUrl={t.logoUrl} />
        ))}
      </Section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-white">Head-to-Head Comparison</h2>
        <HeadToHeadCompare teams={allTeams} />
      </section>
    </div>
  );
}

function Section({ title, children, list }: { title: string; children: React.ReactNode; list?: boolean }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-white">{title}</h2>
      <div className={list ? "flex flex-col gap-2" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"}>{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-neutral-500">{children}</p>;
}
