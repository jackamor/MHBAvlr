import { prisma } from "@/lib/prisma";
import AchievementsManager from "@/components/AchievementsManager";

export default async function AchievementsPage() {
  const [seasons, tournaments, teams] = await Promise.all([
    prisma.season.findMany({
      orderBy: { createdAt: "desc" },
      include: { events: { include: { tournament: true, championTeam: true } } },
    }),
    prisma.tournament.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.team.findMany({
      select: { id: true, name: true, tag: true, logoUrl: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Achievements</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Track each season&apos;s MSI and Worlds tournaments and their champions.
        </p>
      </div>
      <AchievementsManager seasons={seasons} tournaments={tournaments} teams={teams} />
    </div>
  );
}
