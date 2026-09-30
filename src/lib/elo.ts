import { prisma } from "./prisma";

const K_FACTOR = 32;
export const STARTING_ELO = 1000;

/** Standard Elo expected-score formula. */
function expectedScore(ratingA: number, ratingB: number) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/** Computes a team's new rating after a single match result (score = 1 win, 0 loss). */
export function nextRating(rating: number, opponentRating: number, score: 0 | 1) {
  return Math.round(rating + K_FACTOR * (score - expectedScore(rating, opponentRating)));
}

/**
 * Applies an Elo update for a completed match between two real teams.
 * Call this exactly once per match completion (bye/TBD matches don't count).
 */
export async function applyEloForMatch(teamAId: string, teamBId: string, winnerId: string) {
  const [teamA, teamB] = await Promise.all([
    prisma.team.findUnique({ where: { id: teamAId } }),
    prisma.team.findUnique({ where: { id: teamBId } }),
  ]);
  if (!teamA || !teamB) return;

  const scoreA = winnerId === teamAId ? 1 : 0;
  const newEloA = nextRating(teamA.elo, teamB.elo, scoreA);
  const newEloB = nextRating(teamB.elo, teamA.elo, (1 - scoreA) as 0 | 1);

  await prisma.$transaction([
    prisma.team.update({ where: { id: teamAId }, data: { elo: newEloA } }),
    prisma.team.update({ where: { id: teamBId }, data: { elo: newEloB } }),
  ]);
}

export async function getEloLeaderboard(region?: "CHINA" | "EUROPE" | "AMERICAS" | "APAC") {
  const teams = await prisma.team.findMany({
    where: region ? { region } : undefined,
    orderBy: { elo: "desc" },
  });
  return teams;
}

export type EloHistoryPoint = {
  matchId: string;
  date: Date;
  elo: number;
  won: boolean;
  opponent: { id: string; name: string; tag: string };
  tournamentName: string;
};

/**
 * Replays every completed match in chronological order to reconstruct a team's Elo trajectory,
 * since only the current rating is persisted. Returns the full history plus the all-time peak.
 */
export async function getTeamEloHistory(teamId: string, gamesLimit = 30) {
  const matches = await prisma.match.findMany({
    where: { status: "COMPLETED", teamAId: { not: null }, teamBId: { not: null }, winnerId: { not: null } },
    orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      teamAId: true,
      teamBId: true,
      winnerId: true,
      updatedAt: true,
      tournament: { select: { name: true } },
      teamA: { select: { id: true, name: true, tag: true } },
      teamB: { select: { id: true, name: true, tag: true } },
    },
  });

  const ratings = new Map<string, number>();
  const getRating = (id: string) => ratings.get(id) ?? STARTING_ELO;

  const history: EloHistoryPoint[] = [];
  let peak = STARTING_ELO;

  for (const m of matches) {
    if (!m.teamAId || !m.teamBId || !m.winnerId || !m.teamA || !m.teamB) continue;
    const ratingA = getRating(m.teamAId);
    const ratingB = getRating(m.teamBId);
    const scoreA = m.winnerId === m.teamAId ? 1 : 0;
    const newA = nextRating(ratingA, ratingB, scoreA as 0 | 1);
    const newB = nextRating(ratingB, ratingA, (1 - scoreA) as 0 | 1);
    ratings.set(m.teamAId, newA);
    ratings.set(m.teamBId, newB);

    if (m.teamAId === teamId || m.teamBId === teamId) {
      const isA = m.teamAId === teamId;
      const elo = isA ? newA : newB;
      history.push({
        matchId: m.id,
        date: m.updatedAt,
        elo,
        won: m.winnerId === teamId,
        opponent: isA ? m.teamB : m.teamA,
        tournamentName: m.tournament.name,
      });
      if (elo > peak) peak = elo;
    }
  }

  return {
    history: history.slice(-gamesLimit),
    peak,
    current: getRating(teamId),
  };
}
