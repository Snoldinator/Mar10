"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

interface Player {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

const schema = z.object({
  name: z.string().min(1, "Name required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
});
type FormData = z.infer<typeof schema>;

export function PlayersAdmin({ initialPlayers }: { initialPlayers: Player[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Failed to create player");
        return;
      }
      toast.success("Player created");
      setOpen(false);
      form.reset();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function deletePlayer(id: string) {
    if (!confirm("Delete this player?")) return;
    const res = await fetch(`/api/players/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Player deleted");
      router.refresh();
    } else {
      toast.error("Failed to delete");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add Player</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Player</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input {...form.register("name")} placeholder="Mario" />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input {...form.register("email")} type="email" placeholder="mario@example.com" />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input {...form.register("password")} type="password" placeholder="••••••" />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create Player"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Players ({initialPlayers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {initialPlayers.length === 0 && (
              <p className="text-muted-foreground text-sm">No players yet.</p>
            )}
            {initialPlayers.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground text-sm ml-2">{p.email}</span>
                  <Badge variant={p.role === "ADMIN" ? "default" : "secondary"} className="ml-2 text-xs">
                    {p.role}
                  </Badge>
                </div>
                {p.role !== "ADMIN" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deletePlayer(p.id)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
