"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/client";

/** Foto default Alya. Taruh file di public/images/alya.jpg (atau atur NEXT_PUBLIC_DEFAULT_PHOTO). */
export const DEFAULT_PHOTO = process.env.NEXT_PUBLIC_DEFAULT_PHOTO || "/images/alya.jpg";

export function Logo({ size = 36, withText = true, className }: { size?: number; withText?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
        <circle cx="24" cy="24" r="22" className="fill-brand-600" />
        <circle cx="24" cy="24" r="22" fill="none" className="stroke-brand-300" strokeWidth="1.5" strokeDasharray="3 4" />
        <path d="M24 36 C14 30 14 17 24 11 C34 17 34 30 24 36 Z" className="fill-mint-100" />
        <path d="M24 34 V15" className="stroke-brand-600" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M24 26 l-5 -4 M24 21 l4 -3.5" className="stroke-brand-600" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {withText && (
        <div className="leading-tight">
          <div className="font-display text-[15px] font-bold tracking-tight text-brand-900 dark:text-mint-100">Alya&apos;s Green Space</div>
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-brand-500 dark:text-brand-300">A little progress, every day</div>
        </div>
      )}
    </div>
  );
}

/** Foto profil — pakai foto dari database, jika kosong pakai foto default, jika gagal tampilkan inisial */
export function Avatar({ src, name = "Alya", size = 40, ring = false, className }: { src?: string | null; name?: string; size?: number; ring?: boolean; className?: string }) {
  const candidates = [src, DEFAULT_PHOTO].filter(Boolean) as string[];
  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [src]);
  const current = candidates[idx];
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-brand-300 to-brand-600",
        ring && "ring-4 ring-white shadow-lift dark:ring-night-700",
        className
      )}
      style={{ width: size, height: size }}
    >
      {current ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current} alt={`Foto ${name}`} className="h-full w-full object-cover" onError={() => setIdx((i) => i + 1)} />
      ) : (
        <span className="grid h-full w-full place-items-center font-display font-bold text-white" style={{ fontSize: size * 0.38 }}>
          {initials || "A"}
        </span>
      )}
    </div>
  );
}

/** Watermark "Ciptaan Ringga" — tampil di semua halaman */
export function Watermark() {
  return (
    <div
      className="pointer-events-none fixed right-3 z-[45] select-none rounded-full glass px-2.5 py-1 text-[10px] font-semibold tracking-wide text-brand-700/70 backdrop-blur-sm dark:text-mint-200/60 bottom-[calc(env(safe-area-inset-bottom)+var(--wm-offset,0.75rem))]"
      aria-label="Ciptaan Ringga"
    >
      🌿 Ciptaan Ringga
    </div>
  );
}
