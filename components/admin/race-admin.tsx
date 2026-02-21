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

  // Record new race state
  const [recordGroup, setRecordGroup] = useState<Group | null>(null);
  const [track, setTrack] = useState("");
  const [cup, setCup] = useState("");
  const [positions, setPositions] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  // Edit existing race state
  const [editRace, setEditRace] = useState<{ race: Race; group: Group } | null>(null);
  const [editPositions, setEditPositions] = useState<Record<string, number>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  function openRecord(group: Group) {
    setRecordGroup(group);
    setTrack("");
    setCup("");
    setPositions({});
  }

  function openEdit(race: Race, group: Group) {
    setEditRace({ race, group });
    const existing: Record<string, number> = {};
    for (const r of race.results) existing[r.userId] = r.position;
    setEditPositions(existing);
  }

  async function submitRecord() {
    if (!recordGroup) return;
    if (!track.trim() || !cup.trim()) {
      toast.error("Enter a track name and cup");
      return;
    }
    const results = recordGroup.members.map((m) => ({
      userId: m.user.id,
      position: positions[m.user.id] ?? 0,
    }));
    if (results.some((r) => !r.position)) {
      toast.error("Assign a finishing position to every player");
      return;
    }

    setSubmitting(true);
    try {
      // Create race
      const raceRes = await fetch(`/api/groups/${recordGroup.id}/races`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track: track.trim(), cup: cup.trim() }),
      });
      if (!raceRes.ok) { toast.error("Failed to create race"); return; }
      const race = await raceRes.json();

      // Submit results
      const resultsRes = await fetch(`/api/races/${race.id}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results }),
      });
      if (!resultsRes.ok) {
        const err = await resultsRes.json();
        toast.error(err.error ?? "Failed to save results");
        return;
      }

      toast.success("Race recorded");
      setRecordGroup(null);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function submitEdit() {
    if (!editRace) return;
    const results = editRace.group.members.map((m) => ({
      userId: m.user.id,
      position: editPositions[m.user.id] ?? 0,
    }));
    if (results.some((r) => !r.position)) {
      toast.error("Assign a finishing position to every player");
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/races/${editRace.race.id}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results }),
      });
      if (res.ok) {
        toast.success("Results updated");
        setEditRace(null);
        router.refresh();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to save results");
      }
    } finally {
      setEditSubmitting(false);
    }
  }

  function PositionSelect({
    userId,
    value,
    takenPositions,
    onChange,
    playerCount,
  }: {
    userId: string;
    value: number | undefined;
    takenPositions: Record<string, number>;
    onChange: (pos: number) => void;
    playerCount: number;
  }) {
    const taken = new Set(
      Object.entries(takenPositions)
        .filter(([id]) => id !== userId)
        .map(([, pos]) => pos)
    );
    return (
      <Select
        value={value ? String(value) : ""}
        onValueChange={(v) => onChange(Number(v))}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Position…" />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: playerCount }, (_, i) => i + 1).map((p) => (
            <SelectItem key={p} value={String(p)} disabled={taken.has(p)}>
              {p}{p === 1 ? "st" : p === 2 ? "nd" : p === 3 ? "rd" : "th"}
              {" "}({getPoints(p)} pts)
              {taken.has(p) ? " ✗" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Click <strong>Record Race</strong> on a group to enter the track, cup, and finishing positions in one step.
      </p>

      {tournament.groups.map((group) => (
        <Card key={group.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Group {group.name}</CardTitle>
              <Button size="sm" onClick={() => openRecord(group)}>
                Record Race
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {group.races.length === 0 ? (
              <p className="text-sm text-muted-foreground">No races yet — record the first one above.</p>
            ) : (
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
                    <Button size="sm" variant="outline" onClick={() => openEdit(race, group)}>
                      Edit Results
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Record Race Dialog */}
      <Dialog open={!!recordGroup} onOpenChange={(o) => !o && setRecordGroup(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Race — Group {recordGroup?.name}</DialogTitle>
          </DialogHeader>
          {recordGroup && (
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

              <div className="space-y-1">
                <p className="text-sm font-medium">Finishing positions</p>
                <p className="text-xs text-muted-foreground mb-2">Each position can only be assigned once.</p>
                <div className="space-y-2">
                  {recordGroup.members.map((m) => (
                    <div key={m.user.id} className="flex items-center justify-between">
                      <span className="text-sm">{m.user.name}</span>
                      <PositionSelect
                        userId={m.user.id}
                        value={positions[m.user.id]}
                        takenPositions={positions}
                        onChange={(pos) => setPositions((prev) => ({ ...prev, [m.user.id]: pos }))}
                        playerCount={recordGroup.members.length}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Button className="w-full" onClick={submitRecord} disabled={submitting}>
                {submitting ? "Saving…" : "Save Race & Results"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Results Dialog */}
      <Dialog open={!!editRace} onOpenChange={(o) => !o && setEditRace(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit Results — {editRace?.race.track}
            </DialogTitle>
          </DialogHeader>
          {editRace && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Group {editRace.group.name} · {editRace.race.cup}
              </p>
              <div className="space-y-2">
                {editRace.group.members.map((m) => (
                  <div key={m.user.id} className="flex items-center justify-between">
                    <span className="text-sm">{m.user.name}</span>
                    <PositionSelect
                      userId={m.user.id}
                      value={editPositions[m.user.id]}
                      takenPositions={editPositions}
                      onChange={(pos) => setEditPositions((prev) => ({ ...prev, [m.user.id]: pos }))}
                      playerCount={editRace.group.members.length}
                    />
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={submitEdit} disabled={editSubmitting}>
                {editSubmitting ? "Saving…" : "Save Results"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
