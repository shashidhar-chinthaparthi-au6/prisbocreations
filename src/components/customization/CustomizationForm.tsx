"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CustomizationDataMap,
  CustomizationFieldDef,
  CustomizationFilesMap,
  CustomizationFileMeta,
} from "@/lib/customization-types";
import { Spinner } from "@/components/ui/Spinner";

const ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
const MAX_BYTES = 10 * 1024 * 1024;

async function postCustomizationUpload(file: File): Promise<CustomizationFileMeta & { url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/uploads/customization", {
    method: "POST",
    body: fd,
  });
  const j = (await res.json()) as {
    ok?: boolean;
    error?: string;
    data?: { url: string; fileId: string; filename: string };
  };
  if (!res.ok || !j.ok || !j.data?.url || !j.data.fileId) {
    throw new Error(j.error || "Upload failed");
  }
  return {
    url: j.data.url,
    fileId: j.data.fileId,
    filename: j.data.filename || file.name || "image",
  };
}

function SpotifyGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#1DB954" />
      <path
        fill="#121212"
        d="M17.05 16.2c-.25.15-.55.08-.75-.15-1.55-1.85-4.25-2.3-7.1-1.25-.3.1-.6-.05-.7-.35-.1-.3.05-.6.35-.7 3.25-1.15 6.35-.65 8.2 1.5.2.25.15.55-.1.75zm.95-2.1c-.3.35-.85.45-1.2.15-1.85-1.5-4.65-1.95-8.05-1.05-.45.1-.9-.15-1-.6-.1-.45.15-.9.6-1 3.85-.95 7.15-.5 9.35 1.35.35.3.4.85.1 1.2zM6.3 9.75c-.5-.15-1.05.1-1.2.6-.15.5.1 1.05.6 1.2 4.35 1.3 9.15.7 12.25-1.55.45-.3.55-.9.25-1.35-.3-.45-.9-.55-1.35-.25-2.7 2-6.95 2.55-10.55 1.35z"
      />
    </svg>
  );
}

type Props = {
  fields: CustomizationFieldDef[];
  data: CustomizationDataMap;
  files: CustomizationFilesMap;
  onChange: (next: { data: CustomizationDataMap; files: CustomizationFilesMap }) => void;
  /** When set, scroll to this field and show error styling + shake */
  invalidFieldKey?: string | null;
  /** Disables inputs (e.g. while adding to cart) */
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
};

