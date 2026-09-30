import { prisma } from "./prisma";
import type { Region } from "@prisma/client";

export async function getTeamsWithPoints(region?: Region) {
  const teams = await prisma.team.findMany({
    where: region ? { region } : undefined,
    include: { pointEntries: true },
  });
  return teams
    .map((t) => ({
      ...t,
      totalPoints: t.pointEntries.reduce((sum, p) => sum + p.points, 0),
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

export async function getLeaderboard() {
  const regions: Region[] = ["AMERICAS", "EUROPE", "CHINA", "APAC"];
  const result: Record<Region, Awaited<ReturnType<typeof getTeamsWithPoints>>> =
    {} as never;
  for (const region of regions) {
    result[region] = await getTeamsWithPoints(region);
  }
  return result;
}

export async function getTopTeamsGlobal(limit: number) {
  const teams = await getTeamsWithPoints();
  return teams.slice(0, limit);
}

export async function getTopTeamsPerRegion(limitPerRegion: number) {
  const board = await getLeaderboard();
  return Object.values(board).flatMap((teams) => teams.slice(0, limitPerRegion));
}
