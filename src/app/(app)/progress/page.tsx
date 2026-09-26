"use client";
import { useApi, cn } from "@/lib/client";
import { Card, ErrorBox, PageHeader, PageSkeleton, ProgressBar, ProgressRing, SectionTitle } from "@/components/ui";
import { LumiBubble } from "@/components/Lumi";
import { formatDate, formatDayName } from "@/lib/dates";

type Day = { date: string; journal: boolean; reflection: boolean; habitsDone: number; habitsTotal: number; percent: number; future?: boolean };
type P = {
  today: number; weekly: number; monthly: number; week: Day[]; last30: Day[];
  goals: { id: number; title: string; progress: number; status: string }[]; goalAverage: number;
  habits: { id: number; name: string; icon: string | null; completionRate: number; currentStreak: number; longestStreak: number }[];
  streak: { current: number; longest: number };
};

// skala sekuensial satu hue (hijau) untuk heatmap
function heat(p: number) {
  if (p <= 0) return "bg-mint-50 dark:bg-night-700";
  if (p < 34) return "bg-brand-200 dark:bg-brand-900";
  if (p < 67) return "bg-brand-400 dark:bg-brand-700";
  if (p < 100) return "bg-brand-600 dark:bg-brand-500";
  return "bg-brand-800 dark:bg-brand-300";
}

export default function ProgressPage() {
  const { data, error, loading, reload } = useApi<P>("/api/progress");
  if (loading && !data) return <PageSkeleton />;
  if (error || !data) return <ErrorBox message={error || "Gagal memuat"} onRetry={reload} />;

  const msg =
    data.weekly >= 70
      ? { e: "excited" as const, m: `Minggu ini kamu konsisten banget, Alya! ${Math.round(data.weekly)}% 🌿` }
      : data.weekly >= 35
        ? { e: "encouraging" as const, m: "Progress-mu terus bertumbuh. Satu langkah kecil lagi hari ini? 🌱" }
        : { e: "calm" as const, m: "Nggak apa-apa kalau minggu ini pelan. Kita mulai lagi dari hari ini, ya. 🫶" };

  return (
    <div className="space-y-5">
      <PageHeader title="Daily Progress" sub="Gambaran perjalananmu — hari ini, minggu ini, bulan ini." />
      <LumiBubble expression={msg.e} message={msg.m} size={64} />

      <div className="grid grid-cols-3 gap-3">
        {[
          { l: "Today", v: data.today },
          { l: "This week", v: data.weekly },
          { l: "This month", v: data.monthly },
        ].map((x) => (
          <Card key={x.l} className="flex flex-col items-center gap-2 p-4">
            <ProgressRing value={x.v} size={78} stroke={8} />
            <span className="text-xs font-semibold muted">{x.l}</span>
          </Card>
        ))}
      </div>

      <Card>
        <SectionTitle title="Weekly progress" sub="Journal, refleksi, dan habit per hari" />
        <div className="grid grid-cols-7 items-end gap-2">
          {data.week.map((d) => (
            <div key={d.date} className="flex flex-col items-center gap-1.5">
              <div className="relative flex h-32 w-full items-end overflow-hidden rounded-xl bg-mint-50 dark:bg-night-700">
                <div className="w-full rounded-xl bg-gradient-to-t from-brand-600 to-brand-400 transition-[height] duration-700" style={{ height: `${d.future ? 0 : Math.max(d.percent, 3)}%` }} />
              </div>
              <span className="text-[11px] font-semibold muted">{formatDayName(d.date).slice(0, 3)}</span>
              <span className="text-[11px] font-bold">{d.future ? "–" : `${Math.round(d.percent)}%`}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle title="30 hari terakhir" sub="Semakin gelap, semakin lengkap harinya" />
        <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
          {data.last30.map((d) => (
            <div
              key={d.date}
              className={cn("aspect-square rounded-md", heat(d.percent))}
              title={`${formatDate(d.date)} · ${Math.round(d.percent)}%`}
              aria-label={`${formatDate(d.date)} ${Math.round(d.percent)} persen`}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] muted">
          Sedikit {[0, 20, 50, 80, 100].map((p) => <span key={p} className={cn("h-3 w-3 rounded", heat(p))} />)} Lengkap
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Goal progress" sub={`Rata-rata goal aktif: ${Math.round(data.goalAverage)}%`} />
          {data.goals.length === 0 ? <p className="text-sm muted">Belum ada goal.</p> : (
            <ul className="space-y-3.5">
              {data.goals.map((g) => (
                <li key={g.id}>
                  <div className="mb-1 flex justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{g.status === "completed" ? "✅ " : ""}{g.title}</span>
                    <span className="shrink-0 font-semibold">{Math.round(g.progress)}%</span>
                  </div>
                  <ProgressBar value={g.progress} label={g.title} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <SectionTitle title="Habit progress" sub="Completion rate 30 hari" />
          {data.habits.length === 0 ? <p className="text-sm muted">Belum ada habit.</p> : (
            <ul className="space-y-3.5">
              {data.habits.map((h) => (
                <li key={h.id}>
                  <div className="mb-1 flex justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{h.icon} {h.name}</span>
                    <span className="shrink-0 muted">🔥 {h.currentStreak} · {Math.round(h.completionRate)}%</span>
                  </div>
                  <ProgressBar value={h.completionRate} label={h.name} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-amberSoft-500/15 text-3xl">🔥</div>
        <div>
          <div className="font-display text-2xl font-bold">{data.streak.current} day journal streak</div>
          <p className="text-sm muted">Longest streak: {data.streak.longest} days</p>
        </div>
      </Card>
    </div>
  );
}
