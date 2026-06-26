"use client";

import { useState } from "react";

// Property/listing image that fills its parent box and degrades to a clean
// emoji placeholder if the file is missing or fails to load — so a broken
// storage reference never shows the browser's broken-image icon + alt text.
export function PropertyImage({
  src,
  alt = "",
  emoji = "🏠",
  className = "",
}: {
  src: string | null | undefined;
  alt?: string;
  emoji?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const show = src && !failed;

  if (!show) {
    return <div className={`flex h-full w-full items-center justify-center bg-slate-100 text-3xl text-slate-300 ${className}`}>{emoji}</div>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`h-full w-full object-cover ${className}`} />
  );
}
