"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api/fetch-client";
import type { HomeExploreCardDTO } from "@/lib/home-explore-dto";
import type { ExploreFeedMode } from "@/lib/explore-feed-mode";
import { HomeProductCard } from "@/components/store/HomeProductCard";

type Row = { dto: HomeExploreCardDTO; rowKey: string };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

type Props = {
  initial: HomeExploreCardDTO[];
  exploreFeedMode: ExploreFeedMode;
  pageSize?: number;
};

export function HomeExploreProducts({ initial, exploreFeedMode, pageSize = 18 }: Props) {
  const [rows, setRows] = useState<Row[]>(() => initial.map((dto) => ({ dto, rowKey: dto.id })));
  const [skip, setSkip] = useState(initial.length);
  const [loading, setLoading] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  const uniqueCatalogRef = useRef<HomeExploreCardDTO[] | null>(null);
  const loopPoolRef = useRef<HomeExploreCardDTO[]>([]);
  const loopIdxRef = useRef(0);
  const loopGenRef = useRef(0);
  const loopSeqRef = useRef(0);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const inFlightRef = useRef(false);

  const buildUniqueCatalog = useCallback((current: Row[]) => {
    const m = new Map<string, HomeExploreCardDTO>();
    for (const r of current) m.set(r.dto.id, r.dto);
    return Array.from(m.values());
  }, []);

  const appendLoopBatch = useCallback(() => {
    const catalog = uniqueCatalogRef.current;
    if (!catalog || catalog.length === 0) return;

    const batch: Row[] = [];
    let n = 0;
    while (n < pageSize) {
      if (loopIdxRef.current >= loopPoolRef.current.length) {
        loopPoolRef.current = shuffle(catalog);
        loopIdxRef.current = 0;
        loopGenRef.current += 1;
      }
      const dto = loopPoolRef.current[loopIdxRef.current]!;
      loopIdxRef.current += 1;
      loopSeqRef.current += 1;
      batch.push({
        dto,
        rowKey: `${dto.id}-loop-${loopGenRef.current}-${loopSeqRef.current}`,
      });
      n += 1;
    }
    setRows((prev) => [...prev, ...batch]);
  }, [pageSize]);

  const loadMore = useCallback(async () => {
    if (loading || inFlightRef.current) return;
    inFlightRef.current = true;

    if (exhausted) {
      setLoading(true);
      try {
        appendLoopBatch();
      } finally {
        setLoading(false);
        inFlightRef.current = false;
      }
      return;
    }

    setLoading(true);
    try {
      const { items } = await apiFetch<{ items: HomeExploreCardDTO[]; mode: ExploreFeedMode }>(
        `/api/v1/products/explore?limit=${pageSize}&skip=${skip}&mode=${encodeURIComponent(exploreFeedMode)}`,
      );
      if (items.length === 0) {
        setRows((prev) => {
          uniqueCatalogRef.current = buildUniqueCatalog(prev);
          return prev;
        });
        setExhausted(true);
        if (uniqueCatalogRef.current && uniqueCatalogRef.current.length > 0) {
          appendLoopBatch();
        }
        return;
      }
      setSkip((s) => s + items.length);
      setRows((prev) => [
        ...prev,
        ...items.map((dto) => ({ dto, rowKey: dto.id })),
      ]);
    } catch {
      /* ignore — user can scroll again */
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [
    appendLoopBatch,
    buildUniqueCatalog,
    exhausted,
    exploreFeedMode,
    loading,
    pageSize,
    skip,
  ]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (hit) void loadMore();
      },
      { root: null, rootMargin: "240px 0px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore, rows.length, exhausted]);

  if (initial.length === 0 && rows.length === 0) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 md:grid-cols-3 lg:grid-cols-4">
        {rows.map(({ dto, rowKey }) => (
          <HomeProductCard
            key={rowKey}
            variant="explore"
            slug={dto.slug}
            name={dto.name}
            productId={dto.id}
            listPricePaise={dto.listPricePaise}
            compareAtPaise={dto.compareAtPaise}
            stock={dto.stock}
            imageUrl={dto.imageUrl}
            hoverImageUrl={dto.hoverImageUrl}
            multi={dto.multi}
            hasColorVariants={dto.hasColorVariants}
          />
        ))}
      </div>
      <div ref={sentinelRef} className="h-4 w-full shrink-0" aria-hidden />
      {loading ? (
        <p className="mt-3 text-center text-xs text-ink-muted">Loading more…</p>
      ) : null}
    </>
  );
}
