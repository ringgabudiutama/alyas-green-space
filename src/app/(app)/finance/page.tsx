"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, useApi } from "@/lib/client";
import { Card, ErrorBox, Field, MoneyInput, PageHeader, PageSkeleton, ProgressBar, SectionTitle, Sheet, StatCard, useToast } from "@/components/ui";
import { CategoryBars, IncomeExpenseChart, SingleBarChart } from "@/components/charts";
import { Icon } from "@/components/Icon";
import { addMonths, currentMonth, formatMonth, monthShort } from "@/lib/dates";
import { rupiah, rupiahShort } from "@/lib/format";

type Summary = {
  month: string;
  overview: {
    totalBalance: number; totalIncome: number; totalExpense: number; totalSaving: number; monthlyBudget: number;
    savings: { id: number; title: string; emoji: string | null; current_amount: number; target_amount: number; progress: number }[];
  };
  totals: { income: number; expense: number; saving: number; net: number };
  byCategory: { name: string; icon: string | null; total: number }[];
  series: { month: string; income: number; expense: number; saving: number }[];
  daily: { date: string; expense: number }[];
  budgetUsed: number | null;
  insights: string[];
};

export default function FinancePage() {
  const [month, setMonth] = useState(currentMonth());
  const { data, error, loading, reload } = useApi<Summary>(`/api/finance/summary?month=${month}`);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [table, setTable] = useState(false);

  if (loading && !data) return <PageSkeleton />;
  if (error || !data) return <ErrorBox message={error || "Gagal memuat"} onRetry={reload} />;
  const o = data.overview;

  // expense harian lengkap untuk bulan terpilih
  const days = Number(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate());
  const dmap = new Map(data.daily.map((d) => [d.date, d.expense]));
  const dailyLabels = Array.from({ length: days }, (_, i) => String(i + 1));
  const dailyValues = dailyLabels.map((d) => dmap.get(`${month}-${d.padStart(2, "0")}`) || 0);

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Finance"
        sub="Catatan keuanganmu, apa adanya."
        action={
          <Link href="/finance/transactions?new=1" className="btn-primary">
            <Icon name="plus" size={16} /> Transaksi
          </Link>
        }
      />

      {/* Ringkasan keseluruhan */}
      <div className="rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-forest-800 p-5 text-white shadow-lift sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-mint-200">Total Balance</p>
        <p className="mt-1 font-display text-3xl font-bold sm:text-4xl">{rupiah(o.totalBalance)}</p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div><p className="text-xs text-mint-200">Total Income</p><p className="font-semibold">{rupiahShort(o.totalIncome)}</p></div>
          <div><p className="text-xs text-mint-200">Total Expense</p><p className="font-semibold">{rupiahShort(o.totalExpense)}</p></div>
          <div><p className="text-xs text-mint-200">Total Saving</p><p className="font-semibold">{rupiahShort(o.totalSaving)}</p></div>
        </div>
      </div>

      {/* Pilih bulan */}
      <div className="flex items-center justify-between">
        <button className="btn-ghost" onClick={() => setMonth(addMonths(month, -1))}><Icon name="back" size={16} /> {monthShort(addMonths(month, -1))}</button>
        <div className="font-display text-lg font-semibold">{formatMonth(month)}</div>
        <button className="btn-ghost" disabled={month >= currentMonth()} onClick={() => setMonth(addMonths(month, 1))}>
          {monthShort(addMonths(month, 1))} <Icon name="back" size={16} className="rotate-180" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon="💼" label="Income" value={data.totals.income} format={rupiahShort} hint={rupiah(data.totals.income)} />
        <StatCard icon="🧾" label="Expense" value={data.totals.expense} format={rupiahShort} hint={rupiah(data.totals.expense)} />
        <StatCard icon="🌱" label="Saving" value={data.totals.saving} format={rupiahShort} hint={rupiah(data.totals.saving)} />
        <button onClick={() => setBudgetOpen(true)} className="card flex flex-col gap-1 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lift">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide muted">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-mint-100 text-sm dark:bg-night-600">🎯</span> Monthly Budget
          </div>
          <div className="mt-1 text-xl font-bold text-brand-900 dark:text-mint-100 sm:text-2xl">{o.monthlyBudget ? rupiahShort(o.monthlyBudget) : "Atur"}</div>
          {data.budgetUsed !== null ? (
            <>
              <ProgressBar value={data.budgetUsed} tone={data.budgetUsed >= 100 ? "amber" : "brand"} className="h-1.5" />
              <div className="text-xs muted">{Math.round(data.budgetUsed)}% terpakai</div>
            </>
          ) : (
            <div className="text-xs muted">Ketuk untuk mengatur</div>
          )}
        </button>
      </div>

      {data.insights.length > 0 && (
        <Card className="bg-mint-50 dark:bg-night-700">
          <SectionTitle title="Insights" sub="Fakta dari datamu bulan ini" />
          <ul className="space-y-2 text-sm">
            {data.insights.map((i) => (
              <li key={i} className="flex gap-2"><span aria-hidden>🤖</span><span>{i}</span></li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle
            title="Income vs Expense"
            sub="6 bulan terakhir"
            action={<button className="text-xs font-semibold text-brand-600" onClick={() => setTable(!table)}>{table ? "Grafik" : "Tabel"}</button>}
          />
          {table ? (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs muted"><th className="py-1">Bulan</th><th className="text-right">Income</th><th className="text-right">Expense</th></tr></thead>
              <tbody>
                {data.series.map((s) => (
                  <tr key={s.month} className="border-t border-[var(--line)]">
                    <td className="py-2">{formatMonth(s.month)}</td>
                    <td className="text-right tabular-nums">{rupiah(s.income)}</td>
                    <td className="text-right tabular-nums">{rupiah(s.expense)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <IncomeExpenseChart labels={data.series.map((s) => monthShort(s.month))} income={data.series.map((s) => s.income)} expense={data.series.map((s) => s.expense)} />
          )}
        </Card>
        <Card>
          <SectionTitle title="Monthly Expense" sub={`Pengeluaran harian · ${formatMonth(month)}`} />
          <SingleBarChart labels={dailyLabels} values={dailyValues} label="Expense" money />
        </Card>
        <Card>
          <SectionTitle title="Expense by Category" sub={formatMonth(month)} />
          {data.byCategory.length ? <CategoryBars items={data.byCategory} /> : <p className="text-sm muted">Belum ada pengeluaran bulan ini.</p>}
        </Card>
        <Card>
          <SectionTitle title="Saving Progress" action={<Link href="/savings" className="text-sm font-semibold text-brand-600">Kelola →</Link>} />
          {o.savings.length === 0 ? (
            <p className="text-sm muted">Belum ada saving goal. <Link href="/savings" className="font-semibold text-brand-600">Buat →</Link></p>
          ) : (
            <ul className="space-y-4">
              {o.savings.map((s) => (
                <li key={s.id}>
                  <div className="mb-1 flex justify-between gap-2 text-sm">
                    <span className="truncate font-semibold">{s.emoji} {s.title}</span>
                    <span className="shrink-0 muted">{Math.round(s.progress)}%</span>
                  </div>
                  <ProgressBar value={s.progress} label={s.title} />
                  <div className="mt-1 text-xs muted">{rupiah(s.current_amount)} / {rupiah(s.target_amount)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Link href="/finance/transactions" className="card flex items-center justify-between p-4 font-semibold transition hover:shadow-lift">
        <span className="flex items-center gap-3"><Icon name="file" /> Semua transaksi</span>
        <Icon name="back" className="rotate-180" />
      </Link>

      <BudgetSheet open={budgetOpen} current={o.monthlyBudget} onClose={() => setBudgetOpen(false)} onSaved={() => { setBudgetOpen(false); reload(); }} />
    </div>
  );
}

function BudgetSheet({ open, current, onClose, onSaved }: { open: boolean; current: number; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [v, setV] = useState<number | "">(current || "");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setV(current || "");
  }, [open, current]);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Monthly budget"
      footer={
        <button
          className="btn-primary w-full py-3"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api("/api/settings", { method: "PUT", body: { monthlyBudget: Number(v || 0) } });
              toast("Budget tersimpan");
              onSaved();
            } catch (e) {
              toast((e as Error).message, "error");
            } finally {
              setBusy(false);
            }
          }}
        >
          Simpan
        </button>
      }
    >
      <Field label="Budget pengeluaran per bulan" hint="Isi 0 untuk menonaktifkan.">
        <MoneyInput value={v} onChange={setV} />
      </Field>
    </Sheet>
  );
}
