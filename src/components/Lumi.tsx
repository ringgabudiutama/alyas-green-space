"use client";
import type { LumiExpression } from "@/lib/lumi";
import { cn } from "@/lib/client";

/** Lumi — robot companion Alya. SVG murni, animasi napas & kedip yang halus. */
export function Lumi({ expression = "happy", size = 96, className }: { expression?: LumiExpression; size?: number; className?: string }) {
  const e = expression;
  const eyes = (() => {
    switch (e) {
      case "happy":
      case "celebrating":
        return (
          <>
            <path d="M38 55 q6 -7 12 0" />
            <path d="M70 55 q6 -7 12 0" />
          </>
        );
      case "calm":
        return (
          <>
            <path d="M38 55 q6 5 12 0" />
            <path d="M70 55 q6 5 12 0" />
          </>
        );
      case "thinking":
        return (
          <>
            <circle cx="44" cy="54" r="4.2" className="fill-brand-900 stroke-none" />
            <circle cx="76" cy="52" r="4.2" className="fill-brand-900 stroke-none" />
          </>
        );
      default:
        return (
          <g className="origin-center animate-blink" style={{ transformBox: "fill-box" }}>
            <ellipse cx="44" cy="54" rx="4.6" ry="5.6" className="fill-brand-900 stroke-none" />
            <ellipse cx="76" cy="54" rx="4.6" ry="5.6" className="fill-brand-900 stroke-none" />
            <circle cx="45.5" cy="52" r="1.5" className="fill-white stroke-none" />
            <circle cx="77.5" cy="52" r="1.5" className="fill-white stroke-none" />
          </g>
        );
    }
  })();

  const mouth = (() => {
    switch (e) {
      case "excited":
      case "celebrating":
        return <path d="M50 67 q10 11 20 0 z" className="fill-brand-800" />;
      case "thinking":
        return <path d="M53 70 h12" />;
      case "encouraging":
        return <path d="M50 67 q10 8 20 0" />;
      case "calm":
        return <path d="M53 68 q7 4 14 0" />;
      default:
        return <path d="M51 67 q9 8 18 0" />;
    }
  })();

  const arms =
    e === "celebrating" || e === "excited" ? (
      <>
        <path d="M22 88 q-12 -10 -10 -26" />
        <path d="M98 88 q12 -10 10 -26" />
      </>
    ) : e === "encouraging" ? (
      <>
        <path d="M22 90 q-10 4 -12 14" />
        <path d="M98 88 q12 -8 12 -22" />
        <circle cx="110" cy="62" r="4" className="fill-cream-100" />
      </>
    ) : (
      <>
        <path d="M22 90 q-9 6 -10 16" />
        <path d="M98 90 q9 6 10 16" />
      </>
    );

  return (
    <div className={cn("inline-block animate-breathe", className)} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 120 120" width={size} height={size} className="overflow-visible">
        {/* bayangan */}
        <ellipse cx="60" cy="116" rx="26" ry="3.5" className="fill-brand-900/10" />
        {/* antena daun */}
        <path d="M60 22 v-8" className="stroke-brand-700" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M60 14 q-10 -10 -2 -14 q8 4 2 14 z" className="fill-brand-400" />
        {/* badan */}
        <rect x="30" y="80" width="60" height="30" rx="14" className="fill-brand-500" />
        <circle cx="60" cy="95" r="5" className="fill-mint-200" />
        {/* lengan */}
        <g className="stroke-brand-500" strokeWidth="6" strokeLinecap="round" fill="none">
          {arms}
        </g>
        {/* kepala */}
        <rect x="18" y="22" width="84" height="64" rx="28" className="fill-cream-50 stroke-brand-200" strokeWidth="2" />
        <rect x="26" y="34" width="68" height="44" rx="20" className="fill-mint-100" />
        {/* pipi */}
        <ellipse cx="34" cy="66" rx="5" ry="3" className="fill-[#f3c1b4]/70" />
        <ellipse cx="86" cy="66" rx="5" ry="3" className="fill-[#f3c1b4]/70" />
        <g className="stroke-brand-900" strokeWidth="3" strokeLinecap="round" fill="none">
          {eyes}
          {mouth}
        </g>
        {e === "thinking" && (
          <g className="fill-brand-300">
            <circle cx="104" cy="30" r="3" />
            <circle cx="111" cy="20" r="4.5" />
          </g>
        )}
        {e === "celebrating" && (
          <g className="fill-amberSoft-500">
            <path d="M12 30 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" />
            <path d="M106 34 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5z" />
          </g>
        )}
      </svg>
    </div>
  );
}

export function LumiBubble({ expression, message, size = 72, className }: { expression: LumiExpression; message: string; size?: number; className?: string }) {
  return (
    <div className={cn("flex items-end gap-3", className)}>
      <Lumi expression={expression} size={size} className="shrink-0" />
      <div className="relative mb-3 rounded-2xl rounded-bl-md bg-mint-100 px-4 py-3 text-sm leading-relaxed text-brand-900 shadow-soft animate-fade-up dark:bg-night-600 dark:text-mint-100">
        <div className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">Lumi</div>
        {message}
      </div>
    </div>
  );
}
