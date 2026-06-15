"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type Uploaded = { id: string; url: string; fileName: string };

// File uploader with a live percentage progress bar (XHR upload events).
// For attach-to-existing-entity purposes it refreshes the page on success;
// pass `onUploaded` (e.g. for new maintenance requests) to collect results instead.
export function ImageUploader({
  purpose,
  refId,
  accept = "image/*",
  multiple = false,
  buttonLabel = "Choose file",
  onUploaded,
}: {
  purpose: string;
  refId?: string;
  accept?: string;
  multiple?: boolean;
  buttonLabel?: string;
  onUploaded?: (u: Uploaded) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function uploadOne(file: File): Promise<Uploaded> {
    return new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append("purpose", purpose);
      if (refId) fd.append("refId", refId);
      fd.append("file", file);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText) as Uploaded);
        else {
          let msg = "Upload failed";
          try { msg = JSON.parse(xhr.responseText).error ?? msg; } catch {}
          reject(new Error(msg));
        }
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(fd);
    });
  }

  async function handleFiles(files: FileList) {
    setError(null);
    setDone(false);
    try {
      const results: Uploaded[] = [];
      for (const f of Array.from(files)) {
        setProgress(0);
        results.push(await uploadOne(f));
      }
      setProgress(100);
      if (onUploaded) results.forEach(onUploaded);
      else router.refresh();
      setDone(true);
      setTimeout(() => { setProgress(null); setDone(false); }, 1500);
    } catch (e) {
      setError((e as Error).message);
      setProgress(null);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const busy = progress !== null && !done;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={busy}
        onChange={(e) => e.target.files && e.target.files.length > 0 && handleFiles(e.target.files)}
        className="block w-full text-sm text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:font-medium file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-60"
        aria-label={buttonLabel}
      />
      {progress !== null && (
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-blue-600 transition-[width] duration-150" style={{ width: `${progress}%` }} />
          </div>
          <span className="w-10 text-right text-xs font-medium text-slate-500">
            {done ? "✓" : `${progress}%`}
          </span>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
