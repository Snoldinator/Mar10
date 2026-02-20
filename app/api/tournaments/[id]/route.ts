import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/api-helpers";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["SETUP", "GROUP_STAGE", "FINALS", "COMPLETE"]).optional(),
  name: z.string().min(1).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      groups: {
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true } } } },
          races: { include: { results: { include: { user: { select: { id: true, name: true } } } } } },
        },
      },
      bracketMatches: {
        include: {
          slots: { include: { user: { select: { id: true, name: true } } } },
        },
        orderBy: [{ round: "asc" }, { matchNumber: "asc" }],
      },
    },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(tournament);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const tournament = await prisma.tournament.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(tournament);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  await prisma.tournament.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
