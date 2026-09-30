// Bracket / schedule generation utilities.
// These functions return plain match "drafts" (no ids yet) that the API layer
// persists via Prisma. IDs are pre-generated here so we can wire up
// nextMatchId / nextLoserMatchId references before inserting into the DB.

import { randomUUID } from "crypto";

export type BracketSection = "GROUP" | "UPPER" | "MIDDLE" | "LOWER" | "PLAYOFF" | "GRAND_FINAL";

export interface MatchDraft {
  id: string;
  section: BracketSection;
  roundName: string;
  matchIndex: number;
  bestOf: number;
  groupName?: string | null;
  teamAId?: string | null;
  teamBId?: string | null;
  teamAAdvantage?: number;
  teamBAdvantage?: number;
  nextMatchId?: string | null;
  nextMatchSlot?: number | null; // 1 = teamA, 2 = teamB
  nextLoserMatchId?: string | null;
  nextLoserMatchSlot?: number | null;
}

function nextPowerOfTwo(n: number) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/** Standard seeding order (1v16, 8v9, 5v12, ... style bracket seeding) for a bracket of size `size`. */
function seedOrder(size: number): number[] {
  if (size === 1) return [1];
  const prev = seedOrder(size / 2);
  const out: number[] = [];
  for (const s of prev) {
    out.push(s, size + 1 - s);
  }
  return out;
}

/**
 * Single elimination bracket. `teamIds` should already be seeded (index 0 = seed 1, etc).
 * Byes are given to the top seeds if the field is not a power of two.
 */
export function buildSingleElimination(teamIds: string[], bestOf = 3): MatchDraft[] {
  const size = nextPowerOfTwo(teamIds.length);
  const order = seedOrder(size);
  const slots: (string | null)[] = order.map((seed) => teamIds[seed - 1] ?? null);

  const rounds: MatchDraft[][] = [];
  let roundTeams = slots;
  let roundNum = 1;
  const totalRounds = Math.log2(size);

  while (roundTeams.length > 1) {
    const roundName = roundLabel(roundNum, totalRounds);
    const matches: MatchDraft[] = [];
    for (let i = 0; i < roundTeams.length; i += 2) {
      const teamA = roundTeams[i];
      const teamB = roundTeams[i + 1];
      matches.push({
        id: randomUUID(),
        section: "PLAYOFF",
        roundName,
        matchIndex: i / 2,
        bestOf,
        teamAId: teamA,
        teamBId: teamB,
      });
    }
    rounds.push(matches);
    // advance byes automatically by filling next round placeholder; actual auto-advance of
    // real byes happens when matches are persisted (see resolveByes in tournaments API).
    roundTeams = matches.map(() => null as unknown as string);
    roundNum++;
  }

  // wire up next match pointers
  for (let r = 0; r < rounds.length - 1; r++) {
    const current = rounds[r];
    const next = rounds[r + 1];
    for (let i = 0; i < current.length; i++) {
      const nextMatch = next[Math.floor(i / 2)];
      current[i].nextMatchId = nextMatch.id;
      current[i].nextMatchSlot = i % 2 === 0 ? 1 : 2;
    }
  }

  return rounds.flat();
}

function roundLabel(roundNum: number, totalRounds: number) {
  const remaining = totalRounds - roundNum + 1;
  if (remaining === 1) return "Grand Final";
  if (remaining === 2) return "Semifinals";
  if (remaining === 3) return "Quarterfinals";
  return `Round ${roundNum}`;
}

/**
 * Generic loser-bracket builder: takes an ordered list of rounds whose matches
 * each produce exactly one loser (e.g. an upper bracket, or another loser bracket)
 * and folds those losers down to a single survivor. Each wave of new losers is
 * paired against existing bracket survivors first (the standard "major round"
 * pattern), and only paired against each other (or survivors against each other)
 * as a fallback when the counts don't line up 1:1. This never drops a team and
 * works for any shape, so it can be chained again for a third tier (used for
 * triple elimination).
 */
