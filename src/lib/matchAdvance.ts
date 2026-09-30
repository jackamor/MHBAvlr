import { prisma } from "./prisma";
import { applyEloForMatch } from "./elo";

/** Push a completed match's winner/loser into the next linked match slots. */
async function propagate(
  nextMatchId: string | null,
  nextSlot: number | null,
  teamId: string | null
) {
  if (!nextMatchId || !nextSlot || !teamId) return;
  await prisma.match.update({
    where: { id: nextMatchId },
    data: nextSlot === 1 ? { teamAId: teamId } : { teamBId: teamId },
  });
}

/**
 * Recompute a match's status/winner from its current scores (including any
 * game-advantage) and propagate the result forward in the bracket.
 */
export async function completeMatchFromScore(matchId: string) {
  const match = await prisma.match.findUniqueOrThrow({ where: { id: matchId } });
  const effectiveA = match.teamAScore + match.teamAAdvantage;
  const effectiveB = match.teamBScore + match.teamBAdvantage;
  const winsNeeded = Math.ceil(match.bestOf / 2);

  if (!match.teamAId || !match.teamBId) return match;

  if (effectiveA >= winsNeeded || effectiveB >= winsNeeded) {
    const winnerId = effectiveA > effectiveB ? match.teamAId : match.teamBId;
    const loserId = effectiveA > effectiveB ? match.teamBId : match.teamAId;
    const updated = await prisma.match.update({
      where: { id: matchId },
      data: { status: "COMPLETED", winnerId },
    });
    await propagate(match.nextMatchId, match.nextMatchSlot, winnerId);
    await propagate(match.nextLoserMatchId, match.nextLoserMatchSlot, loserId);
    // Only rate a match the first time it's completed, so re-editing a score later doesn't double-apply Elo.
    if (match.status !== "COMPLETED") {
      await applyEloForMatch(match.teamAId, match.teamBId, winnerId);
    }
    return updated;
  }

  const updated = await prisma.match.update({
    where: { id: matchId },
    data: { status: match.teamAScore + match.teamBScore > 0 ? "LIVE" : match.status },
  });
  return updated;
}

/**
 * Auto-advance any bracket matches that have a bye (one real team, one empty slot).
 * Runs multiple passes since resolving one bye can create another further down the bracket.
 */
export async function resolveByes(tournamentId: string) {
  for (let pass = 0; pass < 10; pass++) {
    const candidates = await prisma.match.findMany({
      where: {
        tournamentId,
        status: "SCHEDULED",
        section: { in: ["UPPER", "MIDDLE", "LOWER", "PLAYOFF"] },
        OR: [
          { teamAId: { not: null }, teamBId: null },
          { teamAId: null, teamBId: { not: null } },
        ],
      },
    });
    if (candidates.length === 0) break;
    for (const match of candidates) {
      const winnerId = match.teamAId ?? match.teamBId!;
      await prisma.match.update({
        where: { id: match.id },
        data: { status: "COMPLETED", winnerId },
      });
      await propagate(match.nextMatchId, match.nextMatchSlot, winnerId);
    }
  }
}
