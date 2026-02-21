import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";
import { getPoints } from "@/lib/points";
import { z } from "zod";

const resultSchema = z.object({
  results: z.array(
    z.object({
      userId: z.string().min(1),
      position: z.number().int().min(1).max(12),
    })
  ),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: raceId } = await params;
  const body = await req.json();
  const parsed = resultSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // For 1v1 races, validate that submitted players match the race's assigned players
  const race = await prisma.race.findUniqueOrThrow({
    where: { id: raceId },
    select: { player1Id: true, player2Id: true },
  });
  if (race.player1Id && race.player2Id) {
    const expected = new Set([race.player1Id, race.player2Id]);
    const submitted = parsed.data.results.map((r) => r.userId);
    if (submitted.length !== 2 || !submitted.every((id) => expected.has(id))) {
      return NextResponse.json({ error: "Submitted players do not match this matchup" }, { status: 400 });
    }
  }

  // Validate no duplicate positions
  const positions = parsed.data.results.map((r) => r.position);
  if (new Set(positions).size !== positions.length) {
    return NextResponse.json({ error: "Duplicate positions not allowed" }, { status: 400 });
  }

  // Delete existing results and re-insert
  await prisma.raceResult.deleteMany({ where: { raceId } });

  await prisma.raceResult.createMany({
    data: parsed.data.results.map((r) => ({
      raceId,
      userId: r.userId,
      position: r.position,
      points: getPoints(r.position),
    })),
  });

  await prisma.race.update({ where: { id: raceId }, data: { status: "COMPLETE" } });

  const results = await prisma.raceResult.findMany({
    where: { raceId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { position: "asc" },
  });

  return NextResponse.json(results);
}
