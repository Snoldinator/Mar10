import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupStandings } from "@/lib/tournament";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StandingsTable } from "@/components/standings-table";

const positionLabel = (p: number) =>
  p === 1 ? "🥇 1st" : p === 2 ? "🥈 2nd" : p === 3 ? "🥉 3rd" : `${p}th`;

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [myGroupMemberships, myBracketSlots, recentResults, upcomingRaces] = await Promise.all([
    // Groups this player belongs to in active tournaments
    prisma.groupMember.findMany({
      where: { userId, group: { tournament: { status: { in: ["GROUP_STAGE", "FINALS"] } } } },
      include: {
        group: {
          include: { tournament: { select: { id: true, name: true, status: true } } },
        },
      },
    }),

    // Pending bracket matches this player is in
    prisma.bracketSlot.findMany({
      where: { userId, match: { status: "PENDING" } },
      include: {
        match: {
          include: {
            slots: { include: { user: { select: { id: true, name: true } } } },
            tournament: { select: { id: true, name: true } },
          },
        },
      },
    }),

    // Last 10 completed race results for this player
    prisma.raceResult.findMany({
      where: { userId },
      include: {
        race: {
          include: {
            player1: { select: { id: true, name: true } },
            player2: { select: { id: true, name: true } },
            results: { include: { user: { select: { id: true, name: true } } } },
            group: { include: { tournament: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { race: { id: "desc" } },
      take: 10,
    }),

    // Pending races this player is scheduled in
    prisma.race.findMany({
      where: { status: "PENDING", OR: [{ player1Id: userId }, { player2Id: userId }] },
      include: {
        player1: { select: { id: true, name: true } },
        player2: { select: { id: true, name: true } },
        group: { include: { tournament: { select: { id: true, name: true, status: true } } } },
      },
      orderBy: { id: "asc" },
    }),
  ]);

  // Fetch standings for each group the player is in
  const groupStandings = await Promise.all(
    myGroupMemberships.map(async ({ group }) => ({
      group,
      standings: await getGroupStandings(group.id),
    }))
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {session!.user.name}!</h1>
        <p className="text-muted-foreground">Your tournament dashboard</p>
      </div>

      {/* Upcoming Races */}
      {upcomingRaces.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Upcoming Races</h2>
          <div className="space-y-2">
            {upcomingRaces.map((race) => {
              const opponent = race.player1Id === userId ? race.player2 : race.player1;
              return (
                <Card key={race.id}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">
                        vs {opponent?.name ?? "TBD"}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {race.group.tournament.name} · Group {race.group.name}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">Scheduled</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Bracket Matches */}
      {myBracketSlots.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Finals Bracket</h2>
          <div className="space-y-2">
            {myBracketSlots.map(({ match }) => {
              const opponent = match.slots.find((s) => s.userId !== userId);
              return (
                <Card key={match.id}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">
                        vs {opponent?.user?.name ?? "TBD"}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {match.tournament.name} · Match {match.matchNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">Finals</Badge>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/tournaments/${match.tournamentId}`}>View</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* My Group Standings */}
      {groupStandings.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">My Group Standings</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {groupStandings.map(({ group, standings }) => (
              <Card key={group.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      {group.tournament.name} — Group {group.name}
                    </CardTitle>
                    <Button asChild size="sm" variant="ghost" className="text-xs h-7">
                      <Link href={`/tournaments/${group.tournament.id}`}>View →</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <StandingsTable standings={standings} highlightUserId={userId} />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Recent Results */}
      {recentResults.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Recent Results</h2>
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-0">
                {recentResults.map((r) => {
                  const opponent =
                    r.race.player1Id === userId ? r.race.player2 : r.race.player1;
                  const opponentResult = r.race.results.find(
                    (res) => res.userId !== userId
                  );
                  const won = r.position === 1;
                  return (
                    <div
                      key={r.id}
                      className="flex justify-between items-center text-sm py-2 border-b last:border-0"
                    >
                      <div className="min-w-0">
                        <span className={`font-medium ${won ? "text-green-600" : "text-muted-foreground"}`}>
                          {won ? "W" : "L"}
                        </span>
                        <span className="mx-2 text-muted-foreground">·</span>
                        <span className="font-medium">vs {opponent?.name ?? "?"}</span>
                        {r.race.track && (
                          <span className="text-muted-foreground ml-2 text-xs">
                            {r.race.track}
                          </span>
                        )}
                        <span className="text-muted-foreground ml-2 text-xs">
                          {r.race.group.tournament.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-xs text-muted-foreground">
                          {positionLabel(r.position)}
                        </span>
                        <span className="font-semibold text-xs">{r.points} pts</span>
                        {opponentResult && (
                          <span className="text-xs text-muted-foreground">
                            ({opponentResult.points} opp)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Empty state */}
      {upcomingRaces.length === 0 && myBracketSlots.length === 0 &&
        groupStandings.length === 0 && recentResults.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              You&apos;re not enrolled in any active tournaments yet.
            </p>
            <Button asChild className="mt-4">
              <Link href="/tournaments">Browse Tournaments</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
