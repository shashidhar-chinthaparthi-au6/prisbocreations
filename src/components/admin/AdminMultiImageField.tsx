"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteAdminS3ObjectIfManaged,
  isS3PublicConfigured,
  uploadAdminMediaWithProgress,
} from "@/lib/api/upload-progress";
import {
  isAdminUploadableImageFile,
  isAdminUploadableMediaFile,
  isAdminUploadableVideoFile,
  isVideoUrl,
} from "@/lib/media-upload";
import { outputMimeForFile } from "@/lib/canvas-crop";
import { AdminImageCropDialog } from "@/components/admin/AdminImageCropDialog";
import { AdminImageViewDialog } from "@/components/admin/AdminImageViewDialog";
import { adminS3DisplaySrc } from "@/lib/s3-admin-display";

type Props = {
  label: string;
  value: string;
  onChange: (commaSeparated: string) => void;
  disabled?: boolean;
  /** When true, only images (no video) and presign uses image-only rules. */
  imagesOnly?: boolean;
};

function parseUrls(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinUrls(urls: string[]): string {
  return urls.join(", ");
}

type UploadRow = {
  id: string;
  name: string;
  progress: number;
  error?: string;
};

type CropSession = { file: File; src: string };

type EditCropSession = {
  storedUrl: string;
  imageSrc: string;
  fileName: string;
  originalMime: string;
};

function fileNameFromUrl(u: string): string {
  try {
    const path = new URL(u, typeof window !== "undefined" ? window.location.origin : "http://localhost")
      .pathname;
    const seg = path.split("/").filter(Boolean).pop();
    return seg || "image";
  } catch {
    const seg = u.split("/").filter(Boolean).pop();
    return seg?.split("?")[0] || "image";
  }
}

function mimeFromUrl(u: string): string {
  const base = u.split("?")[0].toLowerCase();
  if (base.endsWith(".png")) return "image/png";
  if (base.endsWith(".webp")) return "image/webp";
  if (base.endsWith(".gif")) return "image/gif";
  if (base.endsWith(".webm")) return "video/webm";
  if (base.endsWith(".mov")) return "video/quicktime";
  if (base.endsWith(".mp4")) return "video/mp4";
  return "image/jpeg";
}

export function AdminMultiImageField({
  label,
  value,
  onChange,
  disabled,
  imagesOnly = false,
}: Props) {
  const urls = useMemo(() => parseUrls(value), [value]);
  const valueRef = useRef(value);
  valueRef.current = value;
  const [rows, setRows] = useState<UploadRow[]>([]);
  const s3 = isS3PublicConfigured();
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [editCropSession, setEditCropSession] = useState<EditCropSession | null>(null);
  const [cropBeforeUpload, setCropBeforeUpload] = useState(true);
  const [pendingCrops, setPendingCrops] = useState<File[]>([]);
  const [cropSession, setCropSession] = useState<CropSession | null>(null);

  const removeAt = useCallback(
    async (index: number) => {
      const url = urls[index];
      if (!url) return;
      const next = urls.filter((_, i) => i !== index);
      try {
        await deleteAdminS3ObjectIfManaged(url);
      } catch {
        // Still drop from form if S3 delete fails.
      }
      onChange(joinUrls(next));
    },
    [urls, onChange],
  );

  function revokeSession(s: CropSession | null) {
    if (s?.src) URL.revokeObjectURL(s.src);
  }

  function cancelCropFlow() {
    revokeSession(cropSession);
    setCropSession(null);
    setPendingCrops([]);
  }

  useEffect(() => {
    if (!cropBeforeUpload || cropSession !== null) return;
    if (pendingCrops.length === 0) return;
    const [next, ...rest] = pendingCrops;
    setPendingCrops(rest);
    const src = URL.createObjectURL(next);
    setCropSession({ file: next, src });
  }, [cropBeforeUpload, cropSession, pendingCrops]);

  const uploadOneAppend = useCallback(
    async (file: File, rowId: string) => {
      try {
        const url = await uploadAdminMediaWithProgress(
          file,
          (pct) => {
            setRows((r) => r.map((row) => (row.id === rowId ? { ...row, progress: pct } : row)));
          },
          { imagesOnly },
        );
        const list = parseUrls(valueRef.current);
        const merged = joinUrls([...list, url]);
        valueRef.current = merged;
        onChange(merged);
        setRows((r) => r.filter((row) => row.id !== rowId));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload failed";
        setRows((r) => r.map((row) => (row.id === rowId ? { ...row, error: msg, progress: 0 } : row)));
      }
    },
    [onChange, imagesOnly],
  );

  const uploadReplacingStoredUrl = useCallback(
    async (file: File, rowId: string, oldStoredUrl: string) => {
      try {
        const newUrl = await uploadAdminMediaWithProgress(
          file,
          (pct) => {
            setRows((r) => r.map((row) => (row.id === rowId ? { ...row, progress: pct } : row)));
          },
          { imagesOnly },
        );
        const list = parseUrls(valueRef.current);
        const idx = list.indexOf(oldStoredUrl);
        const next =
          idx === -1 ? [...list, newUrl] : list.map((x, i) => (i === idx ? newUrl : x));
        const merged = joinUrls(next);
        valueRef.current = merged;
        onChange(merged);
        setRows((r) => r.filter((row) => row.id !== rowId));
        try {
          await deleteAdminS3ObjectIfManaged(oldStoredUrl);
        } catch {
          // Old object may already be gone.
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload failed";
        setRows((r) => r.map((row) => (row.id === rowId ? { ...row, error: msg, progress: 0 } : row)));
      }
    },
    [onChange, imagesOnly],
  );

  async function onFilesSelectedDirectArray(list: File[]) {
    if (!list.length || disabled) return;
    const newRows: UploadRow[] = list.map((f, i) => ({
      id: `${Date.now()}-${i}-${f.name}`,
      name: f.name,
      progress: 0,
    }));
    setRows((r) => [...r, ...newRows]);
    for (let i = 0; i < list.length; i++) {
      await uploadOneAppend(list[i], newRows[i].id);
    }
  }

  async function uploadVideosImmediate(videos: File[]) {
    if (!videos.length || disabled) return;
    const base = Date.now();
    const newRows: UploadRow[] = videos.map((f, i) => ({
      id: `v-${base}-${i}-${f.name}`,
      name: f.name,
      progress: 0,
    }));
    setRows((r) => [...r, ...newRows]);
    for (let i = 0; i < videos.length; i++) {
      await uploadOneAppend(videos[i], newRows[i].id);
    }
  }

  function onFileInputChange(files: FileList | null) {
    if (!files?.length || disabled) return;
    const list = Array.from(files);
    if (imagesOnly) {
      const invalid = list.filter((f) => !isAdminUploadableImageFile(f));
      if (invalid.length) {
        const rowId = `bad-${Date.now()}`;
        setRows((r) => [
          ...r,
          {
            id: rowId,
            name: invalid[0].name,
            progress: 0,
            error: "Unsupported type — use JPEG, PNG, WebP, or GIF.",
          },
        ]);
      }
      const imgs = list.filter((f) => isAdminUploadableImageFile(f));
      if (cropBeforeUpload) {
        setPendingCrops((p) => [...p, ...imgs]);
      } else {
        void onFilesSelectedDirectArray(imgs);
      }
      return;
    }
    const invalid = list.filter((f) => !isAdminUploadableMediaFile(f));
    if (invalid.length) {
      const rowId = `bad-${Date.now()}`;
      setRows((r) => [
        ...r,
        {
          id: rowId,
          name: invalid[0].name,
          progress: 0,
          error: "Unsupported type — use images (JPEG, PNG, WebP, GIF) or video (MP4, WebM, MOV).",
        },
      ]);
    }
    const valid = list.filter((f) => isAdminUploadableMediaFile(f));
    const videos = valid.filter((f) => isAdminUploadableVideoFile(f));
    const imgs = valid.filter((f) => isAdminUploadableImageFile(f));

    void uploadVideosImmediate(videos);

    if (cropBeforeUpload) {
      setPendingCrops((p) => [...p, ...imgs]);
    } else {
      void onFilesSelectedDirectArray(imgs);
    }
  }

  async function onCroppedBlob(blob: Blob, baseName: string, session: CropSession) {
    const { mime } = outputMimeForFile(session.file.type);
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const file = new File([blob], `cropped-${baseName}.${ext}`, { type: mime });
    revokeSession(session);
    setCropSession(null);

    const rowId = `crop-${Date.now()}-${file.name}`;
    setRows((r) => [...r, { id: rowId, name: file.name, progress: 0 }]);
    await uploadOneAppend(file, rowId);
  }

  async function onEditCroppedBlob(blob: Blob, baseName: string) {
    if (!editCropSession) return;
    const sess = editCropSession;
    const { mime } = outputMimeForFile(sess.originalMime);
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const file = new File([blob], `edited-${baseName}.${ext}`, { type: mime });
    setEditCropSession(null);
    const rowId = `edit-${Date.now()}`;
    setRows((r) => [...r, { id: rowId, name: file.name, progress: 0 }]);
    await uploadReplacingStoredUrl(file, rowId, sess.storedUrl);
  }

  function dismissFailed(id: string) {
    setRows((r) => r.filter((row) => row.id !== id));
  }

  return (
    <div className="space-y-3 text-xs text-ink-muted">
      <span className="block font-medium text-ink">{label}</span>
      {s3 ? (
        <p className="text-[11px] text-ink-muted">
          Uploads go to S3 via presigned URLs. If thumbnails look broken, add a bucket policy so{" "}
          <code className="rounded bg-sand px-1">uploads/*</code> is publicly readable (or use CloudFront).
        </p>
      ) : (
        <p className="text-[11px] text-ink-muted">
          Files upload to the app server (local <code className="rounded bg-sand px-1">/uploads</code>).
        </p>
      )}
      {imagesOnly ? (
        <p className="text-[11px] text-ink-muted">Images up to 5&nbsp;MB (JPEG, PNG, WebP, GIF).</p>
      ) : (
        <p className="text-[11px] text-ink-muted">
          Images up to 5&nbsp;MB; video (MP4, WebM, MOV) up to 100&nbsp;MB. Videos upload without cropping.
        </p>
      )}

      <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={cropBeforeUpload}
          disabled={disabled}
          onChange={(e) => {
            setCropBeforeUpload(e.target.checked);
            if (!e.target.checked) cancelCropFlow();
          }}
          className="rounded border-sand-deep accent-accent"
        />
        {imagesOnly ? "Crop images before upload" : "Crop images before upload (videos upload as-is)"}
      </label>

      <input
        type="file"
        accept={
          imagesOnly
            ? "image/jpeg,image/png,image/webp,image/gif"
            : "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
        }
        multiple
        disabled={disabled}
        className="text-sm file:mr-2 file:rounded-full file:border-0 file:bg-sand file:px-3 file:py-1.5 file:text-xs file:font-medium"
        onChange={(e) => {
          onFileInputChange(e.target.files);
          e.target.value = "";
        }}
      />

      {cropSession ? (
        <AdminImageCropDialog
          imageSrc={cropSession.src}
          fileName={cropSession.file.name}
          originalMime={cropSession.file.type}
          onCancel={cancelCropFlow}
          onCropped={(blob, base) => void onCroppedBlob(blob, base, cropSession)}
        />
      ) : editCropSession ? (
        <AdminImageCropDialog
          imageSrc={editCropSession.imageSrc}
          fileName={editCropSession.fileName}
          originalMime={editCropSession.originalMime}
          onCancel={() => setEditCropSession(null)}
          onCropped={(blob, base) => void onEditCroppedBlob(blob, base)}
          title="Edit image"
          submitLabel="Upload cropped & replace"
        />
      ) : null}

      {viewUrl ? (
        <AdminImageViewDialog
          url={viewUrl}
          onClose={() => setViewUrl(null)}
          onEdit={
            isVideoUrl(viewUrl)
              ? undefined
              : () => {
                  const u = viewUrl;
                  setViewUrl(null);
                  setEditCropSession({
                    storedUrl: u,
                    imageSrc: adminS3DisplaySrc(u),
                    fileName: fileNameFromUrl(u),
                    originalMime: mimeFromUrl(u),
                  });
                }
          }
          editDisabled={disabled}
        />
      ) : null}

      {rows.length > 0 ? (
        <ul className="space-y-2 rounded-lg border border-sand-deep bg-sand/30 p-3 text-sm">
          {rows.map((row) => (
            <li key={row.id} className="text-ink">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-medium">{row.name}</span>
                {row.error ? (
                  <button
                    type="button"
                    className="shrink-0 text-xs text-rose hover:underline"
                    onClick={() => dismissFailed(row.id)}
                  >
                    Dismiss
                  </button>
                ) : null}
              </div>
              {row.error ? (
                <p className="mt-1 text-xs text-rose">{row.error}</p>
              ) : (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-sand-deep/40">
                  <div
                    className="h-full bg-accent transition-[width] duration-150"
                    style={{ width: `${row.progress}%` }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {urls.length > 0 ? (
        <ul className="space-y-2">
          {urls.map((url, i) => (
            <li
              key={`${url}-${i}`}
              className="flex items-center gap-3 rounded-lg border border-sand-deep bg-white p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <button
                type="button"
                className="shrink-0 rounded-md border border-sand-deep focus:outline-none focus:ring-2 focus:ring-accent"
                onClick={() => setViewUrl(url)}
                title="View"
                aria-label="View"
              >
                {isVideoUrl(url) ? (
                  <video
                    src={adminS3DisplaySrc(url)}
                    className="h-14 w-14 object-cover"
                    muted
                    playsInline
                    preload="metadata"
                    aria-hidden
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={adminS3DisplaySrc(url)}
                    alt=""
                    className="h-14 w-14 object-cover"
                    loading="lazy"
                  />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[11px] text-ink-muted">{url}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  <button
                    type="button"
                    className="text-xs font-medium text-accent hover:underline"
                    onClick={() => setViewUrl(url)}
                  >
                    View
                  </button>
                  {!isVideoUrl(url) ? (
                    <button
                      type="button"
                      disabled={disabled}
                      className="text-xs font-medium text-accent hover:underline disabled:opacity-50"
                      onClick={() => {
                        setViewUrl(null);
                        setEditCropSession({
                          storedUrl: url,
                          imageSrc: adminS3DisplaySrc(url),
                          fileName: fileNameFromUrl(url),
                          originalMime: mimeFromUrl(url),
                        });
                      }}
                    >
                      Edit
                    </button>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                disabled={disabled}
                className="shrink-0 text-xs font-medium text-rose hover:underline disabled:opacity-50"
                onClick={() => void removeAt(i)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