function buildLoserBracket(
  feederRounds: MatchDraft[][],
  bestOf: number,
  section: BracketSection,
  labelPrefix: string
): { rounds: MatchDraft[][]; final: MatchDraft; finalKind: "loser" | "winner" } {
  const rounds: MatchDraft[][] = [];
  let survivors: MatchDraft[] = [];
  let incomingLosers: MatchDraft[] = [];

  // Produces one round of pairings per call. Normally it greedily drops each
  // survivor in against a freshly-arrived loser (this keeps deeper chained
  // brackets — e.g. triple elimination's Lower bracket, fed by Middle bracket
  // rounds of uneven size — as a clean linear chain). But when `preferMinor`
  // is set (used only for the very last feeder round, typically the single
  // upper/middle-final loser), survivors are paired against each other first
  // so a lone incoming loser doesn't get matched before its siblings are
  // reduced down — otherwise a leftover survivor gets stranded and ends up
  // facing the *winner* of that premature pairing instead of the other way
  // around (this was the "lower round 2 winner skips to lower final" bug).
  function drain(preferMinor = false): boolean {
    const batch: MatchDraft[] = [];
    function pair(a: { match: MatchDraft; kind: "loser" | "winner" }, b: { match: MatchDraft; kind: "loser" | "winner" }) {
      const m: MatchDraft = {
        id: randomUUID(),
        section,
        roundName: `${labelPrefix} Round ${rounds.length + 1}`,
        matchIndex: batch.length,
        bestOf,
      };
      if (a.kind === "loser") {
        a.match.nextLoserMatchId = m.id;
        a.match.nextLoserMatchSlot = 1;
      } else {
        a.match.nextMatchId = m.id;
        a.match.nextMatchSlot = 1;
      }
      if (b.kind === "loser") {
        b.match.nextLoserMatchId = m.id;
        b.match.nextLoserMatchSlot = 2;
      } else {
        b.match.nextMatchId = m.id;
        b.match.nextMatchSlot = 2;
      }
      batch.push(m);
    }

    while (true) {
      if (preferMinor && survivors.length >= 2) {
        pair({ match: survivors.shift()!, kind: "winner" }, { match: survivors.shift()!, kind: "winner" });
      } else if (survivors.length > 0 && incomingLosers.length > 0) {
        pair({ match: survivors.shift()!, kind: "winner" }, { match: incomingLosers.shift()!, kind: "loser" });
      } else if (incomingLosers.length >= 2) {
        pair({ match: incomingLosers.shift()!, kind: "loser" }, { match: incomingLosers.shift()!, kind: "loser" });
      } else if (survivors.length >= 2) {
        pair({ match: survivors.shift()!, kind: "winner" }, { match: survivors.shift()!, kind: "winner" });
      } else {
        break;
      }
    }

    if (batch.length) {
      rounds.push(batch);
      survivors.push(...batch);
      return true;
    }
    return false;
  }

  feederRounds.forEach((round, i) => {
    incomingLosers.push(...round);
    drain(i === feederRounds.length - 1);
  });
  // Safety net: fully reduce whatever remains to a single survivor.
  while (survivors.length + incomingLosers.length > 1) {
    if (!drain(true)) break;
  }

  // If the sole survivor was never actually paired (e.g. only one team ever
  // dropped into this bracket), it's still that source match's loser, not a
  // new match's winner — callers must wire it via nextLoserMatchId instead.
  if (survivors.length) return { rounds, final: survivors[0], finalKind: "winner" };
  return { rounds, final: incomingLosers[0], finalKind: "loser" };
}


/** Rename every match in a round group (in place) — used to label the last round of a tier as its "Final". */
function relabelRound(round: MatchDraft[] | undefined, label: string) {
  if (!round) return;
  for (const m of round) m.roundName = label;
}

/**
 * Double elimination bracket: a winners bracket (UPPER) feeding into a losers
 * bracket (LOWER), converging on a grand final.
 */
export function buildDoubleElimination(teamIds: string[], bestOf = 3): MatchDraft[] {
  const size = nextPowerOfTwo(teamIds.length);
  const order = seedOrder(size);
  const slots: (string | null)[] = order.map((seed) => teamIds[seed - 1] ?? null);

  const upperRounds: MatchDraft[][] = [];
  let roundTeams = slots;
  let roundNum = 1;
  while (roundTeams.length > 1) {
    const matches: MatchDraft[] = [];
    for (let i = 0; i < roundTeams.length; i += 2) {
      matches.push({
        id: randomUUID(),
        section: "UPPER",
        roundName: `Upper Round ${roundNum}`,
        matchIndex: i / 2,
        bestOf,
        teamAId: roundTeams[i],
        teamBId: roundTeams[i + 1],
      });
    }
    upperRounds.push(matches);
    roundTeams = matches.map(() => null as unknown as string);
    roundNum++;
  }
  relabelRound(upperRounds[upperRounds.length - 1], "Upper Final");
  for (let r = 0; r < upperRounds.length - 1; r++) {
    const current = upperRounds[r];
    const next = upperRounds[r + 1];
    for (let i = 0; i < current.length; i++) {
      const nextMatch = next[Math.floor(i / 2)];
      current[i].nextMatchId = nextMatch.id;
      current[i].nextMatchSlot = i % 2 === 0 ? 1 : 2;
    }
  }

  const lower = buildLoserBracket(upperRounds, bestOf, "LOWER", "Lower");

  const grandFinal: MatchDraft = {
    id: randomUUID(),
    section: "GRAND_FINAL",
    roundName: "Grand Final",
    matchIndex: 0,
    bestOf,
  };
  const upperFinal = upperRounds[upperRounds.length - 1][0];
  upperFinal.nextMatchId = grandFinal.id;
  upperFinal.nextMatchSlot = 1;
  if (lower.finalKind === "loser") {
    lower.final.nextLoserMatchId = grandFinal.id;
    lower.final.nextLoserMatchSlot = 2;
  } else {
    lower.final.nextMatchId = grandFinal.id;
    lower.final.nextMatchSlot = 2;
    relabelRound(lower.rounds[lower.rounds.length - 1], "Lower Final");
  }

  return [...upperRounds.flat(), ...lower.rounds.flat(), grandFinal];
}

