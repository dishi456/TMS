// Lease Lord wordmark — animated inline SVG, crisp at any size, no asset.
// "LE" + an "A" shaped like a house (roof + walls + a lit doorway) + "SE" in
// blue, "LORD" in slate. Animations: staggered fade-in, the roof drops onto the
// house with a bounce, the window glows, a light shine glints across the
// letters, and the house bobs on hover. All honor prefers-reduced-motion.
const ANIM_CSS = `
.ll-logo .ll-fade{opacity:0;transform-box:fill-box;transform-origin:50% 100%;animation:ll-fade .6s cubic-bezier(.16,1,.3,1) forwards}
.ll-logo .d1{animation-delay:.05s}.ll-logo .d2{animation-delay:.18s}.ll-logo .d3{animation-delay:.30s}.ll-logo .d4{animation-delay:.42s}
.ll-logo .ll-roof{transform-box:fill-box;transform-origin:50% 100%;animation:ll-drop .8s cubic-bezier(.34,1.56,.64,1) .4s both}
.ll-logo .ll-glow{transform-box:fill-box;transform-origin:50% 50%;animation:ll-tw 3s ease-in-out infinite}
.ll-logo .ll-house{transform-box:fill-box;transform-origin:50% 100%;transition:transform .35s cubic-bezier(.16,1,.3,1)}
.ll-logo:hover .ll-house{animation:ll-bob 1.4s ease-in-out infinite}
.ll-logo .ll-shine{transform:translateX(-220px);animation:ll-shine 5s ease-in-out 1.2s infinite}
@keyframes ll-fade{to{opacity:1;transform:none}}
@keyframes ll-drop{0%{opacity:0;transform:translateY(-60%)}60%{opacity:1;transform:translateY(8%)}100%{transform:translateY(0)}}
@keyframes ll-tw{0%,100%{opacity:.6}50%{opacity:1}}
@keyframes ll-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-10%)}}
@keyframes ll-shine{0%{transform:translateX(-220px)}16%{transform:translateX(640px)}100%{transform:translateX(640px)}}
@media (prefers-reduced-motion:reduce){.ll-logo .ll-fade,.ll-logo .ll-roof,.ll-logo .ll-glow{animation:none!important;opacity:1!important}.ll-logo .ll-shine{display:none}}
`;

export function Logo({ className = "h-9" }: { className?: string }) {
  const BLUE = "#2563EB";
  const DARK = "#334155";
  const textProps = {
    y: 110,
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: 82,
    fontWeight: 700,
    lengthAdjust: "spacingAndGlyphs" as const,
  };

  return (
    <svg viewBox="0 0 528 122" className={`ll-logo w-auto ${className}`} role="img" aria-label="Lease Lord" xmlns="http://www.w3.org/2000/svg">
      <style dangerouslySetInnerHTML={{ __html: ANIM_CSS }} />
      <defs>
        <linearGradient id="ll-roof-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="ll-door-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
        <linearGradient id="ll-shine-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.65" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {/* shine is clipped to the lettering so it only glints on the glyphs */}
        <clipPath id="ll-clip">
          <text x="0" textLength="96" {...textProps}>LE</text>
          <text x="170" textLength="96" {...textProps}>SE</text>
          <text x="300" textLength="216" {...textProps}>LORD</text>
        </clipPath>
      </defs>

      <text x="0" textLength="96" fill={BLUE} className="ll-fade d1" {...textProps}>LE</text>

      {/* House-shaped A (replaces the letter A in LEASE).
          Positioning lives on the OUTER group's transform attribute; the
          animation goes on an inner group so its `transform:none` keyframe
          can't wipe out the translate. */}
      <g transform="translate(104,51)">
        <g className="ll-fade d2">
          <g className="ll-house">
            {/* walls — same blue as the LEASE letters so it still reads as an "A" */}
            <path d="M6 27 H50 V59 H6 Z" fill={BLUE} />
            {/* lit doorway */}
            <rect x="22" y="42" width="13" height="17" rx="1.6" fill="url(#ll-door-grad)" />
            {/* roof — the A's apex; drops in with a bounce */}
            <path className="ll-roof" d="M28 -5 L58 27 L-2 27 Z" fill="url(#ll-roof-grad)" />
            {/* soft glow + round window, painted on top of the roof */}
            <circle className="ll-glow" cx="28" cy="14" r="10" fill="#fbbf24" opacity="0.3" />
            <circle className="ll-glow" cx="28" cy="13" r="3.8" fill="#fef3c7" />
          </g>
        </g>
      </g>

      <text x="170" textLength="96" fill={BLUE} className="ll-fade d3" {...textProps}>SE</text>
      <text x="300" textLength="216" fill={DARK} className="ll-fade d4" {...textProps}>LORD</text>

      {/* Shine glint sweeping across the letters */}
      <g clipPath="url(#ll-clip)" aria-hidden="true">
        <polygon className="ll-shine" points="0,-8 80,-8 48,130 -32,130" fill="url(#ll-shine-grad)" />
      </g>
    </svg>
  );
}
