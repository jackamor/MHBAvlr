import Link from "next/link";
import { prisma } from "@/lib/prisma";
import RegionBadge from "@/components/RegionBadge";
import DeleteTournamentButton from "@/components/DeleteTournamentButton";

const TYPE_LABELS: Record<string, string> = {
  SINGLE_ELIMINATION: "Single Elimination",
  DOUBLE_ELIMINATION: "Double Elimination",
  ROUND_ROBIN: "Round Robin",
  REGIONAL: "Regional (Groups + Playoffs)",
};

export default async function TournamentsPage() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    include: { teams: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Tournaments</h1>
        <Link href="/tournaments/new" className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">
          + Create Tournament
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {tournaments.map((t) => (
          <Link
            key={t.id}
            href={`/tournaments/${t.id}`}
            className="group relative rounded-lg border border-white/10 bg-white/[0.03] p-4 transition hover:border-red-500/40"
          >
            <DeleteTournamentButton tournamentId={t.id} name={t.name} />
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">{t.name}</h2>
              {t.region && <RegionBadge region={t.region} />}
            </div>
            <div className="mt-1 text-sm text-neutral-400">{TYPE_LABELS[t.type]}</div>
            <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
              <span>{t.teams.length} teams</span>
              <span className="font-semibold text-neutral-300">{t.status}</span>
            </div>
          </Link>
        ))}
        {tournaments.length === 0 && <p className="text-sm text-neutral-500">No tournaments yet.</p>}
      </div>
    </div>
  );
}
