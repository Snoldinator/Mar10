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

const VALID_TRANSITIONS: Record<string, string> = {
  SETUP: "GROUP_STAGE",
  GROUP_STAGE: "FINALS",
  FINALS: "COMPLETE",
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Validate status transition
  if (parsed.data.status) {
    const current = await prisma.tournament.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (VALID_TRANSITIONS[current.status] !== parsed.data.status) {
      return NextResponse.json(
        { error: `Cannot transition from ${current.status} to ${parsed.data.status}` },
        { status: 400 }
      );
    }

    // SETUP → GROUP_STAGE: need at least one group with 2+ members
    if (parsed.data.status === "GROUP_STAGE") {
      const groups = await prisma.group.findMany({
        where: { tournamentId: id },
        include: { _count: { select: { members: true } } },
      });
      const ready = groups.filter((g) => g._count.members >= 2);
      if (ready.length === 0) {
        return NextResponse.json(
          { error: "Need at least one group with 2 or more players before starting the group stage" },
          { status: 400 }
        );
      }
    }

    // GROUP_STAGE → FINALS: all group races must be complete
    if (parsed.data.status === "FINALS") {
      const pendingRaces = await prisma.race.count({
        where: { group: { tournamentId: id }, status: "PENDING" },
      });
      if (pendingRaces > 0) {
        return NextResponse.json(
          { error: `${pendingRaces} race${pendingRaces > 1 ? "s" : ""} still pending — complete all group races before starting finals` },
          { status: 400 }
        );
      }
    }

    // FINALS → COMPLETE: all bracket matches must be complete
    if (parsed.data.status === "COMPLETE") {
      const pendingMatches = await prisma.bracketMatch.count({
        where: { tournamentId: id, status: "PENDING" },
      });
      if (pendingMatches > 0) {
        return NextResponse.json(
          { error: `${pendingMatches} bracket match${pendingMatches > 1 ? "es" : ""} still pending — complete the bracket before marking the tournament complete` },
          { status: 400 }
        );
      }
    }
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
