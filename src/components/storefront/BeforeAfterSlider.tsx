"use client";

import Image from "next/image";

type Props = {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt?: string;
  afterAlt?: string;
  className?: string;
  /** "scene" is the three-piece homepage loop. "pair" wipes one photo into its studio version. */
  variant?: "scene" | "pair";
};

type Piece = {
  id: "cup" | "pillow" | "frame";
  left: number;
  width: number;
};

/** Windows sit on the gaps between the three objects in the 16:9 photo. */
const PIECES: Piece[] = [
  { id: "cup", left: 12, width: 16 },
  { id: "pillow", left: 30, width: 33 },
  { id: "frame", left: 64.5, width: 29.5 },
];

function sliceStyle(left: number, width: number): React.CSSProperties {
  return {
    left: `${(-left / width) * 100}%`,
    width: `${(100 / width) * 100}%`,
  };
}

function Scene({
  beforeSrc,
  afterSrc,
  beforeAlt,
  afterAlt,
}: {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
}) {
  return (
    <>
      <Image src={beforeSrc} alt={beforeAlt} fill className="object-cover" sizes="(min-width: 1024px) 70vw, 100vw" />
      {PIECES.map((piece) => (
        <div
          key={piece.id}
          className="absolute inset-y-0 overflow-hidden"
          style={{ left: `${piece.left}%`, width: `${piece.width}%` }}
        >
          <div className={`piece-${piece.id} absolute inset-y-0`} style={sliceStyle(piece.left, piece.width)}>
            <Image src={afterSrc} alt={piece.id === "frame" ? afterAlt : ""} fill className="object-cover" sizes="(min-width: 1024px) 70vw, 100vw" />
          </div>
        </div>
      ))}
    </>
  );
}

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt = "Plain product before personalisation",
  afterAlt = "The same piece after it is designed",
  className = "",
  variant = "scene",
}: Props) {
  if (variant === "pair") {
    return (
      <div
        className={`relative isolate aspect-video w-full overflow-hidden bg-[#f3eee6] ${className}`}
        role="img"
        aria-label="The original photo wiping into the same piece on the shop background."
      >
        <Image src={beforeSrc} alt={beforeAlt} fill className="object-cover" sizes="(min-width: 1024px) 70vw, 100vw" />
        <div className="pair-wipe absolute inset-0">
          <Image src={afterSrc} alt={afterAlt} fill className="object-cover" sizes="(min-width: 1024px) 70vw, 100vw" />
        </div>
        <style>{`
          @keyframes pair-wipe {
            0%, 10% { clip-path: inset(0 100% 0 0); }
            46%, 72% { clip-path: inset(0 0 0 0); }
            100% { clip-path: inset(0 0 0 100%); }
          }
          .pair-wipe { animation: pair-wipe 7.6s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) {
            .pair-wipe { animation: none; clip-path: inset(0 50% 0 0); }
          }
        `}</style>
      </div>
    );
  }
  return (
    <div
      className={`relative isolate aspect-video w-full overflow-hidden bg-[#f3eee6] ${className}`}
      role="img"
      aria-label="A plain cup, cushion, and frame each becoming personal in their own way."
    >
      <Scene beforeSrc={beforeSrc} afterSrc={afterSrc} beforeAlt={beforeAlt} afterAlt={afterAlt} />

      <div className="pointer-events-none absolute inset-x-[8%] top-[7%] z-20" aria-hidden>
        <div className="h-px bg-[#1c1612]/15" />
        <div className="mt-2 flex items-center justify-between">
          <div className="h-px w-14 bg-[#c4a06a]" />
          <div className="h-px w-14 bg-[#c4a06a]" />
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-[6]"
        style={{
          clipPath: "inset(76% 0 0 0)",
          maskImage: "linear-gradient(to bottom, transparent 74%, rgba(0,0,0,0.45) 78%, transparent 97%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 74%, rgba(0,0,0,0.45) 78%, transparent 97%)",
        }}
        aria-hidden
      >
        <div className="absolute inset-0" style={{ transform: "scaleY(-1)", transformOrigin: "50% 76%" }}>
          <Scene beforeSrc={beforeSrc} afterSrc={afterSrc} beforeAlt="" afterAlt="" />
        </div>
      </div>

      <style>{`
        @keyframes piece-fade {
          0%, 16% { opacity: 0; }
          40%, 66% { opacity: 1; }
          90%, 100% { opacity: 0; }
        }
        @keyframes piece-wipe {
          0%, 12% { clip-path: inset(0 100% 0 0); }
          42%, 68% { clip-path: inset(0 0 0 0); }
          100% { clip-path: inset(0 0 0 100%); }
        }
        @keyframes piece-rise {
          0%, 14% { clip-path: inset(100% 0 0 0); }
          48%, 74% { clip-path: inset(0 0 0 0); }
          100% { clip-path: inset(100% 0 0 0); }
        }
        .piece-cup { animation: piece-fade 7.4s ease-in-out infinite; }
        .piece-pillow { animation: piece-wipe 8.8s ease-in-out infinite; }
        .piece-frame { animation: piece-rise 10.2s cubic-bezier(0.22, 0.8, 0.28, 1) infinite; }
        @media (prefers-reduced-motion: reduce) {
          .piece-cup, .piece-pillow, .piece-frame {
            animation: none;
            opacity: 1;
            clip-path: none;
          }
        }
      `}</style>
    </div>
  );
}
