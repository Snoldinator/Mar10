"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Standing {
  userId: string;
  name: string;
  totalPoints: number;
  racesPlayed: number;
  wins?: number;
  losses?: number;
}

interface StandingsTableProps {
  standings: Standing[];
  highlightUserId?: string;
  groupName?: string;
}

export function StandingsTable({ standings, highlightUserId, groupName }: StandingsTableProps) {
  const showWL = standings.some((s) => s.wins !== undefined);

  return (
    <div>
      {groupName && <h3 className="font-semibold mb-2">Group {groupName}</h3>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Player</TableHead>
            {showWL ? (
              <>
                <TableHead className="text-right w-12">W</TableHead>
                <TableHead className="text-right w-12">L</TableHead>
              </>
            ) : (
              <TableHead className="text-right w-16">Races</TableHead>
            )}
            <TableHead className="text-right w-16">Pts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {standings.map((s, i) => (
            <TableRow key={s.userId} className={s.userId === highlightUserId ? "bg-primary/5" : ""}>
              <TableCell className="font-medium">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {s.name}
                  {s.userId === highlightUserId && (
                    <Badge variant="outline" className="text-xs">You</Badge>
                  )}
                </div>
              </TableCell>
              {showWL ? (
                <>
                  <TableCell className="text-right text-green-600 font-medium">{s.wins ?? 0}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{s.losses ?? 0}</TableCell>
                </>
              ) : (
                <TableCell className="text-right text-muted-foreground">{s.racesPlayed}</TableCell>
              )}
              <TableCell className="text-right font-semibold">{s.totalPoints}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