export function CustomizationForm({
  fields,
  data,
  files,
  onChange,
  invalidFieldKey,
  disabled,
  onUploadingChange,
}: Props) {
  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!invalidFieldKey) return;
    const el = fieldRefs.current[invalidFieldKey];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [invalidFieldKey]);

  const setData = useCallback(
    (patch: CustomizationDataMap) => {
      onChange({ data: { ...data, ...patch }, files: { ...files } });
    },
    [data, files, onChange],
  );

  const setFiles = useCallback(
    (patch: CustomizationFilesMap) => {
      onChange({ data: { ...data }, files: { ...files, ...patch } });
    },
    [data, files, onChange],
  );

  const onPickImage = async (field: CustomizationFieldDef, fileList: FileList | File[] | null) => {
    if (!fileList || disabled) return;
    const arr = Array.from(fileList);
    const maxFiles = field.maxFiles ?? (field.multiple ? 16 : 1);
    const existing = files[field.key];
    const existingCount = Array.isArray(existing) ? existing.length : existing ? 1 : 0;
    const room = maxFiles - existingCount;
    if (room <= 0) return;
    const toUpload = arr.slice(0, room);
    setUploadingKey(field.key);
    onUploadingChange?.(true);
    try {
      const uploaded: CustomizationFileMeta[] = [];
      for (const file of toUpload) {
        if (!file.type || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          throw new Error("Use JPG, PNG, or WebP");
        }
        if (file.size > MAX_BYTES) throw new Error("Each file must be 10 MB or smaller");
        uploaded.push(await postCustomizationUpload(file));
      }
      if (!uploaded.length) return;
      if (field.multiple) {
        const prev = files[field.key];
        const list: CustomizationFileMeta[] = Array.isArray(prev)
          ? [...prev, ...uploaded]
          : prev
            ? [prev, ...uploaded]
            : uploaded;
        setFiles({ [field.key]: list });
      } else {
        setFiles({ [field.key]: uploaded[0]! });
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingKey(null);
      onUploadingChange?.(false);
    }
  };

  const removeImage = (field: CustomizationFieldDef, index?: number) => {
    const v = files[field.key];
    if (field.multiple && Array.isArray(v) && typeof index === "number") {
      const next = v.filter((_, i) => i !== index);
      const patch: CustomizationFilesMap = { ...files };
      if (next.length) patch[field.key] = next;
      else delete patch[field.key];
      onChange({ data: { ...data }, files: patch });
    } else {
      const patch: CustomizationFilesMap = { ...files };
      delete patch[field.key];
      onChange({ data: { ...data }, files: patch });
    }
  };

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const err = invalidFieldKey === field.key;
        const shell = `rounded-lg border bg-white px-3 py-2.5 transition ${
          err ? "border-rose-500 ring-1 ring-rose-400 animate-shake" : "border-[#E8E0D6]"
        }`;

        if (field.type === "image") {
          const v = files[field.key];
          const list: CustomizationFileMeta[] = Array.isArray(v) ? v : v ? [v] : [];
          const maxFiles = field.maxFiles ?? (field.multiple ? 16 : 1);
          const busy = uploadingKey === field.key;

          return (
            <div key={field.key} ref={(el) => void (fieldRefs.current[field.key] = el)} className="space-y-1.5">
              <label className="block text-[13px] font-medium text-[#3D3835]">
                {field.label}
                {field.required ? <span className="text-rose-600"> *</span> : null}
              </label>
              <div
                className={`flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#C4B8A8] bg-white/80 px-3 py-4 text-center transition hover:border-[#C47A2B]/60 ${
                  err ? "border-rose-500 ring-1 ring-rose-400 animate-shake" : ""
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void onPickImage(field, e.dataTransfer.files);
                }}
              >
                <input
                  type="file"
                  accept={ACCEPT}
                  multiple={field.multiple === true}
                  disabled={disabled || busy || list.length >= maxFiles}
                  className="hidden"
                  id={`cf-${field.key}`}
                  onChange={(e) => void onPickImage(field, e.target.files)}
                />
                <label htmlFor={`cf-${field.key}`} className="cursor-pointer text-sm text-[#6B6560]">
                  {busy ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner size="sm" /> Uploading…
                    </span>
                  ) : (
                    <>Click to upload or drag &amp; drop</>
                  )}
                </label>
                <p className="mt-1 text-[11px] text-[#6B6560]">JPG, PNG, WebP · max 10 MB each</p>
              </div>
              {field.hint ? <p className="text-[11px] text-[#6B6560]">{field.hint}</p> : null}
              {field.required && list.length === 0 ? (
                <p className="text-xs text-rose-600">Please upload your photo to continue</p>
              ) : null}
              {list.length > 0 ? (
                <ul className="space-y-2">
                  {list.map((m, i) => (
                    <li
                      key={`${m.fileId}-${i}`}
                      className="flex items-center gap-2 rounded-md border border-[#E8E0D6] bg-white px-2 py-1.5 text-xs"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.url} alt="" className="h-10 w-10 rounded object-cover" />
                      <span className="min-w-0 flex-1 truncate text-[#3D3835]">{m.filename}</span>
                      <span className="text-emerald-700">✓ Uploaded</span>
                      <button
                        type="button"
                        disabled={disabled}
                        className="text-rose-600 hover:underline disabled:opacity-50"
                        onClick={() => removeImage(field, field.multiple ? i : undefined)}
                      >
                        × Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        }

        if (field.type === "textarea") {
          const val = typeof data[field.key] === "string" ? (data[field.key] as string) : "";
          const max = field.maxChars ?? 2000;
          return (
            <div key={field.key} ref={(el) => void (fieldRefs.current[field.key] = el)} className="space-y-1">
              <label className="block text-[13px] font-medium text-[#3D3835]">
                {field.label}
                {field.required ? <span className="text-rose-600"> *</span> : null}
              </label>
              <textarea
                rows={3}
                disabled={disabled}
                maxLength={max}
                value={val}
                onChange={(e) => setData({ [field.key]: e.target.value })}
                className={shell + " w-full text-sm text-[#3D3835]"}
              />
              <p className="text-right text-[11px] text-[#6B6560]">
                {val.length} / {max}
              </p>
              {field.hint ? <p className="text-[11px] text-[#6B6560]">{field.hint}</p> : null}
            </div>
          );
        }

        if (field.type === "select") {
          const val = typeof data[field.key] === "string" ? (data[field.key] as string) : "";
          return (
            <div key={field.key} ref={(el) => void (fieldRefs.current[field.key] = el)} className="space-y-1">
              <label className="block text-[13px] font-medium text-[#3D3835]">
                {field.label}
                {field.required ? <span className="text-rose-600"> *</span> : null}
              </label>
              <select
                disabled={disabled}
                value={val}
                onChange={(e) => setData({ [field.key]: e.target.value })}
                className={shell + " w-full text-sm text-[#3D3835]"}
              >
                {!field.required ? <option value="">—</option> : null}
                {(field.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        if (field.type === "boolean") {
          const on = data[field.key] === true;
          return (
            <div
              key={field.key}
              ref={(el) => void (fieldRefs.current[field.key] = el)}
              className="flex items-center justify-between gap-3 rounded-lg border border-[#E8E0D6] bg-white px-3 py-2.5"
            >
              <span className="text-[13px] font-medium text-[#3D3835]">{field.label}</span>
              <button
                type="button"
                disabled={disabled}
                role="switch"
                aria-checked={on}
                onClick={() => setData({ [field.key]: !on })}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                  on ? "bg-[#C47A2B]" : "bg-[#D4C4B0]"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                    on ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          );
        }

        if (field.type === "url") {
          const val = typeof data[field.key] === "string" ? (data[field.key] as string) : "";
          const spotify = field.key === "spotify_url";
          return (
            <div key={field.key} ref={(el) => void (fieldRefs.current[field.key] = el)} className="space-y-1">
              <label className="block text-[13px] font-medium text-[#3D3835]">
                {field.label}
                {field.required ? <span className="text-rose-600"> *</span> : null}
              </label>
              <div className="relative">
                {spotify ? (
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                    <SpotifyGlyph />
                  </span>
                ) : null}
                <input
                  type="url"
                  disabled={disabled}
                  placeholder="Paste link here…"
                  value={val}
                  onChange={(e) => setData({ [field.key]: e.target.value })}
                  className={`${shell} w-full text-sm text-[#3D3835] ${spotify ? "pl-10" : ""}`}
                />
              </div>
              {spotify ? (
                <p className="text-[11px] text-[#6B6560]">
                  Open Spotify → tap song → ··· → Share → Copy link
                </p>
              ) : null}
              {field.hint && !spotify ? <p className="text-[11px] text-[#6B6560]">{field.hint}</p> : null}
            </div>
          );
        }

        const val = typeof data[field.key] === "string" ? (data[field.key] as string) : "";
        const max = field.maxChars;
        return (
          <div key={field.key} ref={(el) => void (fieldRefs.current[field.key] = el)} className="space-y-1">
            <label className="block text-[13px] font-medium text-[#3D3835]">
              {field.label}
              {field.required ? <span className="text-rose-600"> *</span> : null}
            </label>
            <input
              type="text"
              disabled={disabled}
              maxLength={max}
              value={val}
              onChange={(e) => setData({ [field.key]: e.target.value })}
              className={shell + " w-full text-sm text-[#3D3835]"}
            />
            {max ? (
              <p className="text-right text-[11px] text-[#6B6560]">
                {val.length} / {max}
              </p>
            ) : null}
            {field.hint ? <p className="text-[11px] text-[#6B6560]">{field.hint}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
