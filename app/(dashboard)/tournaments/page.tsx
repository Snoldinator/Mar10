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

export default async function TournamentsPage() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { groups: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tournaments</h1>
      {tournaments.length === 0 ? (
        <p className="text-muted-foreground">No tournaments yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <Badge variant={statusColors[t.status] ?? "secondary"} className="text-xs">
                    {t.status.replace("_", " ")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{t.game}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{t._count.groups} group(s)</p>
                <Button asChild size="sm">
                  <Link href={`/tournaments/${t.id}`}>View</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
