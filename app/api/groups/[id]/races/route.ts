import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";
import { z } from "zod";

const createSchema = z.object({
  track: z.string().min(1),
  cup: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: groupId } = await params;
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const race = await prisma.race.create({
    data: { groupId, track: parsed.data.track, cup: parsed.data.cup },
  });

  return NextResponse.json(race, { status: 201 });
}
