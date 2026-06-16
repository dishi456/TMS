// Lease Lord wordmark — inline SVG so it stays crisp at any size and needs no
// asset. Height is driven by `className` (e.g. h-9); width scales via viewBox.
// "LEASE" in soft blue, "LORD" in dark slate, with generous letter-spacing.
export function Logo({ className = "h-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 620 120"
      className={`w-auto ${className}`}
      role="img"
      aria-label="Lease Lord"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="0"
        y="82"
        textLength="330"
        lengthAdjust="spacingAndGlyphs"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="78"
        fontWeight="400"
        fill="#7FB2F2"
      >
        LEASE
      </text>
      <text
        x="372"
        y="82"
        textLength="248"
        lengthAdjust="spacingAndGlyphs"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="78"
        fontWeight="400"
        fill="#41526B"
      >
        LORD
      </text>
    </svg>
  );
}
