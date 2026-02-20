"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

interface TournamentBracketProps {
  matches: BracketMatch[];
  highlightUserId?: string;
}

export function TournamentBracket({ matches, highlightUserId }: TournamentBracketProps) {
  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort();
  const maxRound = rounds.length > 0 ? Math.max(...rounds) : 0;

  const roundLabel = (round: number) => {
    if (round === maxRound) return "Final";
    if (round === maxRound - 1) return "Semi-Finals";
    if (round === maxRound - 2) return "Quarter-Finals";
    return `Round ${round}`;
  };

  if (matches.length === 0) {
    return <p className="text-muted-foreground text-sm">Bracket not yet generated.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-6 min-w-max pb-4">
        {rounds.map((round) => {
          const roundMatches = matches.filter((m) => m.round === round);
          return (
            <div key={round} className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-center text-muted-foreground uppercase tracking-wide">
                {roundLabel(round)}
              </h3>
              <div className="flex flex-col gap-6 justify-around flex-1">
                {roundMatches.map((match) => (
                  <div key={match.id} className="w-48 border rounded-lg overflow-hidden">
                    <div className="px-2 py-0.5 bg-muted text-xs text-muted-foreground flex justify-between">
                      <span>Match {match.matchNumber}</span>
                      <Badge
                        variant={match.status === "COMPLETE" ? "default" : "secondary"}
                        className="text-xs h-4 px-1"
                      >
                        {match.status === "COMPLETE" ? "Done" : "Pending"}
                      </Badge>
                    </div>
                    {match.slots.map((slot, i) => (
                      <div
                        key={slot.id}
                        className={cn(
                          "px-3 py-1.5 text-sm flex justify-between items-center",
                          i === 0 && match.slots.length > 1 && "border-b",
                          slot.advanced && "bg-primary/10 font-semibold",
                          slot.userId === highlightUserId && "text-primary"
                        )}
                      >
                        <span className="truncate">
                          {slot.user?.name ?? "TBD"}
                          {slot.advanced && " ✓"}
                        </span>
                        {slot.points != null && (
                          <span className="text-xs text-muted-foreground ml-2">{slot.points}p</span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
