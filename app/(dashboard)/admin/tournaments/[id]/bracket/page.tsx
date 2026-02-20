import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BracketAdmin } from "@/components/admin/bracket-admin";
import { notFound } from "next/navigation";

export default async function BracketAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      groups: {
        include: {
          members: { include: { user: { select: { id: true, name: true } } } },
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

  if (!tournament) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{tournament.name}</h1>
      <p className="text-muted-foreground mb-6">Finals Bracket</p>
      <BracketAdmin tournament={tournament} />
    </div>
  );
}
