"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/fetch-client";
import { uploadAdminImageWithProgress } from "@/lib/api/upload-progress";
import type { HomeHeroSlide } from "@/lib/home-hero";
import { useAdminToast } from "@/components/admin/layout/AdminShell";

const NEW_SLIDE_TEMPLATE: HomeHeroSlide = {
  image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=1600&q=85",
  kicker: "Kicker",
  title: "Slide headline",
  description: "Supporting text for this slide.",
};

type LocalSlide = HomeHeroSlide & { _id: string };

type LoadState = { slides: HomeHeroSlide[]; usingDefaults: boolean };

function withIds(slides: HomeHeroSlide[]): LocalSlide[] {
  return slides.map((s) => ({ ...s, _id: crypto.randomUUID() }));
}

export function HomeHeroEditorClient() {
  const toast = useAdminToast();
  const [loadState, setLoadState] = useState<LoadState | null>(null);
  const [slides, setSlides] = useState<LocalSlide[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [uploadPct, setUploadPct] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch<LoadState>("/api/v1/admin/home-hero");
      setLoadState(d);
      setSlides(withIds(d.slides));
    } catch (e) {
      toast({ type: "error", message: e instanceof Error ? e.message : "Failed to load" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateSlide = (i: number, patch: Partial<HomeHeroSlide>) => {
    setSlides((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  };

  const addSlide = () => {
    setSlides((prev) => [
      ...(prev ?? []),
      { ...NEW_SLIDE_TEMPLATE, _id: crypto.randomUUID() },
    ]);
  };

  const removeSlide = (i: number) => {
    setSlides((prev) => {
      if (!prev || prev.length <= 1) {
        toast({ type: "warning", message: "Keep at least one slide." });
        return prev;
      }
      return prev.filter((_, j) => j !== i);
    });
  };

  const move = (i: number, dir: -1 | 1) => {
    setSlides((prev) => {
      if (!prev) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const onPickFile = (id: string) => {
    document.getElementById(`home-hero-file-${id}`)?.click();
  };

  const onFile = async (i: number, file: File | null) => {
    if (!file) return;
    setUploadingIdx(i);
    setUploadPct(0);
    try {
      const url = await uploadAdminImageWithProgress(file, (p) => setUploadPct(p));
      updateSlide(i, { image: url });
      toast({ type: "success", message: "Image uploaded." });
    } catch (e) {
      toast({ type: "error", message: e instanceof Error ? e.message : "Upload failed" });
    } finally {
      setUploadingIdx(null);
      setUploadPct(0);
    }
  };

  const toPayload = (list: LocalSlide[]): HomeHeroSlide[] =>
    list.map(({ _id, ...s }) => s);

  const save = async () => {
    if (!slides) return;
    setSaving(true);
    try {
      const res = await apiFetch<LoadState>("/api/v1/admin/home-hero", {
        method: "PUT",
        body: JSON.stringify({ slides: toPayload(slides) }),
      });
      setLoadState(res);
      setSlides(withIds(res.slides));
      toast({ type: "success", message: "Home hero saved. The storefront will update shortly." });
    } catch (e) {
      toast({ type: "error", message: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !slides) {
    return <p className="text-sm text-zinc-500">Loading home hero…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Home hero carousel</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Images and text for the main page hero. Upload images to your server or S3, or paste a public image URL.{" "}
          {loadState?.usingDefaults ? (
            <span className="font-medium text-amber-800">
              Shown copy is the built-in default until you save.
            </span>
          ) : null}
        </p>
      </div>

      <ul className="space-y-6">
        {slides.map((slide, i) => (
          <li
            key={slide._id}
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-zinc-800">Slide {i + 1}</span>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 disabled:opacity-40"
                >
                  Up
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === slides.length - 1}
                  className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 disabled:opacity-40"
                >
                  Down
                </button>
                <button
                  type="button"
                  onClick={() => removeSlide(i)}
                  className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-800"
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-[140px,1fr] sm:items-start">
              <div className="relative aspect-[4/3] w-full max-w-[200px] overflow-hidden rounded-lg bg-zinc-100 sm:max-w-none">
                <img src={slide.image || "data:,"} alt="" className="h-full w-full object-cover" />
                {uploadingIdx === i ? (
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white"
                    role="status"
                  >
                    {uploadPct}%
                  </div>
                ) : null}
              </div>
              <div className="min-w-0 space-y-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-600" htmlFor={`img-${i}`}>
                    Image URL
                  </label>
                  <input
                    id={`img-${i}`}
                    className="mt-0.5 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
                    value={slide.image}
                    onChange={(e) => updateSlide(i, { image: e.target.value })}
                    placeholder="https://…"
                    autoComplete="off"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    id={`home-hero-file-${slide._id}`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => void onFile(i, e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    onClick={() => onPickFile(slide._id)}
                    disabled={uploadingIdx !== null}
                    className="rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-50"
                  >
                    Upload image
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600" htmlFor={`kicker-${i}`}>
                    Kicker (small line above the headline)
                  </label>
                  <input
                    id={`kicker-${i}`}
                    className="mt-0.5 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
                    value={slide.kicker}
                    onChange={(e) => updateSlide(i, { kicker: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600" htmlFor={`title-${i}`}>
                    Headline
                  </label>
                  <textarea
                    id={`title-${i}`}
                    className="mt-0.5 min-h-[4rem] w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
                    value={slide.title}
                    onChange={(e) => updateSlide(i, { title: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600" htmlFor={`desc-${i}`}>
                    Description
                  </label>
                  <textarea
                    id={`desc-${i}`}
                    className="mt-0.5 min-h-[3.5rem] w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
                    value={slide.description}
                    onChange={(e) => updateSlide(i, { description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addSlide}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
        >
          Add slide
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <a href="/" className="text-sm font-medium text-sky-700 hover:underline" target="_blank" rel="noreferrer">
          View store →
        </a>
      </div>
    </div>
  );
}
