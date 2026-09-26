"use client";
import { useEffect, useState } from "react";
import { api, useApi } from "@/lib/client";
import { Card, ErrorBox, Field, PageHeader, PageSkeleton, ProgressBar, SectionTitle, useToast } from "@/components/ui";
import { Lumi } from "@/components/Lumi";
import { Avatar } from "@/components/brand";
import { Icon } from "@/components/Icon";
import { useShell } from "@/components/AppShell";
import { addMonths, currentMonth, formatMonth } from "@/lib/dates";
import { moodOf, rupiah } from "@/lib/format";

type Recap = {
  month: string; journals: number; goalsCompleted: number; goalsCompletedList: { id: number; title: string }[]; longestStreak: number;
  finance: { income: number; expense: number; saving: number; net: number }; topExpense: { name: string; total: number } | null;
  favoriteMood: string | null; moods: { mood: string; n: number }[]; learningHours: number; habitCompletion: number; reflections: number; avgRating: number | null;
  review: { learned: string | null; proud: string | null; improve: string | null }; closing: string;
};

export default function MonthlyRecap() {
  const { user } = useShell();
  const toast = useToast();
  const [month, setMonth] = useState(currentMonth());
  const { data, loading, error, reload } = useApi<Recap>(`/api/recap/monthly?month=${month}`);
  const [rv, setRv] = useState({ learned: "", proud: "", improve: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) setRv({ learned: data.review.learned ?? "", proud: data.review.proud ?? "", improve: data.review.improve ?? "" });
  }, [data]);

  if (loading && !data) return <PageSkeleton />;
  if (error || !data) return <ErrorBox message={error || "Gagal memuat"} onRetry={reload} />;
  const mood = moodOf(data.favoriteMood);
  const totalMood = data.moods.reduce((a, m) => a + m.n, 0);

  const save = async () => {
    setBusy(true);
    try {
      await api("/api/recap/monthly", { method: "PUT", body: { month, ...rv } });
      toast("Refleksi bulanan tersimpan 🌿");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const tiles = [
    { icon: "📝", label: "Journal", value: `${data.journals} Entries` },
    { icon: "🏆", label: "Goals", value: `${data.goalsCompleted} Completed` },
    { icon: "🔥", label: "Streak", value: `${data.longestStreak} Days` },
    { icon: "🌱", label: "Saving", value: rupiah(data.finance.saving) },
    { icon: mood?.emoji || "🙂", label: "Favorite Mood", value: mood?.label || "-" },
    { icon: "📚", label: "Learning", value: `${data.learningHours.toLocaleString("id-ID")} Hours` },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Month in Review"
        action={
          <a className="btn-soft" href={`/api/reports/pdf?type=full&month=${month}`}>
            <Icon name="download" size={16} /> PDF
          </a>
        }
      />
      <div className="flex items-center justify-between">
        <button className="btn-ghost" onClick={() => setMonth(addMonths(month, -1))}><Icon name="back" size={16} /> Sebelumnya</button>
        <button className="btn-ghost" disabled={month >= currentMonth()} onClick={() => setMonth(addMonths(month, 1))}>Berikutnya <Icon name="back" size={16} className="rotate-180" /></button>
      </div>

      {/* Story card */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-forest-900 via-brand-800 to-brand-600 p-6 text-white shadow-lift sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-3">
          <Avatar src={user.photo_url} name={user.full_name} size={48} className="ring-2 ring-white/30" />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-mint-200">{user.full_name}</p>
            <h2 className="font-display text-3xl font-bold tracking-wide sm:text-4xl">{formatMonth(month).toUpperCase()}</h2>
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tiles.map((t, i) => (
            <div key={t.label} className="rounded-2xl bg-white/10 p-4 backdrop-blur animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="text-2xl">{t.icon}</div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-mint-200">{t.label}</div>
              <div className="text-lg font-bold leading-tight">{t.value}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Highlights" />
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between"><span className="muted">Income</span><span className="font-semibold">{rupiah(data.finance.income)}</span></li>
            <li className="flex justify-between"><span className="muted">Expense</span><span className="font-semibold">{rupiah(data.finance.expense)}</span></li>
            <li className="flex justify-between"><span className="muted">Top expense category</span><span className="font-semibold">{data.topExpense?.name ?? "-"}</span></li>
            <li className="flex justify-between"><span className="muted">Daily reflections</span><span className="font-semibold">{data.reflections}{data.avgRating ? ` · ⭐ ${data.avgRating}` : ""}</span></li>
            <li>
              <div className="mb-1 flex justify-between"><span className="muted">Habit completion</span><span className="font-semibold">{Math.round(data.habitCompletion)}%</span></div>
              <ProgressBar value={data.habitCompletion} />
            </li>
          </ul>
          {data.goalsCompletedList.length > 0 && (
            <div className="mt-4">
              <span className="label">Goals completed</span>
              <ul className="space-y-1.5 text-sm">{data.goalsCompletedList.map((g) => <li key={g.id}>✅ {g.title}</li>)}</ul>
            </div>
          )}
        </Card>
        <Card>
          <SectionTitle title="Mood bulan ini" />
          {data.moods.length === 0 ? <p className="text-sm muted">Belum ada data mood.</p> : (
            <ul className="space-y-3">
              {data.moods.map((m) => (
                <li key={m.mood}>
                  <div className="mb-1 flex justify-between text-sm"><span>{moodOf(m.mood)?.emoji} {moodOf(m.mood)?.label}</span><span className="muted">{m.n} hari</span></div>
                  <ProgressBar value={totalMood ? (m.n / totalMood) * 100 : 0} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="space-y-4">
        <SectionTitle title="Monthly Reflection" sub="Tulis dengan jujur — ini hanya untukmu." />
        <Field label="What I learned this month"><textarea className="input min-h-[80px]" value={rv.learned} onChange={(e) => setRv({ ...rv, learned: e.target.value })} /></Field>
        <Field label="What I'm proud of"><textarea className="input min-h-[80px]" value={rv.proud} onChange={(e) => setRv({ ...rv, proud: e.target.value })} /></Field>
        <Field label="What I want to improve"><textarea className="input min-h-[80px]" value={rv.improve} onChange={(e) => setRv({ ...rv, improve: e.target.value })} /></Field>
        <button className="btn-primary w-full py-3 sm:w-auto" onClick={save} disabled={busy}>{busy ? "Menyimpan…" : "Simpan refleksi bulanan"}</button>
      </Card>

      <div className="flex flex-col items-center py-4 text-center">
        <Lumi expression="celebrating" size={96} />
        <p className="mt-2 font-display text-2xl font-semibold text-brand-800 dark:text-mint-100">&ldquo;{data.closing}&rdquo;</p>
        <p className="text-sm muted">— Lumi</p>
      </div>
    </div>
  );
}
