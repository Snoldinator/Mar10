import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { generateRoundRobin } from "@/lib/tournament";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: groupId } = await params;

  try {
    const count = await generateRoundRobin(groupId);
    return NextResponse.json({ matchups: count }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
