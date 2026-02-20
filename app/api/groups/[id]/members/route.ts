import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";
import { z } from "zod";

const addSchema = z.object({
  userId: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: groupId } = await params;
  const body = await req.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const member = await prisma.groupMember.create({
    data: { groupId, userId: parsed.data.userId },
  });

  return NextResponse.json(member, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: groupId } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  await prisma.groupMember.deleteMany({ where: { groupId, userId } });
  return NextResponse.json({ ok: true });
}
