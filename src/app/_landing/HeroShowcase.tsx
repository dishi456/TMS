"use client";

import { useEffect, useState } from "react";

// Hero artwork: an auto-rotating showcase of real property photos, framed in a
// blue-themed floating card with live "stat" chips. Falls back to a gradient
// when there are no photos.
export function HeroShowcase({ photoIds }: { photoIds: string[] }) {
  const ids = photoIds.slice(0, 6);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (ids.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % ids.length), 3500);
    return () => clearInterval(t);
  }, [ids.length]);

  return (
    <div className="animate-fade-up relative [--delay:200ms]">
      <div className="animate-float relative mx-auto max-w-md">
        <div className="absolute -inset-4 -z-10 rounded-[2.2rem] bg-gradient-to-tr from-blue-500/25 to-cyan-400/25 blur-2xl" />

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl shadow-blue-900/10">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-blue-100 to-sky-50">
            {ids.length > 0 ? (
              ids.map((id, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={id}
                  src={`/api/files/${id}`}
                  alt=""
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-in-out ${i === idx ? "opacity-100" : "opacity-0"}`}
                />
              ))
            ) : (
              <div className="flex h-full w-full items-center justify-center text-6xl text-blue-400/80">🏙️</div>
            )}

            {/* legibility gradient + label */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-blue-700 shadow backdrop-blur">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l2.6 1.9 3.2-.2 1 3 2.7 1.8-1 3 1 3-2.7 1.8-1 3-3.2-.2L12 23l-2.6-1.9-3.2.2-1-3L2.5 16.5l1-3-1-3 2.7-1.8 1-3 3.2.2L12 1z" /><path d="M10.6 14.6l-2.2-2.2-1.2 1.2 3.4 3.4 6-6-1.2-1.2z" fill="#fff" /></svg>
              Verified rentals
            </span>

            {/* dots */}
            {ids.length > 1 && (
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {ids.map((id, i) => (
                  <span key={id} className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? "w-5 bg-white" : "w-1.5 bg-white/60"}`} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* floating chips */}
        <div className="animate-float-slow absolute -left-8 top-16 hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl sm:block">
          <p className="text-[11px] text-slate-400">Rent paid</p>
          <p className="text-sm font-bold text-emerald-600">✓ $2,500</p>
        </div>
        <div className="animate-float absolute -right-6 bottom-14 hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl [animation-delay:-3s] sm:block">
          <p className="text-[11px] text-slate-400">New review</p>
          <p className="text-sm font-bold text-amber-500">★★★★★</p>
        </div>
        <div className="animate-float-slow absolute -right-4 top-8 hidden rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg [animation-delay:-5s] md:block">
          <p className="text-sm font-bold text-blue-600">86%<span className="ml-1 text-[10px] font-normal text-slate-400">occupied</span></p>
        </div>
      </div>
    </div>
  );
}
