const REGION_STYLES: Record<string, string> = {
  AMERICAS: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  EUROPE: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  CHINA: "bg-red-500/15 text-red-300 border-red-500/30",
  APAC: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

const REGION_LABELS: Record<string, string> = {
  AMERICAS: "Americas",
  EUROPE: "Europe",
  CHINA: "China",
  APAC: "APAC",
};

export default function RegionBadge({ region }: { region: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
        REGION_STYLES[region] ?? "bg-white/10 text-neutral-300 border-white/20"
      }`}
    >
      {REGION_LABELS[region] ?? region}
    </span>
  );
}
