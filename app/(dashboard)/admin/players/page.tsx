import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PlayersAdmin } from "@/components/admin/players-admin";

export default async function AdminPlayersPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/dashboard");

  const players = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Player Management</h1>
      <PlayersAdmin initialPlayers={players} />
    </div>
  );
}
