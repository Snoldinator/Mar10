"use client";

import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StandingsTable } from "@/components/standings-table";
import { TournamentBracket } from "@/components/tournament-bracket";

interface PlayerStanding {
  userId: string;
  name: string;
  totalPoints: number;
  racesPlayed: number;
}

interface GroupStanding {
  groupId: string;
  groupName: string;
  standings: PlayerStanding[];
}

interface RaceResult {
  id: string;
  userId: string;
  position: number;
  points: number;
  user: { id: string; name: string };
}

interface Race {
  id: string;
  track: string;
  cup: string;
  status: string;
  results: RaceResult[];
}

interface Group {
  id: string;
  name: string;
  races: Race[];
}

interface BracketSlot {
  id: string;
  userId: string | null;
  position: number | null;
  points: number | null;
  advanced: boolean;
  user: { id: string; name: string } | null;
}

interface BracketMatch {
  id: string;
  round: number;
  matchNumber: number;
  status: string;
  slots: BracketSlot[];
}

interface Tournament {
  id: string;
  name: string;
  game: string;
  status: string;
  groups: Group[];
  bracketMatches: BracketMatch[];
}

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  SETUP: "secondary",
  GROUP_STAGE: "default",
  FINALS: "destructive",
  COMPLETE: "outline",
};

export function TournamentView({
  tournament,
  groupStandings,
}: {
  tournament: Tournament;
  groupStandings: GroupStanding[];
}) {
  const { data: session } = useSession();
  const userId = session?.user.id;

  const completedRaces = tournament.groups.flatMap((g) =>
    g.races.filter((r) => r.status === "COMPLETE").map((r) => ({ ...r, groupName: g.name }))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tournament.name}</h1>
          <p className="text-muted-foreground">{tournament.game}</p>
        </div>
        <Badge variant={statusColors[tournament.status] ?? "secondary"}>
          {tournament.status.replace("_", " ")}
        </Badge>
      </div>

      <Tabs defaultValue="standings">
        <TabsList>
          <TabsTrigger value="standings">Group Standings</TabsTrigger>
          <TabsTrigger value="bracket">Finals Bracket</TabsTrigger>
          <TabsTrigger value="history">Race History</TabsTrigger>
        </TabsList>

        <TabsContent value="standings" className="mt-4 space-y-6">
          {groupStandings.length === 0 ? (
            <p className="text-muted-foreground text-sm">No groups yet.</p>
          ) : (
            groupStandings.map((gs) => (
              <Card key={gs.groupId}>
                <CardContent className="pt-4">
                  <StandingsTable
                    standings={gs.standings}
                    highlightUserId={userId}
                    groupName={gs.groupName}
                  />
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="bracket" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <TournamentBracket
                matches={tournament.bracketMatches}
                highlightUserId={userId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-4">
          {completedRaces.length === 0 ? (
            <p className="text-muted-foreground text-sm">No completed races yet.</p>
          ) : (
            completedRaces.map((race) => (
              <Card key={race.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-semibold">{race.track}</span>
                      <span className="text-muted-foreground text-sm ml-2">({race.cup})</span>
                    </div>
                    <Badge variant="outline" className="text-xs">Group {race.groupName}</Badge>
                  </div>
                  <div className="space-y-1">
                    {race.results.map((r) => (
                      <div
                        key={r.id}
                        className={`flex justify-between text-sm ${
                          r.userId === userId ? "font-semibold text-primary" : ""
                        }`}
                      >
                        <span>
                          {r.position === 1 ? "🥇" : r.position === 2 ? "🥈" : r.position === 3 ? "🥉" : `${r.position}.`}{" "}
                          {r.user.name}
                        </span>
                        <span className="text-muted-foreground">{r.points} pts</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
