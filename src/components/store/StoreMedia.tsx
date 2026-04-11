"use client";

import Image from "next/image";
import { isVideoUrl } from "@/lib/media-upload";

/** Absolute http(s) URLs are not passed through `next/image` so unknown CDNs/S3 hosts never SSR-crash. */
function isRemoteHttpImageSrc(src: string): boolean {
  return /^https?:\/\//i.test(src) || src.startsWith("//");
}

type Props = {
  src: string;
  alt: string;
  /** Tailwind / classes for non-fill layout */
  className?: string;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  /** For video URLs: show native controls (e.g. off for tiny cart/list thumbs). Default true. */
  videoControls?: boolean;
  /** Image decoded / video first frame ready */
  onMediaReady?: () => void;
  onMediaError?: () => void;
};

/** Renders product media: `<video>` for MP4/WebM/MOV URLs, else Next/Image. */
export function StoreMedia({
  src,
  alt,
  className,
  fill,
  sizes,
  priority,
  videoControls = true,
  onMediaReady,
  onMediaError,
}: Props) {
  if (isVideoUrl(src)) {
    if (fill) {
      return (
        <video
          src={src}
          className={`absolute inset-0 h-full w-full object-cover ${className ?? ""}`}
          controls={videoControls}
          muted={!videoControls}
          playsInline
          preload="metadata"
          aria-label={alt}
          onLoadedData={onMediaReady}
          onError={onMediaError}
        />
      );
    }
    return (
      <video
        src={src}
        className={className}
        controls={videoControls}
        muted={!videoControls}
        playsInline
        preload="metadata"
        aria-label={alt}
        onLoadedData={onMediaReady}
        onError={onMediaError}
      />
    );
  }

  if (isRemoteHttpImageSrc(src)) {
    if (fill) {
      return (
        // eslint-disable-next-line @next/next/no-img-element -- intentional: any admin-configured CDN host
        <img
          src={src}
          alt={alt}
          className={`absolute inset-0 h-full w-full object-cover ${className ?? ""}`}
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={onMediaReady}
          onError={onMediaError}
        />
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={800}
        height={800}
        className={className ?? "object-cover"}
        sizes={sizes}
        loading="lazy"
        decoding="async"
        onLoad={onMediaReady}
        onError={onMediaError}
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className ?? "object-cover"}
        sizes={sizes}
        priority={priority}
        onLoad={onMediaReady}
        onError={onMediaError}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={800}
      className={className ?? "object-cover"}
      sizes={sizes}
      onLoad={onMediaReady}
      onError={onMediaError}
    />
  );
}
