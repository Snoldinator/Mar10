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
  _count: { groups: number };
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

export function TournamentsAdmin({ initialTournaments }: { initialTournaments: Tournament[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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
    const res = await fetch(`/api/tournaments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success("Status updated");
      router.refresh();
    } else {
      toast.error("Failed to update status");
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
        {initialTournaments.map((t) => (
          <Card key={t.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{t.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{t.game}</p>
                </div>
                <Badge variant={statusColors[t.status] ?? "secondary"}>{t.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{t._count.groups} group(s)</p>
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
                  <Button size="sm" onClick={() => updateStatus(t.id, "GROUP_STAGE")}>
                    Start Group Stage
                  </Button>
                )}
                {t.status === "GROUP_STAGE" && (
                  <Button size="sm" onClick={() => updateStatus(t.id, "FINALS")}>
                    Start Finals
                  </Button>
                )}
                {t.status === "FINALS" && (
                  <Button size="sm" onClick={() => updateStatus(t.id, "COMPLETE")}>
                    Mark Complete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
