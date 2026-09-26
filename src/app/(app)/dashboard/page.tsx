"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, cn, useApi } from "@/lib/client";
import { Card, ErrorBox, PageSkeleton, ProgressBar, ProgressRing, SectionTitle, StatCard, useToast } from "@/components/ui";
import { LumiBubble } from "@/components/Lumi";
import { Avatar } from "@/components/brand";
import { Icon } from "@/components/Icon";
import { useShell } from "@/components/AppShell";
import { formatDate, formatDayName } from "@/lib/dates";
import { moodOf, rupiah, rupiahShort } from "@/lib/format";
import type { LumiMessage } from "@/lib/lumi";

type Dash = {
  today: string;
  greeting: { title: string; sub: string };
  lumi: LumiMessage;
  mood: string | null;
  progress: { overall: number; items: { key: string; label: string; percent: number; detail: string; href: string }[] };
  stats: { streak: number; longestStreak: number; activeGoals: number; completedGoals: number; monthlyIncome: number; monthlyExpense: number; monthlySaving: number };
  upcomingGoals: { id: number; title: string; progress: number; deadline: string | null; computed_status: string }[];
  recentJournals: { id: number; title: string; mood: string | null; entry_date: string; excerpt: string }[];
  habits: { id: number; name: string; icon: string | null; doneToday: boolean; currentStreak: number }[];
  unread: number;
};

