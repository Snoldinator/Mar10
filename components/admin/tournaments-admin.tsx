"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Tournament {
  id: string;
  name: string;
  game: string;
  status: string;
  createdAt: Date;
  groupCount: number;
  totalRaces: number;
  completedRaces: number;
  totalBracketMatches: number;
  completedBracketMatches: number;
}

const schema = z.object({
  name: z.string().min(1, "Name required"),
  game: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  SETUP: "secondary",
  GROUP_STAGE: "default",
  FINALS: "destructive",
  COMPLETE: "outline",
};

const statusLabels: Record<string, string> = {
  SETUP: "Setup",
  GROUP_STAGE: "Group Stage",
  FINALS: "Finals",
  COMPLETE: "Complete",
};

export function TournamentsAdmin({ initialTournaments }: { initialTournaments: Tournament[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState<string | null>(null);
  const [confirmComplete, setConfirmComplete] = useState<Tournament | null>(null);

  const form = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        toast.error("Failed to create tournament");
        return;
      }
      const t = await res.json();
      toast.success("Tournament created");
      setOpen(false);
      form.reset();
      router.refresh();
      router.push(`/admin/tournaments/${t.id}/setup`);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    setTransitioning(id);
    try {
      const res = await fetch(`/api/tournaments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Tournament moved to ${statusLabels[status] ?? status}`);
        router.refresh();
      } else {
        toast.error(data.error ?? "Failed to update status");
      }
    } finally {
      setTransitioning(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>New Tournament</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Tournament</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Tournament Name</Label>
                <Input {...form.register("name")} placeholder="Summer Cup 2026" />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Game (optional)</Label>
                <Input {...form.register("game")} placeholder="Mario Kart World" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create Tournament"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {initialTournaments.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No tournaments yet. Create one to get started.
            </CardContent>
          </Card>
        )}
        {initialTournaments.map((t) => {
          const busy = transitioning === t.id;
          const pendingRaces = t.totalRaces - t.completedRaces;
          const pendingMatches = t.totalBracketMatches - t.completedBracketMatches;

          return (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{t.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{t.game}</p>
                  </div>
                  <Badge variant={statusColors[t.status] ?? "secondary"}>
                    {statusLabels[t.status] ?? t.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Progress info */}
                <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                  <span>{t.groupCount} group{t.groupCount !== 1 ? "s" : ""}</span>
                  {t.totalRaces > 0 && (
                    <span className={pendingRaces > 0 ? "text-amber-600" : "text-green-600"}>
                      {t.completedRaces}/{t.totalRaces} races complete
                    </span>
                  )}
                  {t.totalBracketMatches > 0 && (
                    <span className={pendingMatches > 0 ? "text-amber-600" : "text-green-600"}>
                      {t.completedBracketMatches}/{t.totalBracketMatches} bracket matches complete
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/tournaments/${t.id}/setup`}>Setup</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/tournaments/${t.id}/races`}>Races</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/tournaments/${t.id}/bracket`}>Bracket</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/tournaments/${t.id}`}>View</Link>
                  </Button>

                  {t.status === "SETUP" && (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => updateStatus(t.id, "GROUP_STAGE")}
                    >
                      {busy ? "Starting..." : "Start Group Stage"}
                    </Button>
                  )}
                  {t.status === "GROUP_STAGE" && (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => updateStatus(t.id, "FINALS")}
                      title={pendingRaces > 0 ? `${pendingRaces} races still pending` : undefined}
                    >
                      {busy ? "Starting..." : "Start Finals"}
                    </Button>
                  )}
                  {t.status === "FINALS" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => setConfirmComplete(t)}
                    >
                      Mark Complete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Confirm Mark Complete */}
      <Dialog open={!!confirmComplete} onOpenChange={(o) => !o && setConfirmComplete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark tournament complete?</DialogTitle>
            <DialogDescription>
              <strong>{confirmComplete?.name}</strong> will be marked as finished.
              {confirmComplete && confirmComplete.totalBracketMatches - confirmComplete.completedBracketMatches > 0 && (
                <span className="block mt-1 text-amber-600">
                  Warning: {confirmComplete.totalBracketMatches - confirmComplete.completedBracketMatches} bracket match(es) are still pending.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmComplete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={transitioning === confirmComplete?.id}
              onClick={async () => {
                if (!confirmComplete) return;
                await updateStatus(confirmComplete.id, "COMPLETE");
                setConfirmComplete(null);
              }}
            >
              {transitioning === confirmComplete?.id ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
