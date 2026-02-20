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

export function RaceAdmin({ tournament }: { tournament: Tournament }) {
  const router = useRouter();
  const [selectedRace, setSelectedRace] = useState<{ race: Race; group: Group } | null>(null);
  const [positions, setPositions] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  // Create race state
  const [createOpen, setCreateOpen] = useState<string | null>(null);
  const [track, setTrack] = useState("");
  const [cup, setCup] = useState("");
  const [creatingRace, setCreatingRace] = useState(false);

  async function createRace(groupId: string) {
    if (!track.trim() || !cup.trim()) return;
    setCreatingRace(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/races`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track: track.trim(), cup: cup.trim() }),
      });
      if (res.ok) {
        toast.success("Race created");
        setTrack("");
        setCup("");
        setCreateOpen(null);
        router.refresh();
      } else {
        toast.error("Failed to create race");
      }
    } finally {
      setCreatingRace(false);
    }
  }

  function openResultEntry(race: Race, group: Group) {
    setSelectedRace({ race, group });
    // Pre-fill existing results
    const existing: Record<string, number> = {};
    for (const r of race.results) {
      existing[r.userId] = r.position;
    }
    setPositions(existing);
  }

  async function submitResults() {
    if (!selectedRace) return;
    const { race, group } = selectedRace;

    // Validate all players have positions
    const results = group.members.map((m) => ({
      userId: m.user.id,
      position: positions[m.user.id] ?? 0,
    }));

    if (results.some((r) => !r.position)) {
      toast.error("All players must have a position");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/races/${race.id}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results }),
      });
      if (res.ok) {
        toast.success("Results saved");
        setSelectedRace(null);
        router.refresh();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to save results");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const allPositions = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      {tournament.groups.map((group) => (
        <Card key={group.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Group {group.name}</CardTitle>
              <Button size="sm" onClick={() => setCreateOpen(group.id)}>
                Add Race
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {group.races.length === 0 && (
              <p className="text-sm text-muted-foreground">No races yet.</p>
            )}
            <div className="space-y-2">
              {group.races.map((race) => (
                <div
                  key={race.id}
                  className="flex items-center justify-between p-2 border rounded-md"
                >
                  <div>
                    <span className="font-medium text-sm">{race.track}</span>
                    <span className="text-muted-foreground text-sm ml-2">({race.cup})</span>
                    <Badge
                      variant={race.status === "COMPLETE" ? "default" : "secondary"}
                      className="ml-2 text-xs"
                    >
                      {race.status}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openResultEntry(race, group)}
                  >
                    {race.status === "COMPLETE" ? "Edit Results" : "Enter Results"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Create Race Dialog */}
      <Dialog open={!!createOpen} onOpenChange={(o) => !o && setCreateOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Race</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Track Name</Label>
              <Input value={track} onChange={(e) => setTrack(e.target.value)} placeholder="Rainbow Road" />
            </div>
            <div className="space-y-2">
              <Label>Cup</Label>
              <Input value={cup} onChange={(e) => setCup(e.target.value)} placeholder="Star Cup" />
            </div>
            <Button
              className="w-full"
              onClick={() => createOpen && createRace(createOpen)}
              disabled={creatingRace || !track.trim() || !cup.trim()}
            >
              {creatingRace ? "Creating..." : "Create Race"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enter Results Dialog */}
      <Dialog open={!!selectedRace} onOpenChange={(o) => !o && setSelectedRace(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Enter Results — {selectedRace?.race.track}
            </DialogTitle>
          </DialogHeader>
          {selectedRace && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Group {selectedRace.group.name} · {selectedRace.race.cup}
              </p>
              {selectedRace.group.members.map((m) => {
                const pos = positions[m.user.id];
                return (
                  <div key={m.user.id} className="flex items-center justify-between gap-3">
                    <span className="text-sm flex-1">{m.user.name}</span>
                    <Select
                      value={pos ? String(pos) : ""}
                      onValueChange={(v) =>
                        setPositions((prev) => ({ ...prev, [m.user.id]: Number(v) }))
                      }
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue placeholder="Position" />
                      </SelectTrigger>
                      <SelectContent>
                        {allPositions.map((p) => (
                          <SelectItem key={p} value={String(p)}>
                            {p}{p === 1 ? "st" : p === 2 ? "nd" : p === 3 ? "rd" : "th"} ({getPoints(p)} pts)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
              <Button className="w-full" onClick={submitResults} disabled={submitting}>
                {submitting ? "Saving..." : "Save Results"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
