"use client";

import { useRouter } from "next/navigation";

export default function DeleteTournamentButton({ tournamentId, name }: { tournamentId: string; name: string }) {
  const router = useRouter();

  async function onDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm(`Delete "${name}"? This removes all its matches and cannot be undone.`)) return;
    await fetch(`/api/tournaments/${tournamentId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <button
      onClick={onDelete}
      title="Delete tournament"
      className="absolute right-2 top-2 hidden rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-red-300 opacity-0 backdrop-blur transition hover:bg-red-600 hover:text-white group-hover:block group-hover:opacity-100"
    >
      Delete
    </button>
  );
}
