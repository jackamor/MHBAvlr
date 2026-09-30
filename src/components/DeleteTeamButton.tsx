"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteTeamButton({ teamId, name }: { teamId: string; name: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/teams/${teamId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/teams");
      router.refresh();
    } else {
      setDeleting(false);
    }
  }

  return (
    <button
      onClick={onDelete}
      disabled={deleting}
      className="rounded-md border border-red-500/30 bg-red-600/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-600 hover:text-white disabled:opacity-40"
    >
      {deleting ? "Deleting…" : "Delete Team"}
    </button>
  );
}
