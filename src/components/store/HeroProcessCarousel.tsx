"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  urls: string[];
  /**
   * Looped background video (MP4/WebM/MOV or signed CDN URL without extension).
   * When present and loading succeeds, stills are hidden so motion is visible.
   */
  videoUrl?: string | null;
};

/**
 * Hero: optional full-bleed video, otherwise rotating stills from catalog imagery.
 */
export function HeroProcessCarousel({ urls, videoUrl }: Props) {
  const slides = urls.slice(0, 5);
  const [i, setI] = useState(0);
  const [videoBroken, setVideoBroken] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const video = typeof videoUrl === "string" ? videoUrl.trim() : "";
  const hasVideoSrc = video.length > 0;
  const useVideo = hasVideoSrc && !videoBroken;

  useEffect(() => {
    setVideoBroken(false);
  }, [video]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % slides.length), 5200);
    return () => window.clearInterval(t);
  }, [slides.length]);

  useEffect(() => {
    if (!useVideo) return;
    const el = videoRef.current;
    if (!el) return;
    void el.play().catch(() => {
      setVideoBroken(true);
    });
  }, [useVideo, video]);

  if (slides.length === 0 && !hasVideoSrc) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-lg md:rounded-xl"
      aria-hidden
    >
      {useVideo ? (
        <video
          ref={videoRef}
          key={video}
          src={video}
          className="absolute inset-0 h-full w-full object-cover opacity-100"
          muted
          playsInline
          autoPlay
          loop
          preload="auto"
          onError={() => setVideoBroken(true)}
          aria-hidden
        />
      ) : null}
      {!useVideo
        ? slides.map((url, idx) => (
            // eslint-disable-next-line @next/next/no-img-element -- CDN URLs
            <img
              key={url}
              src={url}
              alt=""
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-out ${
                idx === i ? "opacity-[0.38]" : "opacity-0"
              }`}
              loading={idx === 0 ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={idx === 0 ? "high" : "low"}
            />
          ))
        : null}
      <div
        className={
          useVideo
            ? "absolute inset-0 bg-gradient-to-l from-transparent via-black/10 to-black/35"
            : "absolute inset-0 bg-gradient-to-l from-transparent via-black/25 to-black/55"
        }
      />
    </div>
  );
}
