import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Distribute n players into groups of ideally 3–4.
 * Returns an array of group sizes.
 */
function calcGroupSizes(n: number): number[] {
  if (n < 2) throw new Error("Need at least 2 players to draw groups");

  // Start with groups of 4, then reduce count if any group would have < 3
  let numGroups = Math.ceil(n / 4);
  while (numGroups > 1 && Math.floor(n / numGroups) < 3) {
    numGroups--;
  }

  const base = Math.floor(n / numGroups);
  const extra = n % numGroups;
  return Array.from({ length: numGroups }, (_, i) => (i < extra ? base + 1 : base));
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: tournamentId } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true },
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Remove existing groups that have no races (safe to replace)
  const existingGroups = await prisma.group.findMany({
    where: { tournamentId },
    include: { _count: { select: { races: true } } },
  });
  const emptyGroupIds = existingGroups
    .filter((g) => g._count.races === 0)
    .map((g) => g.id);
  if (emptyGroupIds.length > 0) {
    await prisma.group.deleteMany({ where: { id: { in: emptyGroupIds } } });
  }

  // All players
  const players = await prisma.user.findMany({
    where: { role: "PLAYER" },
    select: { id: true },
  });
  if (players.length < 2) {
    return NextResponse.json({ error: "Need at least 2 players to draw groups" }, { status: 400 });
  }

  const shuffled = shuffle(players.map((p) => p.id));
  const sizes = calcGroupSizes(shuffled.length);

  // Work out how many groups already exist (with races, kept intact) to name new ones correctly
  const keptGroups = await prisma.group.findMany({
    where: { tournamentId },
    select: { id: true },
  });
  const startLetter = keptGroups.length;

  let offset = 0;
  let created = 0;
  for (let i = 0; i < sizes.length; i++) {
    const name = String.fromCharCode(65 + startLetter + i); // A, B, C, …
    const group = await prisma.group.create({
      data: { tournamentId, name },
    });
    const slice = shuffled.slice(offset, offset + sizes[i]);
    await prisma.groupMember.createMany({
      data: slice.map((userId) => ({ groupId: group.id, userId })),
    });
    offset += sizes[i];
    created++;
  }

  return NextResponse.json({ groups: created, players: shuffled.length }, { status: 201 });
}
