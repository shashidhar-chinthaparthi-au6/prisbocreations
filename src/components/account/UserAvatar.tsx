"use client";

import { useEffect, useState } from "react";

type Props = {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Increment after saving a new photo so the browser refetches instead of showing a stale image. */
  imageReloadToken?: number;
  /**
   * Load via same-origin `/api/v1/auth/me/profile-image` (server reads S3). Use for the signed-in
   * user's own avatar so private buckets still display after upload.
   */
  preferProfileImageApi?: boolean;
};

const sizeClass = {
  sm: "h-9 w-9 text-sm",
  md: "h-11 w-11 text-base",
  lg: "h-16 w-16 text-xl",
} as const;

function initialFromName(name: string) {
  const t = name.trim();
  if (!t) return "?";
  const ch = t[0];
  return ch && /[a-z]/i.test(ch) ? ch.toUpperCase() : "?";
}

export function UserAvatar({
  name,
  imageUrl,
  size = "md",
  className = "",
  imageReloadToken,
  preferProfileImageApi,
}: Props) {
  const trimmed = (imageUrl ?? "").trim();
  const isRemoteHttp = /^https?:\/\//i.test(trimmed);
  const hasStoredUrl = trimmed.length > 0;
  const useApiSrc = preferProfileImageApi === true && hasStoredUrl;
  const [loadFailed, setLoadFailed] = useState(false);

  const rv = imageReloadToken != null && imageReloadToken > 0 ? imageReloadToken : 0;
  const cacheBustRemote =
    imageReloadToken != null && imageReloadToken > 0
      ? `${trimmed.includes("?") ? "&" : "?"}_rv=${imageReloadToken}`
      : "";
  const imgSrc = useApiSrc
    ? `/api/v1/auth/me/profile-image?_rv=${rv}`
    : isRemoteHttp
      ? `${trimmed}${cacheBustRemote}`
      : "";

  useEffect(() => {
    setLoadFailed(false);
  }, [trimmed, imageReloadToken, useApiSrc]);

  const showPhoto = (useApiSrc || isRemoteHttp) && !loadFailed && imgSrc;

  if (showPhoto) {
    return (
      <span
        className={`relative inline-flex shrink-0 overflow-hidden rounded-full border border-sand-deep/80 bg-white ring-2 ring-white/80 ${sizeClass[size]} ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- same-origin API or remote S3 */}
        <img
          src={imgSrc}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setLoadFailed(true)}
        />
      </span>
    );
  }

  const letter = initialFromName(name);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-sand-deep/80 bg-gradient-to-br from-accent/90 to-accent font-display font-bold text-white shadow-sm ring-2 ring-white/80 ${sizeClass[size]} ${className}`}
      aria-hidden={!name.trim()}
    >
      {letter}
    </span>
  );
}
