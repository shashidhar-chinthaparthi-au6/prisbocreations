"use client";

import { useCallback, useRef, useState } from "react";
import { useAdminToast } from "@/components/admin/layout/AdminShell";

function postAdminCategoryImage(file: File, onProgress: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/uploads");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        onProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText) as {
          ok?: boolean;
          data?: { url: string };
          error?: string;
        };
        if (xhr.status >= 200 && xhr.status < 300 && json.ok && json.data?.url) {
          onProgress(100);
          resolve(json.data.url);
        } else {
          reject(new Error(json.error || `Upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error("Invalid upload response"));
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    const fd = new FormData();
    fd.append("image", file);
    xhr.send(fd);
  });
}

type Props = {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
};

export function AdminCatalogImageField({ label, value, onChange }: Props) {
  const toast = useAdminToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const runUpload = useCallback(
    async (file: File) => {
      setBusy(true);
      setProgress(0);
      try {
        const url = await postAdminCategoryImage(file, setProgress);
        onChange(url);
      } catch (e) {
        toast({
          type: "error",
          message: e instanceof Error ? e.message : "Upload failed",
        });
      } finally {
        setBusy(false);
        setProgress(null);
      }
    },
    [onChange, toast],
  );

  const onPick = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      void runUpload(file);
    },
    [runUpload],
  );

  return (
    <div className="text-sm">
      <span className="text-zinc-600">{label}</span>
      <div className="mt-1">
        {value ?
          <div className="relative w-full overflow-hidden rounded-lg" style={{ aspectRatio: "16 / 9" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white hover:bg-black/80"
              onClick={() => onChange(null)}
              disabled={busy}
            >
              × Remove
            </button>
          </div>
        : <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPick(e.dataTransfer.files);
            }}
            onClick={() => !busy && inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center transition hover:border-zinc-400 hover:bg-zinc-100 ${
              busy ? "pointer-events-none opacity-60" : ""
            }`}
            style={{ aspectRatio: "16 / 9" }}
          >
            <p className="text-sm font-medium text-zinc-700">Click to upload or drag & drop</p>
            <p className="mt-1 text-xs text-zinc-500">
              Recommended: 800×400px · JPG, PNG, WebP · Max 2MB
            </p>
          </div>
        }
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            onPick(e.target.files);
            e.target.value = "";
          }}
        />
        {progress !== null && progress < 100 ?
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full bg-zinc-900 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        : null}
      </div>
    </div>
  );
}
