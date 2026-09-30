"use client";

import { useRef, useState } from "react";
import TeamLogo from "./TeamLogo";

export default function TournamentLogoEditor({
  tournamentId,
  name,
  logoUrl,
  onSaved,
}: {
  tournamentId: string;
  name: string;
  logoUrl?: string | null;
  onSaved: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null | undefined>(logoUrl);
  const [uploading, setUploading] = useState(false);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
    if (!uploadRes.ok) {
      setUploading(false);
      return;
    }
    const { url } = await uploadRes.json();

    const res = await fetch(`/api/tournaments/${tournamentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logoUrl: url }),
    });
    setUploading(false);
    if (res.ok) {
      setPreview(url);
      onSaved();
    }
  }

  return (
    <div className="group relative shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative block"
        title="Set tournament logo"
      >
        <TeamLogo logoUrl={preview} tag={name} size="lg" />
        <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
          {uploading ? "Uploading…" : "Set logo"}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  );
}