/**
 * Triple elimination bracket (VCT Kickoff-style): an upper (0-loss) bracket feeds
 * a middle (1-loss) bracket, which in turn feeds a lower (2-loss) bracket. There
 * is no consolidation match or overall champion — the Upper Final, Middle Final,
 * and Lower Final winners are the three teams that qualify onward. Works for any
 * power-of-two team count (4, 8, 16, 32, ...); smaller/odd fields are padded
 * with byes same as other formats.
 */
export function buildTripleElimination(teamIds: string[], bestOf = 3): MatchDraft[] {
  const size = nextPowerOfTwo(teamIds.length);
  if (size < 4) return buildDoubleElimination(teamIds, bestOf);

  const order = seedOrder(size);
  const slots: (string | null)[] = order.map((seed) => teamIds[seed - 1] ?? null);

  const upperRounds: MatchDraft[][] = [];
  let roundTeams = slots;
  let roundNum = 1;
  while (roundTeams.length > 1) {
    const matches: MatchDraft[] = [];
    for (let i = 0; i < roundTeams.length; i += 2) {
      matches.push({
        id: randomUUID(),
        section: "UPPER",
        roundName: `Upper Round ${roundNum}`,
        matchIndex: i / 2,
        bestOf,
        teamAId: roundTeams[i],
        teamBId: roundTeams[i + 1],
      });
    }
    upperRounds.push(matches);
    roundTeams = matches.map(() => null as unknown as string);
    roundNum++;
  }
  relabelRound(upperRounds[upperRounds.length - 1], "Upper Final");
  for (let r = 0; r < upperRounds.length - 1; r++) {
    const current = upperRounds[r];
    const next = upperRounds[r + 1];
    for (let i = 0; i < current.length; i++) {
      const nextMatch = next[Math.floor(i / 2)];
      current[i].nextMatchId = nextMatch.id;
      current[i].nextMatchSlot = i % 2 === 0 ? 1 : 2;
    }
  }

  const middle = buildLoserBracket(upperRounds, bestOf, "MIDDLE", "Middle");
  const lower = buildLoserBracket(middle.rounds, bestOf, "LOWER", "Lower");
  if (middle.finalKind === "winner") relabelRound(middle.rounds[middle.rounds.length - 1], "Middle Final");
  if (lower.finalKind === "winner") relabelRound(lower.rounds[lower.rounds.length - 1], "Lower Final");

  return [...upperRounds.flat(), ...middle.rounds.flat(), ...lower.rounds.flat()];
}

/**
 * Round robin: every team plays every other team `rounds` times (rounds=1 single RR, 2 = home/away style double RR).
 */
export function buildRoundRobin(
  teamIds: string[],
  rounds = 1,
  bestOf = 1,
  groupName: string | null = null
): MatchDraft[] {
  const matches: MatchDraft[] = [];
  let matchIndex = 0;
  for (let rep = 0; rep < rounds; rep++) {
    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        const [teamA, teamB] = rep % 2 === 0 ? [teamIds[i], teamIds[j]] : [teamIds[j], teamIds[i]];
        matches.push({
          id: randomUUID(),
          section: "GROUP",
          roundName: rounds > 1 ? `Round Robin (Cycle ${rep + 1})` : "Round Robin",
          matchIndex: matchIndex++,
          bestOf,
          groupName,
          teamAId: teamA,
          teamBId: teamB,
        });
      }
    }
  }
  return matches;
}

/**
 * Random partial round robin: each team plays exactly `gamesPerTeam` matches
 * against randomly chosen opponents (not necessarily every other team).
 * Falls back to whatever schedule it can build if a perfectly even schedule
 * isn't reachable (e.g. odd parity combinations).
 */
