export default function TeamLogo({
  logoUrl,
  tag,
  size = "md",
}: {
  logoUrl?: string | null;
  tag: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims = size === "sm" ? "h-6 w-6 text-[10px]" : size === "lg" ? "h-16 w-16 text-xl" : "h-10 w-10 text-sm";

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`${tag} logo`}
        className={`${dims} shrink-0 rounded-md object-cover bg-white/5`}
      />
    );
  }

  return (
    <div className={`flex ${dims} shrink-0 items-center justify-center rounded-md bg-white/10 font-bold text-white`}>
      {tag.slice(0, 3)}
    </div>
  );
}
