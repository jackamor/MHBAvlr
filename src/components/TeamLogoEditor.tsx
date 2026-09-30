"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import TeamLogo from "./TeamLogo";

export default function TeamLogoEditor({
  teamId,
  tag,
  logoUrl,
}: {
  teamId: string;
  tag: string;
  logoUrl?: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null | undefined>(logoUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
    if (!uploadRes.ok) {
      const data = await uploadRes.json();
      setError(data.error ?? "Upload failed");
      setUploading(false);
      return;
    }
    const { url } = await uploadRes.json();

    const teamRes = await fetch(`/api/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logoUrl: url }),
    });
    setUploading(false);
    if (teamRes.ok) {
      setPreview(url);
      router.refresh();
    } else {
      setError("Failed to save logo");
    }
  }

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative block"
        title="Change logo"
      >
        <TeamLogo logoUrl={preview} tag={tag} size="lg" />
        <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
          {uploading ? "Uploading…" : "Change"}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        className="hidden"
        onChange={onFileChange}
      />
      {error && <p className="mt-1 max-w-[8rem] text-xs text-red-400">{error}</p>}
    </div>
  );
}
