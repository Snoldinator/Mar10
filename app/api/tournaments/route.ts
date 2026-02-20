import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/api-helpers";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  game: z.string().optional(),
});

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { groups: true, bracketMatches: true } },
    },
  });

  return NextResponse.json(tournaments);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const tournament = await prisma.tournament.create({
    data: {
      name: parsed.data.name,
      game: parsed.data.game ?? "Mario Kart World",
    },
  });

  return NextResponse.json(tournament, { status: 201 });
}
