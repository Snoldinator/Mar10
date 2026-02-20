import { prisma } from "@/lib/prisma";

export interface PlayerStanding {
  userId: string;
  name: string;
  totalPoints: number;
  racesPlayed: number;
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
    return {
      userId: m.userId,
      name: m.user.name,
      totalPoints: results.reduce((sum, r) => sum + r.points, 0),
      racesPlayed: results.length,
      positions: results.map((r) => r.position),
    };
  });

  return standings.sort((a, b) => b.totalPoints - a.totalPoints);
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

  // Gather top advanceCount from each group
  const allAdvancers: string[] = [];
  for (const group of groups) {
    const standings = await getGroupStandings(group.id);
    const top = standings.slice(0, advanceCount).map((s) => s.userId);
    allAdvancers.push(...top);
  }

  const numPlayers = allAdvancers.length;
  // Round up to next power of 2
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(numPlayers)));
  const totalRounds = Math.log2(bracketSize);

  // Delete existing bracket
  await prisma.bracketMatch.deleteMany({ where: { tournamentId } });

  // Create all matches for round 1
  const round1Matches = bracketSize / 2;
  const matches = [];
  for (let i = 0; i < round1Matches; i++) {
    const match = await prisma.bracketMatch.create({
      data: {
        tournamentId,
        round: 1,
        matchNumber: i + 1,
        status: "PENDING",
      },
    });

    const p1 = allAdvancers[i * 2];
    const p2 = allAdvancers[i * 2 + 1];

    await prisma.bracketSlot.create({
      data: { matchId: match.id, userId: p1 ?? null },
    });
    await prisma.bracketSlot.create({
      data: { matchId: match.id, userId: p2 ?? null },
    });

    matches.push(match);
  }

  // Create placeholder matches for subsequent rounds
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    for (let i = 0; i < matchesInRound; i++) {
      const match = await prisma.bracketMatch.create({
        data: {
          tournamentId,
          round,
          matchNumber: i + 1,
          status: "PENDING",
        },
      });
      // Placeholder slots for 2 TBD players
      await prisma.bracketSlot.createMany({
        data: [
          { matchId: match.id, userId: null },
          { matchId: match.id, userId: null },
        ],
      });
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
    include: { slots: true },
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
