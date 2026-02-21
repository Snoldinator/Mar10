import { prisma } from "@/lib/prisma";

export interface PlayerStanding {
  userId: string;
  name: string;
  totalPoints: number;
  racesPlayed: number;
  wins: number;
  losses: number;
  positions: number[];
}

export async function getGroupStandings(groupId: string): Promise<PlayerStanding[]> {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: {
      user: true,
    },
  });

  const races = await prisma.race.findMany({
    where: { groupId, status: "COMPLETE" },
    include: { results: true },
  });

  const standings: PlayerStanding[] = members.map((m) => {
    const results = races.flatMap((r) => r.results.filter((res) => res.userId === m.userId));
    const positions = results.map((r) => r.position);
    return {
      userId: m.userId,
      name: m.user.name,
      totalPoints: results.reduce((sum, r) => sum + r.points, 0),
      racesPlayed: results.length,
      wins: positions.filter((p) => p === 1).length,
      losses: positions.filter((p) => p !== 1).length,
      positions,
    };
  });

  return standings.sort((a, b) => b.totalPoints - a.totalPoints);
}

/**
 * Generate a full round-robin schedule for one group using the circle algorithm.
 * Every player faces every other player exactly once.
 * Deletes existing PENDING races before inserting so re-generation is safe.
 */
export async function generateRoundRobin(groupId: string): Promise<number> {
  const members = await prisma.groupMember.findMany({ where: { groupId } });

  if (members.length < 2) {
    throw new Error("Need at least 2 players to generate a round-robin schedule");
  }

  await prisma.race.deleteMany({ where: { groupId, status: "PENDING" } });

  const ids = members.map((m) => m.userId);
  const list = ids.length % 2 !== 0 ? [...ids, null] : [...ids]; // pad to even if needed
  const half = list.length / 2;
  const matchups: { player1Id: string; player2Id: string }[] = [];

  for (let round = 0; round < list.length - 1; round++) {
    for (let i = 0; i < half; i++) {
      const p1 = list[i];
      const p2 = list[list.length - 1 - i];
      if (p1 && p2) matchups.push({ player1Id: p1, player2Id: p2 });
    }
    // Rotate: fix index 0, rotate the rest
    const last = list.pop()!;
    list.splice(1, 0, last);
  }

  await prisma.race.createMany({
    data: matchups.map(({ player1Id, player2Id }) => ({
      groupId,
      player1Id,
      player2Id,
      track: "",
      cup: "",
      status: "PENDING",
    })),
  });

  return matchups.length;
}

/**
 * Generate a single-elimination bracket from group standings.
 * advanceCount = how many players advance per group.
 * Seeds are interleaved so group winners don't meet until finals.
 */
export async function generateBracket(tournamentId: string, advanceCount: number) {
  const groups = await prisma.group.findMany({
    where: { tournamentId },
    include: { members: { include: { user: true } } },
  });

  // Gather top advanceCount from each group, then interleave so group winners
  // don't meet until finals: A1, B1, C1, A2, B2, C2, ...
  const advancersByGroup: string[][] = [];
  for (const group of groups) {
    const standings = await getGroupStandings(group.id);
    advancersByGroup.push(standings.slice(0, advanceCount).map((s) => s.userId));
  }
  const allAdvancers: string[] = [];
  for (let rank = 0; rank < advanceCount; rank++) {
    for (const groupAdvancers of advancersByGroup) {
      if (groupAdvancers[rank]) allAdvancers.push(groupAdvancers[rank]);
    }
  }

  const numPlayers = allAdvancers.length;
  if (numPlayers < 2) throw new Error("Need at least 2 players to generate a bracket");
  // Round up to next power of 2
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(numPlayers)));
  const totalRounds = Math.log2(bracketSize);

  // Delete existing bracket
  await prisma.bracketMatch.deleteMany({ where: { tournamentId } });

  // Create placeholder matches for all rounds first so advanceWinner can find them
  const matchIdsByRoundAndNumber: Record<number, Record<number, string>> = {};
  for (let round = 1; round <= totalRounds; round++) {
    matchIdsByRoundAndNumber[round] = {};
    const matchesInRound = bracketSize / Math.pow(2, round);
    for (let i = 0; i < matchesInRound; i++) {
      const match = await prisma.bracketMatch.create({
        data: { tournamentId, round, matchNumber: i + 1, status: "PENDING" },
      });
      await prisma.bracketSlot.createMany({
        data: [
          { matchId: match.id, userId: null },
          { matchId: match.id, userId: null },
        ],
      });
      matchIdsByRoundAndNumber[round][i + 1] = match.id;
    }
  }

  // Seed round 1 slots with actual players; auto-advance byes
  const round1Matches = bracketSize / 2;
  for (let i = 0; i < round1Matches; i++) {
    const matchId = matchIdsByRoundAndNumber[1][i + 1];
    const p1 = allAdvancers[i * 2] ?? null;
    const p2 = allAdvancers[i * 2 + 1] ?? null;

    // Update the pre-created null slots with actual player IDs
    const slots = await prisma.bracketSlot.findMany({
      where: { matchId },
      orderBy: { id: "asc" },
    });
    await prisma.bracketSlot.update({ where: { id: slots[0].id }, data: { userId: p1 } });
    await prisma.bracketSlot.update({ where: { id: slots[1].id }, data: { userId: p2 } });

    // Bye: one real player, no opponent — auto-advance immediately
    if (p1 && !p2) {
      await prisma.bracketSlot.update({ where: { id: slots[0].id }, data: { advanced: true } });
      await prisma.bracketMatch.update({ where: { id: matchId }, data: { status: "COMPLETE" } });
      await advanceWinner(matchId);
    } else if (p2 && !p1) {
      await prisma.bracketSlot.update({ where: { id: slots[1].id }, data: { advanced: true } });
      await prisma.bracketMatch.update({ where: { id: matchId }, data: { status: "COMPLETE" } });
      await advanceWinner(matchId);
    }
  }

  return { bracketSize, totalRounds, advancers: allAdvancers.length };
}

/**
 * After a bracket match result is entered, advance the winner to the next match.
 */
export async function advanceWinner(matchId: string) {
  const match = await prisma.bracketMatch.findUniqueOrThrow({
    where: { id: matchId },
    include: { slots: { include: { user: true } } },
  });

  const winner = match.slots.find((s) => s.advanced);
  if (!winner?.userId) return;

  // Find the next round match
  const nextRound = match.round + 1;
  const nextMatchNumber = Math.ceil(match.matchNumber / 2);

  const nextMatch = await prisma.bracketMatch.findFirst({
    where: {
      tournamentId: match.tournamentId,
      round: nextRound,
      matchNumber: nextMatchNumber,
    },
    include: { slots: { orderBy: { id: "asc" } } },
  });

  if (!nextMatch) return; // Finals winner, nothing to advance to

  // Fill the appropriate slot (odd matchNumber → slot 0, even → slot 1)
  const slotIndex = (match.matchNumber - 1) % 2;
  const slot = nextMatch.slots[slotIndex];
  if (slot) {
    await prisma.bracketSlot.update({
      where: { id: slot.id },
      data: { userId: winner.userId },
    });
  }
}
