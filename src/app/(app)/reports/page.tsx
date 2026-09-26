"use client";
import { useState } from "react";
import { Card, Field, PageHeader, Segmented } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { currentMonth, todayStr } from "@/lib/dates";

export default function ReportsPage() {
  const [jr, setJr] = useState<"today" | "week" | "month" | "custom">("month");
  const [fr, setFr] = useState<"month" | "year" | "custom">("month");
  const [gf, setGf] = useState<"all" | "completed" | "active">("all");
  const [from, setFrom] = useState(todayStr().slice(0, 8) + "01");
  const [to, setTo] = useState(todayStr());
  const [month, setMonth] = useState(currentMonth());
  const [year, setYear] = useState(todayStr().slice(0, 4));

  const q = (o: Record<string, string>) => `/api/reports/pdf?${new URLSearchParams(o)}`;
  const Range = () => (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Dari"><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
      <Field label="Sampai"><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
    </div>
  );
  const Btn = ({ href }: { href: string }) => (
    <a href={href} className="btn-primary w-full py-3"><Icon name="download" size={16} /> Export PDF</a>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Export PDF" sub="Laporan rapi, datanya langsung dari database." />
      <Card className="space-y-4">
        <h2 className="font-display text-lg font-semibold">📝 Journal Report</h2>
        <Segmented value={jr} onChange={setJr} options={[{ value: "today", label: "Today" }, { value: "week", label: "This week" }, { value: "month", label: "This month" }, { value: "custom", label: "Custom" }]} />
        {jr === "custom" && <Range />}
        <Btn href={q(jr === "custom" ? { type: "journal", range: jr, from, to } : { type: "journal", range: jr })} />
      </Card>
      <Card className="space-y-4">
        <h2 className="font-display text-lg font-semibold">💰 Financial Report</h2>
        <Segmented value={fr} onChange={setFr} options={[{ value: "month", label: "Monthly" }, { value: "year", label: "Yearly" }, { value: "custom", label: "Custom" }]} />
        {fr === "month" && <Field label="Bulan"><input type="month" className="input" value={month} onChange={(e) => setMonth(e.target.value)} /></Field>}
        {fr === "year" && <Field label="Tahun"><input type="number" className="input" value={year} onChange={(e) => setYear(e.target.value)} /></Field>}
        {fr === "custom" && <Range />}
        <Btn href={q(fr === "month" ? { type: "finance", range: fr, month } : fr === "year" ? { type: "finance", range: fr, year } : { type: "finance", range: fr, from, to })} />
      </Card>
      <Card className="space-y-4">
        <h2 className="font-display text-lg font-semibold">🎯 Goal Report</h2>
        <Segmented value={gf} onChange={setGf} options={[{ value: "all", label: "All goals" }, { value: "completed", label: "Completed" }, { value: "active", label: "Active" }]} />
        <Btn href={q({ type: "goals", filter: gf })} />
      </Card>
      <Card className="space-y-4 bg-gradient-to-br from-mint-50 to-[var(--card)] dark:from-night-700">
        <h2 className="font-display text-lg font-semibold">🌿 Full Personal Report</h2>
        <p className="text-sm soft">Cover, overview, journal, goals, finance, habits, refleksi bulanan, grafik, dan pencapaian.</p>
        <Field label="Bulan"><input type="month" className="input" value={month} onChange={(e) => setMonth(e.target.value)} /></Field>
        <Btn href={q({ type: "full", month })} />
      </Card>
    </div>
  );
}
