"use client";

import { useCallback, useEffect, useState } from "react";

export function PropertyGallery({ photoIds, name }: { photoIds: string[]; name: string }) {
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const show = useCallback(
    (i: number) => setOpen(((i % photoIds.length) + photoIds.length) % photoIds.length),
    [photoIds.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") setOpen((v) => (v === null ? v : (v + 1) % photoIds.length));
      else if (e.key === "ArrowLeft") setOpen((v) => (v === null ? v : (v - 1 + photoIds.length) % photoIds.length));
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, photoIds.length, close]);

  if (photoIds.length === 0) {
    return <div className="flex h-72 w-full items-center justify-center rounded-2xl bg-slate-100 text-5xl text-slate-300">🏢</div>;
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-100 to-blue-50 p-3 sm:p-4">
      {/* Featured photo */}
      <button onClick={() => show(0)} className="block w-full overflow-hidden rounded-xl border-[6px] border-white shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/files/${photoIds[0]}`} alt={`${name} 1`} className="h-72 w-full cursor-zoom-in object-cover transition-transform duration-500 hover:scale-105 sm:h-96" />
      </button>

      {/* Collage of the rest */}
      {photoIds.length > 1 && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photoIds.slice(1).map((id, i) => (
            <button
              key={id}
              onClick={() => show(i + 1)}
              className={`overflow-hidden rounded-lg border-4 border-white shadow-md transition-transform duration-300 hover:-translate-y-1 hover:rotate-0 hover:shadow-xl ${
                i % 3 === 0 ? "rotate-1" : i % 3 === 1 ? "-rotate-1" : ""
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/files/${id}`} alt={`${name} ${i + 2}`} className="h-32 w-full cursor-zoom-in object-cover sm:h-36" />
            </button>
          ))}
        </div>
      )}
      <p className="mt-2 text-center text-xs text-slate-400">{photoIds.length} photos · click to enlarge</p>

      {/* Lightbox */}
      {open !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <button onClick={close} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20" aria-label="Close">
            ✕
          </button>

          {photoIds.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); show(open - 1); }}
                className="absolute left-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20"
                aria-label="Previous"
              >
                ‹
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); show(open + 1); }}
                className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20"
                aria-label="Next"
              >
                ›
              </button>
            </>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/files/${photoIds[open]}`}
            alt={`${name} ${open + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
          />
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
            {open + 1} / {photoIds.length}
          </span>
        </div>
      )}
    </div>
  );
}
