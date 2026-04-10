"use client";

import { useState } from "react";
import { uploadAdminImageWithProgress } from "@/lib/api/upload-progress";

type Props = {
  label: string;
  onUploaded: (url: string) => void;
  disabled?: boolean;
};

export function AdminImageFileField({ label, onUploaded, disabled }: Props) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || disabled || busy) return;
    setErr(null);
    setBusy(true);
    setProgress(0);
    try {
      const url = await uploadAdminImageWithProgress(f, setProgress);
      onUploaded(url);
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Upload failed");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }

  return (
    <div className="block text-xs text-ink-muted">
      <span className="block">{label}</span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={disabled || busy}
        className="mt-1 text-sm file:mr-2 file:rounded-full file:border-0 file:bg-sand file:px-3 file:py-1.5 file:text-xs file:font-medium"
        onChange={(ev) => void onChange(ev)}
      />
      {busy ? (
        <div className="mt-2">
          <div className="h-2 overflow-hidden rounded-full bg-sand-deep/40">
            <div
              className="h-full bg-accent transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-ink-muted">Uploading… {progress}%</p>
        </div>
      ) : null}
      {err ? <p className="mt-1 text-rose">{err}</p> : null}
    </div>
  );
}