export default function DashboardPage() {
  const { data, error, loading, reload, setData } = useApi<Dash>("/api/dashboard");
  const { user, setUnread } = useShell();
  const toast = useToast();
  const [busyHabit, setBusyHabit] = useState<number | null>(null);
  useEffect(() => {
    if (data) setUnread(data.unread);
  }, [data, setUnread]);

  if (loading && !data) return <PageSkeleton />;
  if (error || !data) return <ErrorBox message={error || "Gagal memuat"} onRetry={reload} />;

  const mood = moodOf(data.mood);

  const toggleHabit = async (id: number) => {
    setBusyHabit(id);
    try {
      const r = await api<{ done: boolean }>(`/api/habits/${id}/toggle`, { body: { date: data.today } });
      setData({ ...data, habits: data.habits.map((h) => (h.id === id ? { ...h, doneToday: r.done } : h)) });
      if (r.done) toast("Habit tercentang! 🌱");
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusyHabit(null);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-forest-800 p-5 text-white shadow-lift sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 right-20 h-40 w-40 rounded-full bg-mint-300/10" />
        <div className="relative flex items-center gap-4">
          <Avatar src={user.photo_url} name={user.full_name} size={64} className="ring-4 ring-white/25" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-mint-200">
              {formatDayName(data.today)}, {formatDate(data.today)}
            </p>
            <h1 className="mt-0.5 font-display text-2xl font-bold leading-tight sm:text-3xl">{data.greeting.title}</h1>
            <p className="text-sm text-mint-100">&ldquo;{data.greeting.sub}&rdquo;</p>
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          <Link href="/welcome" className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur hover:bg-white/25">
            {mood ? `${mood.emoji} Feeling ${mood.label}` : "🙂 Pilih mood hari ini"}
          </Link>
          <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">🔥 {data.stats.streak} day streak</span>
        </div>
      </section>

      {/* Lumi */}
      <Card className="bg-gradient-to-br from-mint-50 to-[var(--card)] dark:from-night-700">
        <LumiBubble expression={data.lumi.expression} message={data.lumi.message} size={84} />
      </Card>

      {/* Today's progress */}
      <Card>
        <SectionTitle title="Today's Progress" sub="Langkah kecil hari ini" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4 sm:flex-col sm:gap-2">
            <ProgressRing value={data.progress.overall} size={96} stroke={9}>
              <span className="text-xl">{Math.round(data.progress.overall)}%</span>
            </ProgressRing>
            <p className="text-sm soft sm:text-center">Overall today</p>
          </div>
          <div className="-mx-1 flex flex-1 gap-3 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible">
            {data.progress.items.map((i) => (
              <Link
                key={i.key}
                href={i.href}
                className="flex min-w-[110px] flex-col items-center gap-2 rounded-2xl bg-mint-50 p-3 text-center transition hover:-translate-y-0.5 hover:shadow-soft dark:bg-night-700"
              >
                <ProgressRing value={i.percent} size={54} stroke={6} />
                <span className="text-xs font-bold">{i.label}</span>
                <span className="-mt-1 text-[11px] muted">{i.detail}</span>
              </Link>
            ))}
          </div>
        </div>
      </Card>

      {/* Quick statistics */}
      <section>
        <SectionTitle title="Quick Statistics" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard icon="🔥" label="Journal Streak" value={data.stats.streak} format={(n) => `${Math.round(n)} days`} hint={`Longest: ${data.stats.longestStreak} days`} />
          <StatCard icon="🎯" label="Active Goals" value={data.stats.activeGoals} />
          <StatCard icon="🏆" label="Completed Goals" value={data.stats.completedGoals} />
          <StatCard icon="💼" label="Monthly Income" value={data.stats.monthlyIncome} format={(n) => rupiahShort(n)} hint={rupiah(data.stats.monthlyIncome)} />
          <StatCard icon="🧾" label="Monthly Expense" value={data.stats.monthlyExpense} format={(n) => rupiahShort(n)} hint={rupiah(data.stats.monthlyExpense)} />
          <StatCard icon="🌱" label="Monthly Saving" value={data.stats.monthlySaving} format={(n) => rupiahShort(n)} hint={rupiah(data.stats.monthlySaving)} />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Habits hari ini */}
        <Card>
          <SectionTitle
            title="Habits Today"
            action={
              <Link href="/habits" className="text-sm font-semibold text-brand-600">
                Semua →
              </Link>
            }
          />
          {data.habits.length === 0 ? (
            <p className="text-sm muted">
              Belum ada habit. <Link href="/habits" className="font-semibold text-brand-600">Buat habit pertama →</Link>
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {data.habits.map((h) => (
                <button
                  key={h.id}
                  onClick={() => toggleHabit(h.id)}
                  disabled={busyHabit === h.id}
                  className={cn(
                    "flex items-center gap-2.5 rounded-2xl border p-3 text-left text-sm font-semibold transition active:scale-[0.97]",
                    h.doneToday ? "border-brand-500 bg-brand-600 text-white" : "border-[var(--line)] hover:border-brand-300"
                  )}
                >
                  <span className="text-xl" aria-hidden>{h.icon || "✨"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{h.name}</span>
                    <span className={cn("block text-[11px] font-medium", h.doneToday ? "text-mint-100" : "muted")}>🔥 {h.currentStreak} hari</span>
                  </span>
                  <span className={cn("grid h-6 w-6 place-items-center rounded-full border-2", h.doneToday ? "border-white bg-white text-brand-700" : "border-[var(--line)]")}>
                    {h.doneToday && <Icon name="check" size={14} />}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Goals */}
        <Card>
          <SectionTitle title="Goals in Progress" action={<Link href="/goals" className="text-sm font-semibold text-brand-600">Semua →</Link>} />
          {data.upcomingGoals.length === 0 ? (
            <p className="text-sm muted">Tidak ada goal aktif. <Link href="/goals?new=1" className="font-semibold text-brand-600">Buat goal →</Link></p>
          ) : (
            <ul className="space-y-4">
              {data.upcomingGoals.map((g) => (
                <li key={g.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-semibold">{g.title}</span>
                    <span className="shrink-0 font-bold text-brand-700 dark:text-mint-200">{Math.round(g.progress)}%</span>
                  </div>
                  <ProgressBar value={g.progress} label={g.title} />
                  <div className="mt-1 text-xs muted">
                    {g.computed_status === "overdue" ? "⏰ Lewat deadline" : g.deadline ? `Deadline ${formatDate(g.deadline)}` : "Tanpa deadline"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Recent journals */}
      <section>
        <SectionTitle title="Recent Journals" action={<Link href="/journal" className="text-sm font-semibold text-brand-600">Semua →</Link>} />
        {data.recentJournals.length === 0 ? (
          <Card>
            <p className="text-sm muted">
              Belum ada journal. <Link href="/journal/new" className="font-semibold text-brand-600">Tulis yang pertama →</Link>
            </p>
          </Card>
        ) : (
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
            {data.recentJournals.map((j) => (
              <Link key={j.id} href={`/journal/${j.id}`} className="card min-w-[250px] snap-start p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex items-center justify-between text-xs muted">
                  <span>{formatDate(j.entry_date)}</span>
                  <span className="text-lg">{moodOf(j.mood)?.emoji}</span>
                </div>
                <h3 className="mt-1 line-clamp-1 font-display font-semibold text-brand-900 dark:text-mint-100">{j.title}</h3>
                <p className="mt-1 line-clamp-3 text-sm soft">{j.excerpt}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
