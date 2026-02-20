import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { TournamentView } from "@/components/tournament-view";
import { getGroupStandings } from "@/lib/tournament";

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      groups: {
        include: {
          members: { include: { user: { select: { id: true, name: true } } } },
          races: {
            include: {
              results: {
                include: { user: { select: { id: true, name: true } } },
                orderBy: { position: "asc" },
              },
            },
          },
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

  // Compute standings per group
  const groupStandings = await Promise.all(
    tournament.groups.map(async (g) => ({
      groupId: g.id,
      groupName: g.name,
      standings: await getGroupStandings(g.id),
    }))
  );

  return (
    <div>
      <TournamentView tournament={tournament} groupStandings={groupStandings} />
    </div>
  );
}
