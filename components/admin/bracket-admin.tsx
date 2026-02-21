"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Player {
  id: string;
  name: string;
}

interface BracketSlot {
  id: string;
  userId: string | null;
  position: number | null;
  points: number | null;
  advanced: boolean;
  user: Player | null;
}

interface BracketMatch {
  id: string;
  round: number;
  matchNumber: number;
  status: string;
  slots: BracketSlot[];
}

interface Group {
  id: string;
  name: string;
  members: { id: string; user: Player }[];
}

interface Tournament {
  id: string;
  name: string;
  status: string;
  groups: Group[];
  bracketMatches: BracketMatch[];
}

export function BracketAdmin({ tournament }: { tournament: Tournament }) {
  const router = useRouter();
  const [advanceCount, setAdvanceCount] = useState("2");
  const [generating, setGenerating] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);
  const [positions, setPositions] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const rounds = Array.from(new Set(tournament.bracketMatches.map((m) => m.round))).sort();

  async function generateBracket() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/bracket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advanceCount: Number(advanceCount) }),
      });
      if (res.ok) {
        toast.success("Bracket generated");
        router.refresh();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to generate bracket");
      }
    } finally {
      setGenerating(false);
    }
  }

  function openMatch(match: BracketMatch) {
    if (match.slots.some((s) => !s.userId)) {
      toast.error("Some players are TBD — complete earlier rounds first");
      return;
    }
    setSelectedMatch(match);
    const existing: Record<string, number> = {};
    for (const s of match.slots) {
      if (s.userId && s.position) existing[s.userId] = s.position;
    }
    setPositions(existing);
  }

  async function submitResults() {
    if (!selectedMatch) return;
    const results = selectedMatch.slots
      .filter((s) => s.userId)
      .map((s) => ({ userId: s.userId!, position: positions[s.userId!] ?? 0 }));

    if (results.some((r) => !r.position)) {
      toast.error("All players need positions");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/bracket/${selectedMatch.id}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results }),
      });
      if (res.ok) {
        toast.success("Results saved, winner advanced");
        setSelectedMatch(null);
        router.refresh();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to save results");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const maxRound = rounds.length > 0 ? Math.max(...rounds) : 0;
  const roundLabels: Record<number, string> = {
    [maxRound]: "Final",
    [maxRound - 1]: "Semi-Finals",
    [maxRound - 2]: "Quarter-Finals",
  };

  return (
    <div className="space-y-6">
      {/* Generate bracket */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate Bracket</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-sm">Players to advance per group</Label>
              <Input
                type="number"
                min={1}
                max={8}
                value={advanceCount}
                onChange={(e) => setAdvanceCount(e.target.value)}
                className="w-20"
              />
            </div>
            <Button onClick={generateBracket} disabled={generating}>
              {generating ? "Generating..." : "Generate Bracket"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            This will regenerate the bracket from current group standings.
          </p>
        </CardContent>
      </Card>

      {/* Bracket display */}
      {rounds.length === 0 && (
        <p className="text-muted-foreground text-sm">No bracket yet. Generate one above.</p>
      )}
      <div className="space-y-4">
        {rounds.map((round) => {
          const matches = tournament.bracketMatches.filter((m) => m.round === round);
          const label = roundLabels[round] ?? `Round ${round}`;
          return (
            <div key={round}>
              <h3 className="font-semibold mb-2">{label}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {matches.map((match) => (
                  <Card key={match.id} className="border">
                    <CardContent className="py-3 space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Match {match.matchNumber}</span>
                        <Badge variant={match.status === "COMPLETE" ? "default" : "secondary"} className="text-xs">
                          {match.status}
                        </Badge>
                      </div>
                      {match.slots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`flex items-center justify-between text-sm p-1 rounded ${
                            slot.advanced ? "bg-primary/10 text-primary font-medium" : ""
                          }`}
                        >
                          <span>{slot.user?.name ?? "TBD"}</span>
                          {slot.position && (
                            <span className="text-xs text-muted-foreground">
                              #{slot.position} · {slot.points}pts
                            </span>
                          )}
                        </div>
                      ))}
                      {match.status !== "COMPLETE" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-2"
                          onClick={() => openMatch(match)}
                        >
                          Enter Results
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Enter Results Dialog */}
      <Dialog open={!!selectedMatch} onOpenChange={(o) => !o && setSelectedMatch(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Match {selectedMatch?.matchNumber} Results
            </DialogTitle>
          </DialogHeader>
          {selectedMatch && (
            <div className="space-y-3">
              {selectedMatch.slots.filter((s) => s.userId).map((slot) => {
                const takenByOthers = new Set(
                  Object.entries(positions)
                    .filter(([id]) => id !== slot.userId)
                    .map(([, pos]) => pos)
                );
                return (
                <div key={slot.id} className="flex items-center justify-between gap-3">
                  <span className="text-sm flex-1">{slot.user?.name}</span>
                  <Select
                    value={positions[slot.userId!] ? String(positions[slot.userId!]) : ""}
                    onValueChange={(v) =>
                      setPositions((prev) => ({ ...prev, [slot.userId!]: Number(v) }))
                    }
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue placeholder="Position" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: selectedMatch.slots.filter((s) => s.userId).length }, (_, i) => i + 1).map((p) => (
                        <SelectItem key={p} value={String(p)} disabled={takenByOthers.has(p)}>
                          {p}{p === 1 ? "st" : p === 2 ? "nd" : p === 3 ? "rd" : "th"} ({getPoints(p)} pts)
                          {takenByOthers.has(p) ? " ✗" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                );
              })}
              <Button className="w-full" onClick={submitResults} disabled={submitting}>
                {submitting ? "Saving..." : "Save & Advance Winner"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
