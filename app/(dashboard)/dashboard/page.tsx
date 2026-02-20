import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  SETUP: "secondary",
  GROUP_STAGE: "default",
  FINALS: "destructive",
  COMPLETE: "outline",
};

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [activeTournaments, myResults] = await Promise.all([
    prisma.tournament.findMany({
      where: { status: { in: ["GROUP_STAGE", "FINALS"] } },
      include: { _count: { select: { groups: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.raceResult.findMany({
      where: { userId },
      include: {
        race: {
          include: {
            group: {
              include: { tournament: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { race: { group: { tournament: { createdAt: "desc" } } } },
      take: 10,
    }),
  ]);

  // Compute user's group standings across active tournaments
  const myGroups = await prisma.groupMember.findMany({
    where: { userId, group: { tournament: { status: { in: ["GROUP_STAGE", "FINALS"] } } } },
    include: {
      group: {
        include: {
          tournament: { select: { id: true, name: true, status: true } },
          members: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
          races: {
            where: { status: "COMPLETE" },
            include: { results: true },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {session!.user.name}!</h1>
        <p className="text-muted-foreground">Your tournament dashboard</p>
      </div>

      {/* Active Tournaments */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Active Tournaments</h2>
        {activeTournaments.length === 0 ? (
          <p className="text-muted-foreground text-sm">No active tournaments.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeTournaments.map((t) => (
              <Card key={t.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    <Badge variant={statusColors[t.status] ?? "secondary"} className="text-xs">
                      {t.status.replace("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{t._count.groups} groups</p>
                  <Button asChild size="sm">
                    <Link href={`/tournaments/${t.id}`}>View Tournament</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* My Group Standings */}
      {myGroups.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">My Group Standings</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {myGroups.map(({ group }) => {
              // Calculate standings
              const standings = group.members.map((m) => {
                const results = group.races.flatMap((r) =>
                  r.results.filter((res) => res.userId === m.user.id)
                );
                return {
                  userId: m.user.id,
                  name: m.user.name,
                  points: results.reduce((s, r) => s + r.points, 0),
                };
              }).sort((a, b) => b.points - a.points);

              const myRank = standings.findIndex((s) => s.userId === userId) + 1;

              return (
                <Card key={group.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      {group.tournament.name} — Group {group.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {standings.slice(0, 5).map((s, i) => (
                        <div
                          key={s.userId}
                          className={`flex justify-between text-sm ${
                            s.userId === userId ? "font-semibold text-primary" : ""
                          }`}
                        >
                          <span>{i + 1}. {s.name}</span>
                          <span>{s.points} pts</span>
                        </div>
                      ))}
                    </div>
                    {myRank > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Your rank: #{myRank}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent Results */}
      {myResults.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Recent Results</h2>
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                {myResults.map((r) => (
                  <div key={r.id} className="flex justify-between items-center text-sm py-1 border-b last:border-0">
                    <div>
                      <span className="font-medium">{r.race.track}</span>
                      <span className="text-muted-foreground ml-2">
                        {r.race.group.tournament.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        P{r.position}
                      </Badge>
                      <span className="font-semibold">{r.points} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
