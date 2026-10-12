"use client";

import { useEffect, useState } from "react";
import { composePrint, type DesignKind, type PrintZone } from "@/lib/studio/composePrint";

export function PrintPreview({
  baseUrl,
  zone,
  kind,
  placeholder,
  text,
  imageUrl,
}: {
  baseUrl: string;
  zone: PrintZone;
  kind: DesignKind;
  placeholder: string;
  text: string;
  imageUrl: string;
}) {
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");

  useEffect(() => {
    let dead = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const plain = await composePrint({ baseUrl, zone, placeholder, text: "", kind, mode: "before" });
          const printed = await composePrint({
            baseUrl,
            zone,
            placeholder,
            text: kind === "image" ? "" : text,
            imageUrl: kind === "text" ? "" : imageUrl,
            kind,
            mode: "after",
          });
          if (dead) return;
          setBefore(plain.toDataURL("image/jpeg", 0.82));
          setAfter(printed.toDataURL("image/jpeg", 0.82));
        } catch {
          if (!dead) {
            setBefore("");
            setAfter("");
          }
        }
      })();
    }, 120);
    return () => {
      dead = true;
      window.clearTimeout(timer);
    };
  }, [baseUrl, zone, kind, placeholder, text, imageUrl]);

  if (!before) return null;

  return (
    <div
      className="relative isolate aspect-video w-full overflow-hidden bg-[#f3eee6]"
      role="img"
      aria-label="Your design wiping into the text or photo that will be printed."
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={before} alt="Your design" className="absolute inset-0 h-full w-full object-cover" />
      {after ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={after} alt="How it looks after printing" className="print-pair absolute inset-0 h-full w-full object-cover" />
      ) : null}
      <style>{`
        @keyframes print-pair {
          0%, 12% { clip-path: inset(0 100% 0 0); }
          48%, 74% { clip-path: inset(0 0 0 0); }
          100% { clip-path: inset(0 0 0 100%); }
        }
        .print-pair { animation: print-pair 7.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .print-pair { animation: none; clip-path: inset(0 48% 0 0); }
        }
      `}</style>
    </div>
  );
}
