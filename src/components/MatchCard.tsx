import Link from "next/link";
import TeamLogo from "./TeamLogo";

export interface MatchCardTeam {
  id: string;
  name: string;
  tag: string;
  logoUrl?: string | null;
}

export default function MatchCard({
  tournamentId,
  tournamentName,
  tournamentLogoUrl,
  roundName,
  teamA,
  teamB,
  teamAScore,
  teamBScore,
  status,
  scheduledAt,
  winnerId,
}: {
  tournamentId: string;
  tournamentName: string;
  tournamentLogoUrl?: string | null;
  roundName: string;
  teamA?: MatchCardTeam | null;
  teamB?: MatchCardTeam | null;
  teamAScore: number;
  teamBScore: number;
  status: string;
  scheduledAt?: string | null;
  winnerId?: string | null;
}) {
  const decided = status === "COMPLETED" && !!winnerId;
  const aWon = decided && winnerId === teamA?.id;
  const bWon = decided && winnerId === teamB?.id;

  const scheduled = scheduledAt ? new Date(scheduledAt) : null;

  return (
    <Link
      href={`/tournaments/${tournamentId}`}
      className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-3 transition hover:border-red-500/40 hover:bg-white/[0.06]"
    >
      <div className="hidden w-36 shrink-0 items-center gap-2 sm:flex">
        <TeamLogo logoUrl={tournamentLogoUrl} tag={tournamentName} size="sm" />
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-neutral-300">{tournamentName}</div>
          <div className="truncate text-[11px] text-neutral-500">{roundName}</div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className={`truncate text-sm ${aWon ? "font-bold text-white" : "font-medium text-neutral-300"}`}>
            {teamA?.name ?? "TBD"}
          </span>
          <TeamLogo logoUrl={teamA?.logoUrl} tag={teamA?.tag ?? "TBD"} size="sm" />
        </div>

        <div className="flex shrink-0 overflow-hidden rounded-md font-mono text-sm font-bold">
          <span
            className={`px-2.5 py-1 ${
              decided ? (aWon ? "bg-emerald-600/80 text-white" : "bg-red-600/40 text-neutral-200") : "bg-white/10 text-neutral-200"
            }`}
          >
            {teamAScore}
          </span>
          <span
            className={`px-2.5 py-1 ${
              decided ? (bWon ? "bg-emerald-600/80 text-white" : "bg-red-600/40 text-neutral-200") : "bg-white/10 text-neutral-200"
            }`}
          >
            {teamBScore}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <TeamLogo logoUrl={teamB?.logoUrl} tag={teamB?.tag ?? "TBD"} size="sm" />
          <span className={`truncate text-sm ${bWon ? "font-bold text-white" : "font-medium text-neutral-300"}`}>
            {teamB?.name ?? "TBD"}
          </span>
        </div>
      </div>

      <div className="w-24 shrink-0 text-right">
        {status === "LIVE" ? (
          <span className="text-xs font-bold text-red-400">LIVE</span>
        ) : status === "COMPLETED" ? (
          <span className="text-xs text-neutral-500">FINAL</span>
        ) : scheduled ? (
          <>
            <div className="text-xs font-semibold text-neutral-300">
              {scheduled.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </div>
            <div className="text-[11px] text-neutral-500">
              {scheduled.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </div>
          </>
        ) : (
          <span className="text-xs text-neutral-500">TBD</span>
        )}
      </div>
    </Link>
  );
}
