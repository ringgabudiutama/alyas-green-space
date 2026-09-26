"use client";
import { useEffect, useState } from "react";
import { api, cn, useApi } from "@/lib/client";
import { Card, ConfirmSheet, EmptyState, ErrorBox, Field, PageHeader, SectionTitle, Sheet, Skeleton, Toggle, useToast } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { addDays, diffDays, formatDayName } from "@/lib/dates";
import { HABIT_CATEGORIES } from "@/lib/format";

type H = {
  id: number; name: string; category: string; icon: string | null; target_minutes: number | null; is_active: number;
  logs: string[]; doneToday: boolean; currentStreak: number; longestStreak: number; completionRate: number;
};
type Resp = { from: string; to: string; today: string; items: H[] };

export default function HabitsPage() {
  const toast = useToast();
  const [offset, setOffset] = useState(0); // geser jendela 14 hari
  const [end, setEnd] = useState<string | null>(null);
  const url = end ? `/api/habits?from=${addDays(end, -13)}&to=${end}` : "/api/habits";
  const { data, loading, error, reload, setData } = useApi<Resp>(url);
  const [edit, setEdit] = useState<H | "new" | null>(null);
  const [del, setDel] = useState<H | null>(null);

  useEffect(() => {
    if (data && !end) setEnd(data.today);
  }, [data, end]);

  const toggle = async (h: H, date: string) => {
    if (!data) return;
    const was = h.logs.includes(date);
    // optimistic update
    setData({
      ...data,
      items: data.items.map((x) => (x.id === h.id ? { ...x, logs: was ? x.logs.filter((d) => d !== date) : [...x.logs, date], doneToday: date === data.today ? !was : x.doneToday } : x)),
    });
    try {
      const r = await api<{ done: boolean }>(`/api/habits/${h.id}/toggle`, { body: { date } });
      if (r.done && date === data.today) toast(`${h.icon || "🌱"} ${h.name} — done!`);
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
      reload();
    }
  };

  if (loading && !data) return <div className="space-y-3"><Skeleton className="h-10 w-48" /><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;
  if (error || !data) return <ErrorBox message={error || "Gagal memuat"} onRetry={reload} />;

  const active = data.items.filter((h) => h.is_active);
  const days = Array.from({ length: diffDays(data.to, data.from) + 1 }, (_, i) => addDays(data.from, i));
  const doneCount = active.filter((h) => h.doneToday).length;

  return (
    <div className="space-y-5">
      <PageHeader title="Habit Tracker" sub={`${doneCount}/${active.length} habit selesai hari ini`} action={<button className="btn-primary" onClick={() => setEdit("new")}><Icon name="plus" size={16} /> Habit</button>} />

      {active.length === 0 ? (
        <EmptyState icon="🌱" title="Belum ada habit" text="Reading, Exercise, Drinking Water, Study… mulai dari satu saja." action={<button className="btn-primary" onClick={() => setEdit("new")}>Buat habit</button>} />
      ) : (
        <>
          <section>
            <SectionTitle title="Hari ini" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {active.map((h) => (
                <button
                  key={h.id}
                  onClick={() => toggle(h, data.today)}
                  className={cn(
                    "relative flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition active:scale-[0.97]",
                    h.doneToday ? "border-brand-500 bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lift" : "border-[var(--line)] bg-[var(--card)] hover:border-brand-300"
                  )}
                >
                  <span className="text-3xl">{h.icon || "✨"}</span>
                  <span className="font-semibold">{h.name}</span>
                  <span className={cn("text-xs", h.doneToday ? "text-mint-100" : "muted")}>🔥 {h.currentStreak} hari · {Math.round(h.completionRate)}%</span>
                  <span className={cn("absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full border-2", h.doneToday ? "border-white bg-white text-brand-700 animate-pop" : "border-[var(--line)]")}>
                    {h.doneToday && <Icon name="check" size={16} />}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <Card className="p-0">
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="font-display text-lg font-semibold">Habit Calendar</h2>
              <div className="flex gap-1">
                <button className="grid h-9 w-9 place-items-center rounded-full hover:bg-mint-100 dark:hover:bg-night-600" onClick={() => { setOffset(offset + 1); setEnd(addDays(end!, -14)); }} aria-label="Sebelumnya">
                  <Icon name="back" />
                </button>
                <button
                  className="grid h-9 w-9 rotate-180 place-items-center rounded-full hover:bg-mint-100 disabled:opacity-30 dark:hover:bg-night-600"
                  disabled={offset === 0}
                  onClick={() => { setOffset(offset - 1); setEnd(addDays(end!, 14)); }}
                  aria-label="Berikutnya"
                >
                  <Icon name="back" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto px-5 pb-5 pt-3">
              <table className="w-full border-separate border-spacing-1 text-center text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 min-w-[110px] bg-[var(--card)] text-left font-semibold muted">Habit</th>
                    {days.map((d) => (
                      <th key={d} className={cn("min-w-[34px] font-semibold", d === data.today ? "text-brand-700 dark:text-mint-200" : "muted")}>
                        <div>{formatDayName(d).slice(0, 2)}</div>
                        <div className="text-sm">{Number(d.slice(8))}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {active.map((h) => (
                    <tr key={h.id}>
                      <td className="sticky left-0 z-10 truncate bg-[var(--card)] pr-2 text-left text-sm font-medium">{h.icon} {h.name}</td>
                      {days.map((d) => {
                        const done = h.logs.includes(d);
                        const future = d > data.today;
                        return (
                          <td key={d}>
                            <button
                              disabled={future}
                              onClick={() => toggle(h, d)}
                              className={cn(
                                "grid h-8 w-8 place-items-center rounded-lg transition",
                                done ? "bg-brand-600 text-white" : future ? "bg-transparent" : "bg-mint-50 hover:bg-mint-100 dark:bg-night-700 dark:hover:bg-night-600"
                              )}
                              aria-label={`${h.name} ${d} ${done ? "selesai" : "belum"}`}
                            >
                              {done && <Icon name="check" size={14} />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <section>
            <SectionTitle title="Statistik" />
            <div className="grid gap-3 md:grid-cols-2">
              {data.items.map((h) => (
                <Card key={h.id} className={cn("p-4", !h.is_active && "opacity-60")}>
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-mint-100 text-2xl dark:bg-night-600">{h.icon || "✨"}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{h.name} {!h.is_active && <span className="text-xs muted">(nonaktif)</span>}</div>
                      <div className="text-xs muted">{HABIT_CATEGORIES.find((c) => c.key === h.category)?.label}{h.target_minutes ? ` · ${h.target_minutes} menit` : ""}</div>
                    </div>
                    <button className="grid h-9 w-9 place-items-center rounded-full hover:bg-mint-100 dark:hover:bg-night-600" onClick={() => setEdit(h)} aria-label="Edit"><Icon name="edit" size={16} /></button>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-mint-50 p-2 dark:bg-night-700"><dt className="text-[11px] muted">Current</dt><dd className="font-bold">{h.currentStreak} 🔥</dd></div>
                    <div className="rounded-xl bg-mint-50 p-2 dark:bg-night-700"><dt className="text-[11px] muted">Longest</dt><dd className="font-bold">{h.longestStreak}</dd></div>
                    <div className="rounded-xl bg-mint-50 p-2 dark:bg-night-700"><dt className="text-[11px] muted">30 hari</dt><dd className="font-bold">{Math.round(h.completionRate)}%</dd></div>
                  </dl>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}

      <HabitForm
        open={edit !== null}
        habit={edit === "new" ? null : edit}
        onClose={() => setEdit(null)}
        onSaved={() => { setEdit(null); reload(); toast("Habit tersimpan 🌱"); }}
        onDelete={(h) => { setEdit(null); setDel(h); }}
      />
      <ConfirmSheet
        open={!!del}
        onClose={() => setDel(null)}
        title="Hapus habit?"
        text="Semua riwayat centang habit ini juga akan terhapus. Kalau hanya ingin berhenti sementara, nonaktifkan saja."
        onConfirm={async () => {
          if (!del) return;
          await api(`/api/habits/${del.id}`, { method: "DELETE" }).catch((e) => toast(e.message, "error"));
          setDel(null);
          reload();
        }}
      />
    </div>
  );
}

function HabitForm({ open, habit, onClose, onSaved, onDelete }: { open: boolean; habit: H | null; onClose: () => void; onSaved: () => void; onDelete: (h: H) => void }) {
  const toast = useToast();
  const [f, setF] = useState({ name: "", category: "reading", icon: "📖", targetMinutes: "" as number | "", isActive: true });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setF(
      habit
        ? { name: habit.name, category: habit.category, icon: habit.icon || "", targetMinutes: habit.target_minutes ?? "", isActive: !!habit.is_active }
        : { name: "", category: "reading", icon: "📖", targetMinutes: "", isActive: true }
    );
  }, [open, habit]);
  const submit = async () => {
    setBusy(true);
    try {
      const body = { ...f, icon: f.icon || null, targetMinutes: f.targetMinutes === "" ? null : Number(f.targetMinutes) };
      await api(habit ? `/api/habits/${habit.id}` : "/api/habits", { method: habit ? "PUT" : "POST", body });
      onSaved();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={habit ? "Edit habit" : "Habit baru"}
      footer={
        <div className="flex gap-2">
          {habit && <button className="btn-danger" onClick={() => onDelete(habit)} aria-label="Hapus"><Icon name="trash" size={16} /></button>}
          <button className="btn-primary flex-1 py-3" disabled={busy || !f.name.trim()} onClick={submit}>{busy ? "Menyimpan…" : "Simpan"}</button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <span className="label">Jenis</span>
          <div className="grid grid-cols-4 gap-2">
            {HABIT_CATEGORIES.map((c) => (
              <button
                type="button"
                key={c.key}
                onClick={() => setF({ ...f, category: c.key, icon: c.icon, name: f.name || (c.key === "other" ? "" : c.label) })}
                className={cn("flex flex-col items-center gap-1 rounded-xl border py-2.5 text-[11px] font-semibold", f.category === c.key ? "border-brand-500 bg-brand-600 text-white" : "border-[var(--line)]")}
              >
                <span className="text-xl">{c.icon}</span>
                <span className="truncate px-1">{c.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-[80px_1fr] gap-3">
          <Field label="Ikon"><input className="input text-center text-xl" value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value.slice(0, 8) })} /></Field>
          <Field label="Nama habit"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        </div>
        <Field label="Durasi per hari (menit, opsional)" hint="Dipakai untuk menghitung jam belajar di Monthly Recap (kategori Study & Reading).">
          <input type="number" min={0} className="input" value={f.targetMinutes} onChange={(e) => setF({ ...f, targetMinutes: e.target.value === "" ? "" : Number(e.target.value) })} />
        </Field>
        {habit && <Toggle checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} label="Aktif" sub="Habit nonaktif tidak muncul di checklist harian." />}
      </div>
    </Sheet>
  );
}
