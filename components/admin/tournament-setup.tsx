"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Player {
  id: string;
  name: string;
  email: string;
}

interface GroupMember {
  id: string;
  user: Player;
}

interface Group {
  id: string;
  name: string;
  members: GroupMember[];
}

interface Tournament {
  id: string;
  name: string;
  status: string;
  groups: Group[];
}

export function TournamentSetup({
  tournament,
  players,
}: {
  tournament: Tournament;
  players: Player[];
}) {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  async function createGroup() {
    if (!groupName.trim()) return;
    setCreatingGroup(true);
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName.trim() }),
      });
      if (res.ok) {
        toast.success(`Group "${groupName}" created`);
        setGroupName("");
        router.refresh();
      } else {
        toast.error("Failed to create group");
      }
    } finally {
      setCreatingGroup(false);
    }
  }

  async function addMember(groupId: string, userId: string) {
    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to add player");
    }
  }

  async function removeMember(groupId: string, userId: string) {
    const res = await fetch(`/api/groups/${groupId}/members?userId=${userId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      router.refresh();
    } else {
      toast.error("Failed to remove player");
    }
  }

  // Players not yet in this specific group
  function availablePlayers(group: Group) {
    const memberIds = new Set(group.members.map((m) => m.user.id));
    return players.filter((p) => !memberIds.has(p.id));
  }

  return (
    <div className="space-y-6">
      {/* Create group */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Group</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group A"
              onKeyDown={(e) => e.key === "Enter" && createGroup()}
            />
            <Button onClick={createGroup} disabled={creatingGroup || !groupName.trim()}>
              {creatingGroup ? "Creating..." : "Create"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Tip: You can also auto-generate groups (A, B, C...) by creating them one by one.
          </p>
        </CardContent>
      </Card>

      {/* Groups */}
      {tournament.groups.length === 0 && (
        <p className="text-muted-foreground text-sm">No groups yet. Create a group above.</p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {tournament.groups.map((group) => {
          const available = availablePlayers(group);
          return (
            <Card key={group.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Group {group.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Current members */}
                <div className="space-y-1">
                  {group.members.length === 0 && (
                    <p className="text-sm text-muted-foreground">No players yet</p>
                  )}
                  {group.members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between">
                      <span className="text-sm">{m.user.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive h-6 px-2"
                        onClick={() => removeMember(group.id, m.user.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>

                {available.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Add player:</p>
                      <div className="flex flex-wrap gap-1">
                        {available.map((p) => (
                          <Badge
                            key={p.id}
                            variant="outline"
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                            onClick={() => addMember(group.id, p.id)}
                          >
                            + {p.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
