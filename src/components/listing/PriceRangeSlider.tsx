"use client";

import * as Slider from "@radix-ui/react-slider";
import { useEffect, useRef, useState } from "react";
import { useListingFilters } from "@/hooks/useListingFilters";

const MAX_RUPEES = 5000;

type Props = {
  maxRupees?: number;
};

function MobileMaxOnly({ maxRupees }: { maxRupees: number }) {
  const { setFilters, searchParams } = useListingFilters();
  const maxParam = searchParams.get("price_max");
  const [mobileMax, setMobileMax] = useState(
    maxParam != null && maxParam !== "" ? Math.min(maxRupees, Math.max(0, Number(maxParam))) : maxRupees,
  );

  useEffect(() => {
    setMobileMax(
      maxParam != null && maxParam !== ""
        ? Math.min(maxRupees, Math.max(0, Number(maxParam)))
        : maxRupees,
    );
  }, [maxParam, maxRupees]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const schedule = (upTo: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters({
        price_min: null,
        price_max: upTo >= maxRupees ? null : String(upTo),
      });
    }, 400);
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-[var(--muted)]">
        Up to ₹{mobileMax.toLocaleString("en-IN")}
      </p>
      <input
        type="range"
        min={0}
        max={maxRupees}
        value={mobileMax}
        onChange={(e) => {
          const v = Number(e.target.value);
          setMobileMax(v);
          schedule(v);
        }}
        className="w-full accent-[var(--am)]"
        aria-label="Maximum price"
      />
    </div>
  );
}

function DesktopDual({ maxRupees }: { maxRupees: number }) {
  const { setFilters, searchParams } = useListingFilters();
  const minParam = searchParams.get("price_min");
  const maxParam = searchParams.get("price_max");
  const minR = minParam != null && minParam !== "" ? Math.max(0, Number(minParam)) : 0;
  const maxR =
    maxParam != null && maxParam !== "" ? Math.min(maxRupees, Math.max(0, Number(maxParam))) : maxRupees;

  const [localMin, setLocalMin] = useState(minR);
  const [localMax, setLocalMax] = useState(maxR);

  useEffect(() => {
    setLocalMin(minR);
    setLocalMax(maxR);
  }, [minR, maxR, maxRupees]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const schedulePush = (nextMin: number, nextMax: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const lo = Math.min(nextMin, nextMax);
      const hi = Math.max(nextMin, nextMax);
      setFilters({
        price_min: lo <= 0 ? null : String(lo),
        price_max: hi >= maxRupees ? null : String(hi),
      });
    }, 400);
  };

  return (
    <div className="space-y-2.5 lg:space-y-3">
      <p className="text-xs font-medium text-[var(--ink)] sm:text-sm">
        ₹{localMin.toLocaleString("en-IN")} – ₹{localMax.toLocaleString("en-IN")}
      </p>
      <Slider.Root
        className="relative flex h-7 w-full touch-none select-none items-center lg:h-8"
        value={[localMin, localMax]}
        min={0}
        max={maxRupees}
        step={50}
        minStepsBetweenThumbs={1}
        onValueChange={(v) => {
          const [a, b] = v;
          setLocalMin(a);
          setLocalMax(b);
          schedulePush(a, b);
        }}
        aria-label="Price range"
      >
        <Slider.Track className="relative h-1.5 grow rounded-full bg-[var(--bd)] lg:h-2">
          <Slider.Range className="absolute h-full rounded-full bg-[var(--am)]" />
        </Slider.Track>
        <Slider.Thumb
          className="block h-4 w-4 rounded-full border-2 border-white bg-[var(--am)] shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--am)] lg:h-5 lg:w-5"
          aria-label="Minimum price"
        />
        <Slider.Thumb
          className="block h-4 w-4 rounded-full border-2 border-white bg-[var(--am)] shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--am)] lg:h-5 lg:w-5"
          aria-label="Maximum price"
        />
      </Slider.Root>
    </div>
  );
}

export function PriceRangeSlider({ maxRupees = MAX_RUPEES }: Props) {
  return (
    <>
      <div className="md:hidden">
        <MobileMaxOnly maxRupees={maxRupees} />
      </div>
      <div className="hidden md:block">
        <DesktopDual maxRupees={maxRupees} />
      </div>
    </>
  );
}
