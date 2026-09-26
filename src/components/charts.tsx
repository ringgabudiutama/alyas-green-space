"use client";
import { useEffect, useState } from "react";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend, LineElement, PointElement, Filler } from "chart.js";
import { Bar } from "react-chartjs-2";
import { rupiah, rupiahShort } from "@/lib/format";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, LineElement, PointElement, Filler);

type VizColors = { income: string; expense: string; single: string; grid: string; ink: string; muted: string; card: string };

/** Warna grafik dari CSS variables — ikut berubah saat light/dark */
export function useVizColors(): VizColors {
  const read = (): VizColors => {
    if (typeof window === "undefined")
      return { income: "#1f7a55", expense: "#c98a1a", single: "#2e7351", grid: "#e6ebe6", ink: "#1f2a24", muted: "#7b8780", card: "#fff" };
    const s = getComputedStyle(document.documentElement);
    const v = (n: string) => s.getPropertyValue(n).trim();
    return { income: v("--viz-income"), expense: v("--viz-expense"), single: v("--viz-single"), grid: v("--viz-grid"), ink: v("--ink-soft"), muted: v("--ink-muted"), card: v("--card") };
  };
  const [c, setC] = useState<VizColors>(read);
  useEffect(() => {
    setC(read());
    const mo = new MutationObserver(() => setC(read()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return c;
}

function baseOptions(c: VizColors, money: boolean, legend: boolean) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: { display: legend, position: "top" as const, align: "start" as const, labels: { color: c.ink, boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 3, font: { size: 12 } } },
      tooltip: {
        backgroundColor: c.card,
        titleColor: c.ink,
        bodyColor: c.ink,
        borderColor: c.grid,
        borderWidth: 1,
        padding: 10,
        cornerRadius: 10,
        callbacks: money ? { label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) => `${ctx.dataset.label ?? ""}: ${rupiah(ctx.parsed.y)}` } : {},
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: c.muted, font: { size: 11 } } },
      y: {
        beginAtZero: true,
        grid: { color: c.grid },
        border: { display: false },
        ticks: { color: c.muted, font: { size: 11 }, maxTicksLimit: 5, callback: (v: string | number) => (money ? rupiahShort(Number(v)) : v) },
      },
    },
  };
}

/** Income vs Expense (berkelompok, satu sumbu) */
export function IncomeExpenseChart({ labels, income, expense, height = 240 }: { labels: string[]; income: number[]; expense: number[]; height?: number }) {
  const c = useVizColors();
  return (
    <div style={{ height }} role="img" aria-label="Grafik income dan expense per bulan">
      <Bar
        data={{
          labels,
          datasets: [
            { label: "Income", data: income, backgroundColor: c.income, borderRadius: 4, borderSkipped: "bottom", maxBarThickness: 22, categoryPercentage: 0.7, barPercentage: 0.9 },
            { label: "Expense", data: expense, backgroundColor: c.expense, borderRadius: 4, borderSkipped: "bottom", maxBarThickness: 22, categoryPercentage: 0.7, barPercentage: 0.9 },
          ],
        }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options={baseOptions(c, true, true) as any}
      />
    </div>
  );
}

/** Satu seri (mis. expense harian, journal per bulan) */
export function SingleBarChart({ labels, values, label, money = false, height = 220 }: { labels: string[]; values: number[]; label: string; money?: boolean; height?: number }) {
  const c = useVizColors();
  return (
    <div style={{ height }} role="img" aria-label={`Grafik ${label}`}>
      <Bar
        data={{ labels, datasets: [{ label, data: values, backgroundColor: c.single, borderRadius: 4, borderSkipped: "bottom", maxBarThickness: 18 }] }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options={baseOptions(c, money, false) as any}
      />
    </div>
  );
}

/** Batang horizontal HTML (label & nilai tertulis langsung) — cocok untuk kategori di layar HP */
export function CategoryBars({ items, format = rupiah }: { items: { name: string; icon?: string | null; total: number }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.total));
  const sum = items.reduce((a, i) => a + i.total, 0);
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.name}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 font-medium">
              <span aria-hidden>{i.icon}</span>
              {i.name}
            </span>
            <span className="text-right tabular-nums soft">
              {format(i.total)} <span className="text-xs muted">· {sum ? Math.round((i.total / sum) * 100) : 0}%</span>
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-mint-100 dark:bg-night-600">
            <div className="h-full rounded-full bg-[var(--viz-single)] transition-[width] duration-700" style={{ width: `${(i.total / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
