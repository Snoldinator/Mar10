import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TournamentSetup } from "@/components/admin/tournament-setup";
import { notFound } from "next/navigation";

export default async function TournamentSetupPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      groups: {
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
      },
    },
  });

  if (!tournament) notFound();

  const players = await prisma.user.findMany({
    where: { role: "PLAYER" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{tournament.name}</h1>
      <p className="text-muted-foreground mb-6">Setup: Groups & Players</p>
      <TournamentSetup tournament={tournament} players={players} />
    </div>
  );
}
