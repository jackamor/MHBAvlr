import type { FormResult } from "@/lib/form";

export default function FormBadges({ results }: { results: FormResult[] }) {
  if (results.length === 0) {
    return <span className="text-xs text-neutral-600">—</span>;
  }
  return (
    <div className="flex items-center gap-1">
      {results.map((r, i) => (
        <span
          key={i}
          title={r === "W" ? "Win" : "Loss"}
          className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${
            r === "W" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
          }`}
        >
          {r}
        </span>
      ))}
    </div>
  );
}
