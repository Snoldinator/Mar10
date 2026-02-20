import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";
import bcrypt from "bcryptjs";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: { name?: string; password?: string } = {};
  if (parsed.data.name) data.name = parsed.data.name;
  if (parsed.data.password) data.password = await bcrypt.hash(parsed.data.password, 12);

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