export function buildRandomRoundRobin(
  teamIds: string[],
  gamesPerTeam: number,
  bestOf = 1,
  groupName: string | null = null
): MatchDraft[] {
  const capped = Math.max(1, Math.min(gamesPerTeam, teamIds.length - 1));
  const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

  let bestEdges: [string, string][] = [];
  const maxAttempts = 300;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const remaining = new Map(teamIds.map((id) => [id, capped]));
    const used = new Set<string>();
    const edges: [string, string][] = [];

    while (true) {
      const active = teamIds.filter((id) => (remaining.get(id) ?? 0) > 0);
      if (active.length === 0) break;
      // Prioritize the team with the most remaining games to reduce dead ends.
      active.sort((a, b) => (remaining.get(b) ?? 0) - (remaining.get(a) ?? 0));
      const team = active[0];
      const candidates = active.filter((id) => id !== team && !used.has(pairKey(team, id)));
      if (candidates.length === 0) break;
      const opp = candidates[Math.floor(Math.random() * candidates.length)];
      used.add(pairKey(team, opp));
      edges.push([team, opp]);
      remaining.set(team, (remaining.get(team) ?? 0) - 1);
      remaining.set(opp, (remaining.get(opp) ?? 0) - 1);
    }

    if (edges.length > bestEdges.length) bestEdges = edges;
    if ([...remaining.values()].every((v) => v === 0)) break;
  }

  return bestEdges.map(([teamA, teamB], i) => ({
    id: randomUUID(),
    section: "GROUP",
    roundName: "Round Robin",
    matchIndex: i,
    bestOf,
    groupName,
    teamAId: teamA,
    teamBId: teamB,
  }));
}

/** Split teams into `groupCount` groups, snake-seeded so groups are balanced by seed. */
export function splitIntoGroups(teamIds: string[], groupCount: number): string[][] {
  const groups: string[][] = Array.from({ length: groupCount }, () => []);
  let dir = 1;
  let g = 0;
  for (const id of teamIds) {
    groups[g].push(id);
    if (dir === 1 && g === groupCount - 1) dir = -1;
    else if (dir === -1 && g === 0) dir = 1;
    else g += dir;
  }
  return groups;
}

/**
 * Regional (VCT-style) format: group stage round robin, then a single-elimination
 * playoff bracket seeded from group standings. Teams that finish 1st in their group
 * (or the top `advantageCount` seeds overall) start their first playoff series with
 * a one-game head start (teamAAdvantage/teamBAdvantage).
 */
export function buildRegionalFormat(
  teamIds: string[],
  opts: {
    groupCount: number;
    groupBestOf: number;
    playoffBestOf: number;
    advanceCount: number; // how many teams per group advance to playoffs
    advantageSeedCount: number; // how many top playoff seeds get the 1-game advantage
  }
): { groupMatches: MatchDraft[]; playoffPlaceholderSeeds: number; groups: string[][] } {
  const groups = splitIntoGroups(teamIds, opts.groupCount);
  const groupMatches = groups.flatMap((g, idx) =>
    buildRoundRobin(g, 1, opts.groupBestOf, `Group ${String.fromCharCode(65 + idx)}`)
  );
  const playoffPlaceholderSeeds = opts.groupCount * opts.advanceCount;
  return { groupMatches, playoffPlaceholderSeeds, groups };
}

export type PlayoffFormat = "SINGLE_ELIMINATION" | "DOUBLE_ELIMINATION" | "TRIPLE_ELIMINATION";

/**
 * Once group standings are known (after group matches complete), call this to build
 * the playoff bracket in the chosen format, applying the game-advantage to the top
 * seeds in their opening bracket match.
 */
export function buildRegionalPlayoffs(
  seededTeamIds: string[],
  playoffBestOf: number,
  advantageSeedCount: number,
  playoffFormat: PlayoffFormat = "DOUBLE_ELIMINATION"
): MatchDraft[] {
  const size = nextPowerOfTwo(seededTeamIds.length);
  const order = seedOrder(size);

  let matches: MatchDraft[];
  let openingMatches: MatchDraft[];

  if (playoffFormat === "SINGLE_ELIMINATION") {
    matches = buildSingleElimination(seededTeamIds, playoffBestOf);
    const firstRoundName = matches[0]?.roundName;
    openingMatches = matches.filter((m) => m.roundName === firstRoundName);
  } else {
    matches =
      playoffFormat === "TRIPLE_ELIMINATION"
        ? buildTripleElimination(seededTeamIds, playoffBestOf)
        : buildDoubleElimination(seededTeamIds, playoffBestOf);
    const firstUpperRoundName = matches.find((m) => m.section === "UPPER")?.roundName;
    openingMatches = matches.filter((m) => m.section === "UPPER" && m.roundName === firstUpperRoundName);
  }

  openingMatches.forEach((m, i) => {
    const seedA = order[i * 2];
    const seedB = order[i * 2 + 1];
    if (seedA <= advantageSeedCount) m.teamAAdvantage = 1;
    if (seedB <= advantageSeedCount) m.teamBAdvantage = 1;
  });
  return matches;
}
