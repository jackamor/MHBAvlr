import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildRegionalPlayoffs } from "@/lib/bracket";
import { resolveByes } from "@/lib/matchAdvance";

/**
 * For REGIONAL tournaments: once all group matches are complete, call this to
 * compute group standings and generate the playoff bracket, applying the
 * one-game advantage to top group finishers.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { matches: true, teams: { include: { team: true } } },
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tournament.type !== "REGIONAL") {
    return NextResponse.json({ error: "Not a regional tournament" }, { status: 400 });
  }

  const groupMatches = tournament.matches.filter((m) => m.section === "GROUP");
  if (groupMatches.some((m) => m.status !== "COMPLETED")) {
    return NextResponse.json({ error: "Group stage is not complete yet" }, { status: 400 });
  }
  if (tournament.matches.some((m) => m.section !== "GROUP")) {
    return NextResponse.json({ error: "Playoffs already generated" }, { status: 400 });
  }

  // Compute standings per group: wins, then head-to-head score diff.
  const groupNames = Array.from(new Set(groupMatches.map((m) => m.groupName!)));
  const advanceCount = tournament.advanceCount ?? 4;
  const qualifiedTeamIds: string[] = [];

  for (const groupName of groupNames) {
    const matches = groupMatches.filter((m) => m.groupName === groupName);
    const standings = new Map<string, { wins: number; diff: number }>();
    for (const m of matches) {
      if (!m.teamAId || !m.teamBId || !m.winnerId) continue;
      for (const teamId of [m.teamAId, m.teamBId]) {
        if (!standings.has(teamId)) standings.set(teamId, { wins: 0, diff: 0 });
      }
      standings.get(m.teamAId)!.diff += m.teamAScore - m.teamBScore;
      standings.get(m.teamBId)!.diff += m.teamBScore - m.teamAScore;
      if (m.winnerId === m.teamAId) standings.get(m.teamAId)!.wins += 1;
      else standings.get(m.teamBId)!.wins += 1;
    }
    const ranked = [...standings.entries()].sort(
      (a, b) => b[1].wins - a[1].wins || b[1].diff - a[1].diff
    );
    qualifiedTeamIds.push(...ranked.slice(0, advanceCount).map(([teamId]) => teamId));
  }

  // Seed the playoff bracket by total circuit points rather than group placement.
  const pointEntries = await prisma.pointEntry.findMany({
    where: { teamId: { in: qualifiedTeamIds } },
  });
  const pointsByTeam = new Map<string, number>();
  for (const entry of pointEntries) {
    pointsByTeam.set(entry.teamId, (pointsByTeam.get(entry.teamId) ?? 0) + entry.points);
  }
  const seededTeamIds = [...qualifiedTeamIds].sort(
    (a, b) => (pointsByTeam.get(b) ?? 0) - (pointsByTeam.get(a) ?? 0)
  );

  const playoffBestOf = tournament.playoffBestOf ?? 3;
  const advantageCount = tournament.advantageCount ?? groupNames.length;
  const matches = buildRegionalPlayoffs(
    seededTeamIds,
    playoffBestOf,
    advantageCount,
    tournament.playoffFormat ?? "DOUBLE_ELIMINATION"
  );

  await prisma.match.createMany({
    data: matches.map((m) => ({ ...m, tournamentId: tournament.id })),
  });
  await resolveByes(tournament.id);

  const full = await prisma.tournament.findUnique({
    where: { id: tournament.id },
    include: { matches: true, teams: { include: { team: true } } },
  });
  return NextResponse.json(full);
}
