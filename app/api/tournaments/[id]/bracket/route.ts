import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { generateBracket } from "@/lib/tournament";
import { z } from "zod";

const schema = z.object({
  advanceCount: z.number().int().min(1).max(8),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: tournamentId } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await generateBracket(tournamentId, parsed.data.advanceCount);
  return NextResponse.json(result, { status: 201 });
}
