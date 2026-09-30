const TITLE_META: Record<string, { icon: string; label: string; glow: string }> = {
  WORLDS: { icon: "🏆", label: "World Champion", glow: "drop-shadow-[0_0_4px_rgba(251,191,36,0.85)]" },
  MSI: { icon: "⭐", label: "MSI Champion", glow: "drop-shadow-[0_0_4px_rgba(56,189,248,0.85)]" },
  MHBA: { icon: "⭐", label: "MHBA Champion", glow: "drop-shadow-[0_0_4px_rgba(167,139,250,0.85)]" },
  APAC_CHAMPION: { icon: "🌏", label: "APAC Champion", glow: "drop-shadow-[0_0_4px_rgba(52,211,153,0.85)]" },
  AMERICAS_CHAMPION: { icon: "🌎", label: "Americas Champion", glow: "drop-shadow-[0_0_4px_rgba(96,165,250,0.85)]" },
  CHINA_CHAMPION: { icon: "🐉", label: "China Champion", glow: "drop-shadow-[0_0_4px_rgba(248,113,113,0.85)]" },
  EUROPE_CHAMPION: { icon: "🌍", label: "Europe Champion", glow: "drop-shadow-[0_0_4px_rgba(192,132,252,0.85)]" },
  POINTS_CHAMPION: { icon: "💠", label: "Points Champion", glow: "drop-shadow-[0_0_4px_rgba(45,212,191,0.85)]" },
};

const SIZE_CLASSES: Record<string, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export default function ChampionshipStars({
  championships,
  size = "sm",
}: {
  championships: { title: string; year?: number | null }[];
  size?: "sm" | "md" | "lg";
}) {
  if (!championships || championships.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1">
      {championships.map((c, i) => {
        const meta = TITLE_META[c.title] ?? { icon: "⭐", label: c.title, glow: "" };
        return (
          <span
            key={i}
            title={`${meta.label}${c.year ? ` (${c.year})` : ""}`}
            className={`${SIZE_CLASSES[size]} ${meta.glow} inline-block leading-none transition-transform hover:scale-125`}
          >
            {meta.icon}
          </span>
        );
      })}
    </span>
  );
}
