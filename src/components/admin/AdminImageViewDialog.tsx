"use client";

import { isVideoUrl } from "@/lib/media-upload";
import { adminS3DisplaySrc } from "@/lib/s3-admin-display";

type Props = {
  url: string;
  onClose: () => void;
  /** Opens crop editor for images only (re-upload replaces the stored URL). */
  onEdit?: () => void;
  editDisabled?: boolean;
};

export function AdminImageViewDialog({ url, onClose, onEdit, editDisabled }: Props) {
  const displaySrc = adminS3DisplaySrc(url);
  const video = isVideoUrl(url);
  const showEdit = Boolean(onEdit) && !video;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="relative max-h-[92vh] max-w-[min(96vw,56rem)] rounded-2xl border border-white/20 bg-ink p-3 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <a
            href={displaySrc}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-xs text-white/80 underline decoration-white/40 hover:text-white"
          >
            Open in new tab
          </a>
          <div className="flex flex-wrap items-center gap-2">
            {showEdit ? (
              <button
                type="button"
                disabled={editDisabled}
                className="rounded-full bg-accent px-3 py-1 text-sm font-semibold text-ink hover:bg-accent-light disabled:opacity-50"
                onClick={() => {
                  onEdit?.();
                }}
              >
                Edit
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-full bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
        {video ? (
          <video
            src={displaySrc}
            controls
            playsInline
            className="max-h-[min(80vh,720px)] w-full max-w-full rounded-lg"
            preload="metadata"
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={displaySrc}
            alt="Preview"
            className="max-h-[min(80vh,720px)] w-auto max-w-full rounded-lg object-contain"
          />
        )}
      </div>
    </div>
  );
}
