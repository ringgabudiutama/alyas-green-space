"use client";
import { useState } from "react";
import { useApi } from "@/lib/client";
import { Card, ErrorBox, PageHeader, PageSkeleton, ProgressBar, SectionTitle, StatCard } from "@/components/ui";
import { IncomeExpenseChart, SingleBarChart } from "@/components/charts";
import { Icon } from "@/components/Icon";
import { monthShort, todayStr } from "@/lib/dates";
import { moodOf, rupiah, rupiahShort } from "@/lib/format";

type Y = {
  year: number; totalJournals: number; totalGoalsCompleted: number; longestStreak: number;
  finance: { income: number; expense: number; saving: number; net: number };
  mostFrequentMood: string | null; moods: { mood: string; n: number }[]; habitCompletion: number; learningHours: number;
  months: { month: string; income: number; expense: number; saving: number; journals: number; goals: number }[];
};

export default function YearlyRecap() {
  const thisYear = Number(todayStr().slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const { data, error, loading, reload } = useApi<Y>(`/api/recap/yearly?year=${year}`);
  const [table, setTable] = useState(false);
  if (loading && !data) return <PageSkeleton />;
  if (error || !data) return <ErrorBox message={error || "Gagal memuat"} onRetry={reload} />;
  const mood = moodOf(data.mostFrequentMood);
  const labels = data.months.map((m) => monthShort(m.month));
  const totalMood = data.moods.reduce((a, m) => a + m.n, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Year ${year}`}
        sub="Setahun perjalananmu dalam angka."
        action={
          <div className="flex items-center gap-1">
            <button className="btn-soft px-3" onClick={() => setYear(year - 1)} aria-label="Tahun sebelumnya"><Icon name="back" size={16} /></button>
            <button className="btn-soft px-3" disabled={year >= thisYear} onClick={() => setYear(year + 1)} aria-label="Tahun berikutnya"><Icon name="back" size={16} className="rotate-180" /></button>
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard icon="📝" label="Total Journal" value={data.totalJournals} />
        <StatCard icon="🏆" label="Goals Completed" value={data.totalGoalsCompleted} />
        <StatCard icon="🔥" label="Longest Streak" value={data.longestStreak} format={(n) => `${Math.round(n)} days`} />
        <StatCard icon="💼" label="Total Income" value={data.finance.income} format={rupiahShort} hint={rupiah(data.finance.income)} />
        <StatCard icon="🧾" label="Total Expense" value={data.finance.expense} format={rupiahShort} hint={rupiah(data.finance.expense)} />
        <StatCard icon="🌱" label="Total Saving" value={data.finance.saving} format={rupiahShort} hint={rupiah(data.finance.saving)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide muted">Most frequent mood</p>
          <p className="mt-1 text-2xl font-bold">{mood ? `${mood.emoji} ${mood.label}` : "-"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide muted">Habit completion</p>
          <p className="mt-1 text-2xl font-bold">{Math.round(data.habitCompletion)}%</p>
          <ProgressBar value={data.habitCompletion} className="mt-2 h-1.5" />
        </Card>
      </div>

      <Card>
        <SectionTitle title="Income vs Expense" sub="Per bulan" action={<button className="text-xs font-semibold text-brand-600" onClick={() => setTable(!table)}>{table ? "Grafik" : "Tabel"}</button>} />
        {table ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs muted"><th className="py-1">Bulan</th><th className="text-right">Income</th><th className="text-right">Expense</th><th className="text-right">Saving</th><th className="text-right">Journal</th></tr></thead>
              <tbody>
                {data.months.map((m) => (
                  <tr key={m.month} className="border-t border-[var(--line)]">
                    <td className="py-2">{monthShort(m.month)}</td>
                    <td className="text-right tabular-nums">{rupiahShort(m.income)}</td>
                    <td className="text-right tabular-nums">{rupiahShort(m.expense)}</td>
                    <td className="text-right tabular-nums">{rupiahShort(m.saving)}</td>
                    <td className="text-right tabular-nums">{m.journals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <IncomeExpenseChart labels={labels} income={data.months.map((m) => m.income)} expense={data.months.map((m) => m.expense)} height={260} />
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Journal per bulan" />
          <SingleBarChart labels={labels} values={data.months.map((m) => m.journals)} label="Journal" />
        </Card>
        <Card>
          <SectionTitle title="Goals selesai per bulan" />
          <SingleBarChart labels={labels} values={data.months.map((m) => m.goals)} label="Goals" />
        </Card>
      </div>

      <Card>
        <SectionTitle title="Mood sepanjang tahun" />
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
      <p className="text-center text-sm muted">📚 {data.learningHours.toLocaleString("id-ID")} jam belajar & membaca tahun ini</p>
    </div>
  );
}
