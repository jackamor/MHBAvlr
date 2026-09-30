import { prisma } from "./prisma";

export type FormResult = "W" | "L";

/** Fetches each team's most recent completed-match results (newest first) in one query. */
export async function getRecentForm(teamIds: string[], n = 5): Promise<Record<string, FormResult[]>> {
  if (teamIds.length === 0) return {};

  const matches = await prisma.match.findMany({
    where: {
      status: "COMPLETED",
      winnerId: { not: null },
      OR: [{ teamAId: { in: teamIds } }, { teamBId: { in: teamIds } }],
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    select: { teamAId: true, teamBId: true, winnerId: true },
  });

  const form: Record<string, FormResult[]> = {};
  for (const id of teamIds) form[id] = [];

  for (const m of matches) {
    for (const id of [m.teamAId, m.teamBId]) {
      if (!id || !teamIds.includes(id)) continue;
      if (form[id].length >= n) continue;
      form[id].push(m.winnerId === id ? "W" : "L");
    }
  }

  return form;
}
