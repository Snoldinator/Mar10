import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RaceAdmin } from "@/components/admin/race-admin";
import { notFound } from "next/navigation";

export default async function RacesAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      groups: {
        include: {
          members: { include: { user: { select: { id: true, name: true } } } },
          races: {
            include: {
              results: { include: { user: { select: { id: true, name: true } } } },
            },
          },
        },
      },
    },
  });

  if (!tournament) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{tournament.name}</h1>
      <p className="text-muted-foreground mb-6">Group Stage: Enter Race Results</p>
      <RaceAdmin tournament={tournament} />
    </div>
  );
}
