import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TournamentsAdmin } from "@/components/admin/tournaments-admin";

export default async function AdminTournamentsPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/dashboard");

  const raw = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      groups: {
        include: {
          races: { select: { status: true } },
          _count: { select: { members: true } },
        },
      },
      bracketMatches: { select: { status: true } },
    },
  });

  const tournaments = raw.map((t) => ({
    id: t.id,
    name: t.name,
    game: t.game,
    status: t.status,
    createdAt: t.createdAt,
    groupCount: t.groups.length,
    totalRaces: t.groups.reduce((sum, g) => sum + g.races.length, 0),
    completedRaces: t.groups.reduce(
      (sum, g) => sum + g.races.filter((r) => r.status === "COMPLETE").length,
      0
    ),
    totalBracketMatches: t.bracketMatches.length,
    completedBracketMatches: t.bracketMatches.filter((m) => m.status === "COMPLETE").length,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tournament Management</h1>
      <TournamentsAdmin initialTournaments={tournaments} />
    </div>
  );
}
