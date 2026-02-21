import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RaceAdmin } from "@/components/admin/race-admin";
import { StandingsTable } from "@/components/standings-table";
import { getGroupStandings } from "@/lib/tournament";
import { Card, CardContent } from "@/components/ui/card";
import { notFound } from "next/navigation";

export default async function RacesAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      groups: {
        include: {
          members: { include: { user: { select: { id: true, name: true } } } },
          races: {
            include: {
              player1: { select: { id: true, name: true } },
              player2: { select: { id: true, name: true } },
              results: { include: { user: { select: { id: true, name: true } } } },
            },
            orderBy: { id: "asc" },
          },
        },
      },
    },
  });

  if (!tournament) notFound();

  const groupStandings = await Promise.all(
    tournament.groups.map(async (g) => ({
      groupId: g.id,
      groupName: g.name,
      standings: await getGroupStandings(g.id),
    }))
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">{tournament.name}</h1>
        <p className="text-muted-foreground">Group Stage: Record races and enter finishing positions</p>
      </div>

      <RaceAdmin tournament={tournament} />

      {groupStandings.some((gs) => gs.standings.some((s) => s.racesPlayed > 0)) && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Current Standings</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {groupStandings.map((gs) => (
              <Card key={gs.groupId}>
                <CardContent className="pt-4">
                  <StandingsTable standings={gs.standings} groupName={gs.groupName} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
