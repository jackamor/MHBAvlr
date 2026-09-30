import Link from "next/link";
import RegionBadge from "./RegionBadge";
import TeamLogo from "./TeamLogo";
import ChampionshipStars from "./ChampionshipStars";

export default function TeamCard({
  id,
  name,
  tag,
  region,
  points,
  logoUrl,
  championships,
}: {
  id: string;
  name: string;
  tag: string;
  region: string;
  points?: number;
  logoUrl?: string | null;
  championships?: { title: string; year?: number | null }[];
}) {
  return (
    <Link
      href={`/teams/${id}`}
      className="group flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-red-500/40 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-black/30"
    >
      <div className="flex items-center gap-3">
        <TeamLogo logoUrl={logoUrl} tag={tag} />
        <div>
          <div className="flex items-center gap-1.5 font-semibold text-white group-hover:text-red-400">
            {name}
            {championships && <ChampionshipStars championships={championships} />}
          </div>
          <RegionBadge region={region} />
        </div>
      </div>
      {typeof points === "number" && (
        <div className="text-right">
          <div className="text-lg font-bold text-white">{points}</div>
          <div className="text-xs text-neutral-400">points</div>
        </div>
      )}
    </Link>
  );
}
