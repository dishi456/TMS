"use client";

import { btn } from "@/components/ui";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className={btn("primary") + " print:hidden"}>
      Print / Save PDF
    </button>
  );
}
