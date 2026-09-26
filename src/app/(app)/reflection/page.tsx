"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, cn, useApi } from "@/lib/client";
import { Card, Field, PageHeader, Skeleton, useToast } from "@/components/ui";
import { LumiBubble } from "@/components/Lumi";
import { dayPeriod, formatDate, isValidYmd, todayStr } from "@/lib/dates";

type R = { happy_moment: string | null; lesson: string | null; improvement: string | null; rating: number | null; reflection_date: string };

function Reflection() {
  const params = useSearchParams();
  const toast = useToast();
  const initialDate = params.get("date");
  const [date, setDate] = useState(isValidYmd(initialDate) ? initialDate : todayStr());
  const { data, loading } = useApi<{ reflection: R | null; journal: { id: number; title: string } | null }>(`/api/reflections?date=${date}`);
  const history = useApi<{ items: R[] }>("/api/reflections?limit=14");
  const [f, setF] = useState({ happyMoment: "", lesson: "", improvement: "", rating: 0 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const r = data?.reflection;
    setF({ happyMoment: r?.happy_moment ?? "", lesson: r?.lesson ?? "", improvement: r?.improvement ?? "", rating: r?.rating ?? 0 });
  }, [data]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/reflections", { body: { date, ...f, rating: f.rating || null, journalId: data?.journal?.id ?? null } });
      toast("Refleksi tersimpan. Thank you for pausing today 🌙");
      history.reload();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const evening = dayPeriod() === "evening";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Daily Reflection" sub="Beberapa menit untuk berhenti sejenak dan melihat ke dalam." />
      <LumiBubble
        expression="calm"
        message={evening ? "Good evening, Alya 🌙. Before you end your day, let's reflect for a moment." : "Kapan pun kamu siap, aku di sini untuk menemani refleksimu. 🍃"}
        size={64}
      />

      <form onSubmit={save} className="card card-pad space-y-5">
        <Field label="Tanggal">
          <input type="date" className="input" value={date} max={todayStr()} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </Field>
        {loading ? (
          <Skeleton className="h-64" />
        ) : (
          <>
            <Field label="What made you happy today?">
              <textarea className="input min-h-[90px]" value={f.happyMoment} onChange={(e) => setF({ ...f, happyMoment: e.target.value })} placeholder="Hal kecil pun berarti…" />
            </Field>
            <Field label="What did you learn today?">
              <textarea className="input min-h-[90px]" value={f.lesson} onChange={(e) => setF({ ...f, lesson: e.target.value })} />
            </Field>
            <Field label="What do you want to improve tomorrow?">
              <textarea className="input min-h-[90px]" value={f.improvement} onChange={(e) => setF({ ...f, improvement: e.target.value })} />
            </Field>
            <div>
              <span className="label">How would you rate today?</span>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setF({ ...f, rating: f.rating === n ? 0 : n })}
                    className={cn("grid h-12 flex-1 place-items-center rounded-xl border text-2xl transition active:scale-95", n <= f.rating ? "border-amberSoft-500 bg-amberSoft-500/15" : "border-[var(--line)] grayscale")}
                    aria-label={`${n} dari 5`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>
            {data?.journal ? (
              <p className="text-xs muted">
                Terhubung dengan journal: <Link className="font-semibold text-brand-600" href={`/journal/${data.journal.id}`}>{data.journal.title}</Link>
              </p>
            ) : (
              <p className="text-xs muted">
                Belum ada journal di tanggal ini. <Link className="font-semibold text-brand-600" href={`/journal/new?date=${date}`}>Tulis journal →</Link>
              </p>
            )}
            <button className="btn-primary w-full py-3" disabled={busy}>{busy ? "Menyimpan…" : "Simpan refleksi"}</button>
          </>
        )}
      </form>

      {!!history.data?.items.length && (
        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold">Refleksi terakhir</h2>
          <ul className="divide-y divide-[var(--line)]">
            {history.data.items.map((r) => (
              <li key={r.reflection_date}>
                <button className="flex w-full items-center justify-between gap-3 py-3 text-left" onClick={() => setDate(r.reflection_date.slice(0, 10))}>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{formatDate(r.reflection_date)}</span>
                    <span className="block truncate text-xs muted">{r.happy_moment || r.lesson || "—"}</span>
                  </span>
                  <span className="shrink-0 text-xs">{r.rating ? "⭐".repeat(r.rating) : ""}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Reflection />
    </Suspense>
  );
}
