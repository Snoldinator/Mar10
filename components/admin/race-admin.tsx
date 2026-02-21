"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPoints } from "@/lib/points";

interface Player {
  id: string;
  name: string;
}

interface RaceResult {
  id: string;
  userId: string;
  position: number;
  points: number;
  user: Player;
}

interface Race {
  id: string;
  track: string;
  cup: string;
  status: string;
  player1Id: string | null;
  player2Id: string | null;
  player1: Player | null;
  player2: Player | null;
  results: RaceResult[];
}

interface GroupMember {
  id: string;
  user: Player;
}

interface Group {
  id: string;
  name: string;
  members: GroupMember[];
  races: Race[];
}

interface Tournament {
  id: string;
  name: string;
  groups: Group[];
}

function PositionSelect({
  userId,
  value,
  allPositions,
  takenPositions,
  onChange,
}: {
  userId: string;
  value: number | undefined;
  allPositions: number[];
  takenPositions: Record<string, number>;
  onChange: (pos: number) => void;
}) {
  const taken = new Set(
    Object.entries(takenPositions)
      .filter(([id]) => id !== userId)
      .map(([, pos]) => pos)
  );
  return (
    <Select value={value ? String(value) : ""} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-28">
        <SelectValue placeholder="Place…" />
      </SelectTrigger>
      <SelectContent>
        {allPositions.map((p) => (
          <SelectItem key={p} value={String(p)} disabled={taken.has(p)}>
            {p === 1 ? "1st" : p === 2 ? "2nd" : p === 3 ? "3rd" : `${p}th`} ({getPoints(p)} pts)
            {taken.has(p) ? " ✗" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function RaceAdmin({ tournament }: { tournament: Tournament }) {
  const router = useRouter();
  const [generating, setGenerating] = useState<string | null>(null);

  const [enterRace, setEnterRace] = useState<{ race: Race; group: Group } | null>(null);
  const [track, setTrack] = useState("");
  const [cup, setCup] = useState("");
  const [positions, setPositions] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleGenerate(group: Group) {
    setGenerating(group.id);
    try {
      const res = await fetch(`/api/groups/${group.id}/round-robin`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Generated ${data.matchups} matchups for Group ${group.name}`);
        router.refresh();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Generation failed");
      }
    } finally {
      setGenerating(null);
    }
  }

  function openEnter(race: Race, group: Group) {
    setEnterRace({ race, group });
    const existing: Record<string, number> = {};
    for (const r of race.results) existing[r.userId] = r.position;
    setPositions(existing);
    setTrack(race.track);
    setCup(race.cup);
  }

  async function submitEnter() {
    if (!enterRace) return;
    const { race } = enterRace;
    const players = [race.player1, race.player2].filter((p): p is Player => p !== null);

    if (!track.trim()) {
      toast.error("Enter a track name");
      return;
    }

    if (players.length === 0) {
      // No assigned players — only update track/cup
      setSubmitting(true);
      try {
        await fetch(`/api/races/${race.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ track: track.trim(), cup: cup.trim() }),
        });
        toast.success("Race updated");
        setEnterRace(null);
        router.refresh();
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const results = players.map((p) => ({
      userId: p.id,
      position: positions[p.id] ?? 0,
    }));
    if (results.some((r) => !r.position)) {
      toast.error("Assign a finishing position to each player");
      return;
    }

    setSubmitting(true);
    try {
      // Update track/cup on the race record
      await fetch(`/api/races/${race.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track: track.trim(), cup: cup.trim() }),
      });

      // Submit results
      const res = await fetch(`/api/races/${race.id}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results }),
      });
      if (res.ok) {
        toast.success("Result recorded");
        setEnterRace(null);
        router.refresh();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to save result");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Click <strong>Generate Schedule</strong> to create all 1v1 matchups for a group,
        then enter results as each race is played.
      </p>

      {tournament.groups.map((group) => {
        const pending = group.races.filter((r) => r.status === "PENDING").length;
        const complete = group.races.filter((r) => r.status === "COMPLETE").length;

        return (
          <Card key={group.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Group {group.name}</CardTitle>
                  {group.races.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {complete}/{group.races.length} races complete
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={generating === group.id}
                  onClick={() => handleGenerate(group)}
                >
                  {generating === group.id ? "Generating…" : "Generate Schedule"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {group.races.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No matchups yet — click Generate Schedule above.
                </p>
              ) : (
                <div className="space-y-2">
                  {group.races.map((race) => {
                    const p1 = race.player1;
                    const p2 = race.player2;
                    const winner = race.results.find((r) => r.position === 1);
                    return (
                      <div
                        key={race.id}
                        className="flex items-center justify-between p-2 border rounded-md"
                      >
                        <div className="min-w-0">
                          <span className="font-medium text-sm">
                            {p1?.name ?? "?"} vs {p2?.name ?? "?"}
                          </span>
                          {race.status === "COMPLETE" && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {race.track && `${race.track} · `}
                              🏆 {winner?.user.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          <Badge
                            variant={race.status === "COMPLETE" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {race.status === "COMPLETE" ? "Done" : "Pending"}
                          </Badge>
                          <Button size="sm" variant="outline" onClick={() => openEnter(race, group)}>
                            {race.status === "COMPLETE" ? "Edit" : "Enter Result"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Enter / Edit Result Dialog */}
      <Dialog open={!!enterRace} onOpenChange={(o) => !o && setEnterRace(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {enterRace?.race.player1?.name} vs {enterRace?.race.player2?.name}
            </DialogTitle>
          </DialogHeader>
          {enterRace && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Track</Label>
                  <Input
                    value={track}
                    onChange={(e) => setTrack(e.target.value)}
                    placeholder="Rainbow Road"
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <Label>Cup</Label>
                  <Input
                    value={cup}
                    onChange={(e) => setCup(e.target.value)}
                    placeholder="Star Cup"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Finishing order</p>
                {[enterRace.race.player1, enterRace.race.player2].filter((p): p is Player => p !== null).map((p) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <span className="text-sm">{p.name}</span>
                    <PositionSelect
                      userId={p.id}
                      value={positions[p.id]}
                      allPositions={Array.from({ length: 12 }, (_, i) => i + 1)}
                      takenPositions={positions}
                      onChange={(pos) =>
                        setPositions((prev) => ({ ...prev, [p.id]: pos }))
                      }
                    />
                  </div>
                ))}
                {!enterRace.race.player1 && !enterRace.race.player2 && (
                  <p className="text-xs text-muted-foreground">No players assigned to this race.</p>
                )}
              </div>

              <Button className="w-full" onClick={submitEnter} disabled={submitting}>
                {submitting ? "Saving…" : "Save Result"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
