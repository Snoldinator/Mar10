import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";
import { getPoints } from "@/lib/points";
import { advanceWinner } from "@/lib/tournament";
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

  const { id: matchId } = await params;
  const body = await req.json();
  const parsed = resultSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const match = await prisma.bracketMatch.findUnique({
    where: { id: matchId },
    include: { slots: true },
  });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  // Update slot positions and points
  for (const result of parsed.data.results) {
    const slot = match.slots.find((s) => s.userId === result.userId);
    if (slot) {
      await prisma.bracketSlot.update({
        where: { id: slot.id },
        data: {
          position: result.position,
          points: getPoints(result.position),
          advanced: result.position === 1,
        },
      });
    }
  }

  await prisma.bracketMatch.update({ where: { id: matchId }, data: { status: "COMPLETE" } });

  // Advance the winner to the next round
  await advanceWinner(matchId);

  const updated = await prisma.bracketMatch.findUnique({
    where: { id: matchId },
    include: { slots: { include: { user: { select: { id: true, name: true } } } } },
  });

  return NextResponse.json(updated);
}
