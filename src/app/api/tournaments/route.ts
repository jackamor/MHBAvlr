import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  buildDoubleElimination,
  buildRandomRoundRobin,
  buildRegionalFormat,
  buildSingleElimination,
  buildTripleElimination,
} from "@/lib/bracket";
import { getTeamsWithPoints, getTopTeamsGlobal, getTopTeamsPerRegion } from "@/lib/points";
import { resolveByes } from "@/lib/matchAdvance";

const teamSelectionSchema = z.union([
  z.object({ mode: z.literal("ALL") }),
  z.object({ mode: z.literal("REGION"), region: z.enum(["CHINA", "EUROPE", "AMERICAS", "APAC"]) }),
  z.object({ mode: z.literal("TOP16_GLOBAL") }),
  z.object({ mode: z.literal("TOP4_PER_REGION") }),
  z.object({ mode: z.literal("MANUAL"), teamIds: z.array(z.string()).min(2) }),
]);

const createTournamentSchema = z.object({
  name: z.string().min(1),
  type: z.enum((["SINGLE_ELIMINATION", "DOUBLE_ELIMINATION", "TRIPLE_ELIMINATION", "ROUND_ROBIN", "REGIONAL"])),
  region: z.enum((["CHINA", "EUROPE", "AMERICAS", "APAC"])).optional(),
  bestOf: z.coerce.number().int().min(1).max(7).default(3),
  teamSelection: teamSelectionSchema,
  gamesPerTeam: z.coerce.number().int().min(1).max(30).optional(),
  groupCount: z.coerce.number().int().min(1).max(8).optional(),
  groupBestOf: z.coerce.number().int().min(1).max(7).optional(),
  advanceCount: z.coerce.number().int().min(1).max(8).optional(),
  playoffBestOf: z.coerce.number().int().min(1).max(7).optional(),
  advantageCount: z.coerce.number().int().min(0).max(8).optional(),
  playoffFormat: z.enum((["SINGLE_ELIMINATION", "DOUBLE_ELIMINATION", "TRIPLE_ELIMINATION"])).optional(),
});

export async function GET() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    include: { teams: { include: { team: true } } },
  });
  return NextResponse.json(tournaments);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createTournamentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // Resolve teams by points-based selection.
  let orderedTeams: { id: string }[] = [];
  switch (data.teamSelection.mode) {
    case "ALL":
      orderedTeams = await getTeamsWithPoints();
      break;
    case "REGION":
      orderedTeams = await getTeamsWithPoints(data.teamSelection.region);
      break;
    case "TOP16_GLOBAL":
      orderedTeams = await getTopTeamsGlobal(16);
      break;
    case "TOP4_PER_REGION":
      orderedTeams = await getTopTeamsPerRegion(4);
      break;
    case "MANUAL":
      orderedTeams = data.teamSelection.teamIds.map((id) => ({ id }));
      break;
  }

  const teamIds = orderedTeams.map((t) => t.id);
  if (teamIds.length < 2) {
    return NextResponse.json({ error: "At least 2 teams are required" }, { status: 400 });
  }

  // Regional group stage draws are randomized rather than seeded by points.
  if (data.type === "REGIONAL") {
    for (let i = teamIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [teamIds[i], teamIds[j]] = [teamIds[j], teamIds[i]];
    }
  }

  const tournament = await prisma.tournament.create({
    data: {
      name: data.name,
      type: data.type,
      region: data.region,
      bestOf: data.bestOf,
      groupRounds: data.type === "ROUND_ROBIN" ? data.gamesPerTeam ?? 3 : data.groupBestOf ?? 1,
      advanceCount: data.advanceCount,
      playoffBestOf: data.playoffBestOf,
      advantageCount: data.advantageCount,
      playoffFormat: data.type === "REGIONAL" ? data.playoffFormat ?? "DOUBLE_ELIMINATION" : undefined,
      teams: {
        create: teamIds.map((teamId, i) => ({ teamId, seed: i + 1 })),
      },
    },
  });

  if (data.type === "SINGLE_ELIMINATION") {
    const matches = buildSingleElimination(teamIds, data.bestOf);
    await prisma.match.createMany({
      data: matches.map((m) => ({ ...m, tournamentId: tournament.id })),
    });
  } else if (data.type === "DOUBLE_ELIMINATION") {
    const matches = buildDoubleElimination(teamIds, data.bestOf);
    await prisma.match.createMany({
      data: matches.map((m) => ({ ...m, tournamentId: tournament.id })),
    });
  } else if (data.type === "TRIPLE_ELIMINATION") {
    const matches = buildTripleElimination(teamIds, data.bestOf);
    await prisma.match.createMany({
      data: matches.map((m) => ({ ...m, tournamentId: tournament.id })),
    });
  } else if (data.type === "ROUND_ROBIN") {
    const matches = buildRandomRoundRobin(teamIds, data.gamesPerTeam ?? 3, data.bestOf);
    await prisma.match.createMany({
      data: matches.map((m) => ({ ...m, tournamentId: tournament.id })),
    });
  } else if (data.type === "REGIONAL") {
    const groupCount = data.groupCount ?? 2;
    const { groupMatches } = buildRegionalFormat(teamIds, {
      groupCount,
      groupBestOf: data.groupBestOf ?? 1,
      playoffBestOf: data.playoffBestOf ?? 3,
      advanceCount: data.advanceCount ?? 4,
      advantageSeedCount: data.advantageCount ?? groupCount,
    });
    await prisma.match.createMany({
      data: groupMatches.map((m) => ({ ...m, tournamentId: tournament.id })),
    });
  }

  await resolveByes(tournament.id);

  const full = await prisma.tournament.findUnique({
    where: { id: tournament.id },
    include: { teams: { include: { team: true } }, matches: true },
  });

  return NextResponse.json(full, { status: 201 });
}
