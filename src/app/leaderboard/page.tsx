import Link from "next/link";
import { getLeaderboard } from "@/lib/points";
import { getEloLeaderboard } from "@/lib/elo";
import { getRecentForm } from "@/lib/form";
import RegionBadge from "@/components/RegionBadge";
import TeamLogo from "@/components/TeamLogo";
import FormBadges from "@/components/FormBadges";

const REGIONS = ["AMERICAS", "EUROPE", "CHINA", "APAC"] as const;

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; mode?: string }>;
}) {
  const { region, mode } = await searchParams;
  const activeRegion = (region as (typeof REGIONS)[number]) ?? "AMERICAS";
  const activeMode = mode === "elo" ? "elo" : "points";

  const board = await getLeaderboard();
  const pointsTeams = board[activeRegion] ?? [];
  const eloTeams = activeMode === "elo" ? await getEloLeaderboard(activeRegion) : [];
  const visibleTeams = activeMode === "elo" ? eloTeams : pointsTeams;
  const form = await getRecentForm(visibleTeams.map((t) => t.id));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Regional Leaderboards</h1>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {REGIONS.map((r) => (
            <Link
              key={r}
              href={`/leaderboard?region=${r}&mode=${activeMode}`}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                activeRegion === r ? "bg-red-600 text-white" : "bg-white/5 text-neutral-300 hover:bg-white/10"
              }`}
            >
              {r}
            </Link>
          ))}
        </div>
        <div className="flex gap-1 rounded-full bg-white/5 p-1">
          {(["points", "elo"] as const).map((m) => (
            <Link
              key={m}
              href={`/leaderboard?region=${activeRegion}&mode=${m}`}
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide transition ${
                activeMode === m ? "bg-white text-neutral-900" : "text-neutral-400 hover:text-white"
              }`}
            >
              {m === "points" ? "Points" : "Elo Rating"}
            </Link>
          ))}
        </div>
      </div>

      {activeMode === "points" ? (
        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-neutral-400">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">Form</th>
                <th className="px-4 py-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {pointsTeams.map((t, i) => (
                <tr key={t.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-bold text-neutral-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link href={`/teams/${t.id}`} className="flex items-center gap-2 font-semibold text-white hover:text-red-400">
                      <TeamLogo logoUrl={t.logoUrl} tag={t.tag} size="sm" />
                      {t.name}
                    </Link>
                    <span className="ml-8 text-xs text-neutral-500">{t.tag}</span>
                  </td>
                  <td className="px-4 py-3"><RegionBadge region={t.region} /></td>
                  <td className="px-4 py-3"><FormBadges results={form[t.id] ?? []} /></td>
                  <td className="px-4 py-3 text-right font-bold text-white">{t.totalPoints}</td>
                </tr>
              ))}
              {pointsTeams.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                    No teams in this region yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-neutral-400">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">Form</th>
                <th className="px-4 py-3 text-right">Elo</th>
              </tr>
            </thead>
            <tbody>
              {eloTeams.map((t, i) => (
                <tr key={t.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-bold text-neutral-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link href={`/teams/${t.id}`} className="flex items-center gap-2 font-semibold text-white hover:text-red-400">
                      <TeamLogo logoUrl={t.logoUrl} tag={t.tag} size="sm" />
                      {t.name}
                    </Link>
                    <span className="ml-8 text-xs text-neutral-500">{t.tag}</span>
                  </td>
                  <td className="px-4 py-3"><RegionBadge region={t.region} /></td>
                  <td className="px-4 py-3"><FormBadges results={form[t.id] ?? []} /></td>
                  <td className="px-4 py-3 text-right font-bold text-amber-300">{t.elo}</td>
                </tr>
              ))}
              {eloTeams.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                    No teams in this region yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
