"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/client";
import { clamp } from "@/lib/format";

// ------------------------------------------------------------------ Toast
type Toast = { id: number; message: string; tone: "success" | "error" | "info" };
const ToastCtx = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setItems((t) => [...t, { id, message, tone }]);
    setTimeout(() => setItems((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[70] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex max-w-sm items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium shadow-lift animate-pop",
              t.tone === "success" && "bg-brand-700 text-white",
              t.tone === "error" && "bg-red-600 text-white",
              t.tone === "info" && "bg-[var(--card)] text-[var(--ink)] border border-[var(--line)]"
            )}
          >
            <span aria-hidden>{t.tone === "success" ? "✓" : t.tone === "error" ? "!" : "🌿"}</span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ------------------------------------------------------------------ Card
export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card card-pad", className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({ title, action, sub }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-lg font-semibold text-brand-900 dark:text-mint-100">{title}</h2>
        {sub && <p className="text-sm muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-7">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="mt-1 text-sm soft">{sub}</p>}
      </div>
      {action && <div className="flex gap-2">{action}</div>}
    </div>
  );
}

// ------------------------------------------------------------------ Progress
export function ProgressBar({ value, className, tone = "brand", label }: { value: number; className?: string; tone?: "brand" | "amber"; label?: string }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setW(clamp(value)));
    return () => cancelAnimationFrame(t);
  }, [value]);
  return (
    <div
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-mint-100 dark:bg-night-600", className)}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-out",
          tone === "brand" ? "bg-gradient-to-r from-brand-400 to-brand-600" : "bg-amberSoft-500"
        )}
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

export function ProgressRing({ value, size = 64, stroke = 7, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [v, setV] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setV(clamp(value)));
    return () => cancelAnimationFrame(t);
  }, [value]);
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-mint-100 dark:stroke-night-600" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-brand-500 transition-[stroke-dashoffset] duration-1000 ease-out"
          strokeDasharray={c}
          strokeDashoffset={c - (c * v) / 100}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-xs font-bold text-brand-800 dark:text-mint-200">
        {children ?? `${Math.round(value)}%`}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Count up
export function CountUp({ value, format = (n: number) => Math.round(n).toLocaleString("id-ID"), duration = 900 }: { value: number; format?: (n: number) => string; duration?: number }) {
  const [n, setN] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(a + (value - a) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{format(n)}</>;
}

export function StatCard({ icon, label, value, format, hint }: { icon: string; label: string; value: number; format?: (n: number) => string; hint?: string }) {
  return (
    <div className="card flex flex-col gap-1 p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide muted">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-mint-100 text-sm dark:bg-night-600" aria-hidden>
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-1 truncate text-xl font-bold text-brand-900 dark:text-mint-100 sm:text-2xl">
        <CountUp value={value} format={format} />
      </div>
      {hint && <div className="text-xs muted">{hint}</div>}
    </div>
  );
}

// ------------------------------------------------------------------ States
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-56" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-48" />
      <Skeleton className="h-32" />
    </div>
  );
}

export function EmptyState({ icon = "🌱", title, text, action }: { icon?: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--line)] px-6 py-12 text-center">
      <div className="mb-3 grid h-16 w-16 place-items-center rounded-full bg-mint-100 text-3xl animate-breathe dark:bg-night-600" aria-hidden>
        {icon}
      </div>
      <h3 className="font-display text-lg font-semibold text-brand-900 dark:text-mint-100">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card card-pad text-center">
      <p className="text-sm text-red-600 dark:text-red-300">{message}</p>
      {onRetry && (
        <button className="btn-soft mt-3" onClick={onRetry}>
          Coba lagi
        </button>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Sheet / Modal
/** Di HP muncul sebagai bottom sheet (seperti aplikasi), di desktop sebagai dialog di tengah */
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-brand-950/40 backdrop-blur-[2px] animate-[fadeUp_.2s_ease-out]" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-[var(--card)] shadow-lift animate-[sheetUp_.28s_cubic-bezier(.2,.8,.2,1)] sm:max-w-lg sm:rounded-3xl sm:animate-pop">
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-[var(--line)] sm:hidden" aria-hidden />
        <div className="flex items-center justify-between px-5 pb-2 pt-3 sm:pt-5">
          <h2 className="font-display text-lg font-semibold text-brand-900 dark:text-mint-100">{title}</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-mint-100 dark:hover:bg-night-600" aria-label="Tutup">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="border-t border-[var(--line)] px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 sm:pb-5">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmSheet({ open, onClose, onConfirm, title = "Hapus data ini?", text = "Tindakan ini tidak bisa dibatalkan.", confirmLabel = "Ya, hapus", busy }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title?: string; text?: string; confirmLabel?: string; busy?: boolean;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={onClose}>Batal</button>
          <button className="btn flex-1 bg-red-600 text-white hover:bg-red-700" onClick={onConfirm} disabled={busy}>
            {busy ? "Menghapus…" : confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm soft">{text}</p>
    </Sheet>
  );
}

// ------------------------------------------------------------------ Form bits
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs muted">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 py-3 text-left">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {sub && <span className="block text-xs muted">{sub}</span>}
      </span>
      <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition", checked ? "bg-brand-600" : "bg-sage-200 dark:bg-night-500")}>
        <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-6" : "left-1")} />
      </span>
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-mint-100 p-1 dark:bg-night-700">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm",
            value === o.value ? "bg-[var(--card)] text-brand-800 shadow-soft dark:text-mint-100" : "text-[var(--ink-soft)] hover:text-brand-800"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Input angka rupiah dengan pemisah ribuan */
export function MoneyInput({ value, onChange, placeholder = "0" }: { value: number | ""; onChange: (v: number | "") => void; placeholder?: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold muted">Rp</span>
      <input
        inputMode="numeric"
        className="input pl-10"
        placeholder={placeholder}
        value={value === "" ? "" : Number(value).toLocaleString("id-ID")}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          onChange(digits ? Number(digits) : "");
        }}
      />
    </div>
  );
}

// ------------------------------------------------------------------ Confetti
export function Confetti({ show }: { show: boolean }) {
  if (!show) return null;
  const pieces = Array.from({ length: 24 });
  const colors = ["#3f8f66", "#93c9aa", "#c98a1a", "#a3dcbf", "#265c43", "#efe8d6"];
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-1/3 z-[65] flex justify-center" aria-hidden>
      {pieces.map((_, i) => (
        <span
          key={i}
          className="absolute h-2.5 w-1.5 rounded-sm animate-float-up"
          style={{
            background: colors[i % colors.length],
            left: `calc(50% + ${(i - 12) * 14}px)`,
            animationDelay: `${(i % 6) * 60}ms`,
            transform: `rotate(${i * 30}deg)`,
          }}
        />
      ))}
    </div>
  );
}
