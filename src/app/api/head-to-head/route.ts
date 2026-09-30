import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const teamAId = req.nextUrl.searchParams.get("teamAId");
  const teamBId = req.nextUrl.searchParams.get("teamBId");

  if (!teamAId || !teamBId || teamAId === teamBId) {
    return NextResponse.json({ error: "Two distinct team ids are required" }, { status: 400 });
  }

  const [teamA, teamB] = await Promise.all([
    prisma.team.findUnique({ where: { id: teamAId } }),
    prisma.team.findUnique({ where: { id: teamBId } }),
  ]);
  if (!teamA || !teamB) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const matches = await prisma.match.findMany({
    where: {
      status: "COMPLETED",
      OR: [
        { teamAId, teamBId },
        { teamAId: teamBId, teamBId: teamAId },
      ],
    },
    include: { tournament: true },
    orderBy: { updatedAt: "desc" },
  });

  let winsA = 0;
  let winsB = 0;
  const history = matches.map((m) => {
    const aIsSlotA = m.teamAId === teamAId;
    const scoreA = aIsSlotA ? m.teamAScore : m.teamBScore;
    const scoreB = aIsSlotA ? m.teamBScore : m.teamAScore;
    if (m.winnerId === teamAId) winsA++;
    else if (m.winnerId === teamBId) winsB++;
    return {
      id: m.id,
      tournamentId: m.tournamentId,
      tournamentName: m.tournament.name,
      roundName: m.roundName,
      scoreA,
      scoreB,
      winnerId: m.winnerId,
      updatedAt: m.updatedAt,
    };
  });

  return NextResponse.json({
    teamA: { id: teamA.id, name: teamA.name, tag: teamA.tag, logoUrl: teamA.logoUrl },
    teamB: { id: teamB.id, name: teamB.name, tag: teamB.tag, logoUrl: teamB.logoUrl },
    winsA,
    winsB,
    history,
  });
}
