"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, cn, uploadImage, useApi } from "@/lib/client";
import { addMonths, daysInMonth, formatMonth, todayStr } from "@/lib/dates";
import { MOODS, type MoodKey } from "@/lib/format";
import { Field, useToast } from "./ui";
import { Icon } from "./Icon";

// ------------------------------------------------------------------ Calendar
export function JournalCalendar({ selected, onSelect }: { selected: string | null; onSelect: (d: string | null) => void }) {
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const { data } = useApi<{ days: { date: string; count: number; mood: string | null }[] }>(`/api/journals/calendar?month=${month}`);
  const marked = new Map((data?.days || []).map((d) => [d.date, d]));
  const [y, m] = month.split("-").map(Number);
  const firstDow = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Senin = 0
  const total = daysInMonth(month);
  const today = todayStr();
  const cells: (string | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: total }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button className="grid h-9 w-9 place-items-center rounded-full hover:bg-mint-100 dark:hover:bg-night-600" onClick={() => setMonth(addMonths(month, -1))} aria-label="Bulan sebelumnya">
          <Icon name="back" />
        </button>
        <div className="font-display font-semibold">{formatMonth(month)}</div>
        <button
          className="grid h-9 w-9 rotate-180 place-items-center rounded-full hover:bg-mint-100 disabled:opacity-30 dark:hover:bg-night-600"
          onClick={() => setMonth(addMonths(month, 1))}
          disabled={month >= today.slice(0, 7)}
          aria-label="Bulan berikutnya"
        >
          <Icon name="back" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold muted">
        {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) =>
          d ? (
            <button
              key={d}
              onClick={() => onSelect(selected === d ? null : d)}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition",
                selected === d ? "bg-brand-600 font-bold text-white" : marked.has(d) ? "bg-mint-100 font-semibold text-brand-800 dark:bg-night-600 dark:text-mint-100" : "hover:bg-mint-50 dark:hover:bg-night-700",
                d === today && selected !== d && "ring-2 ring-brand-400"
              )}
              aria-label={`${d}${marked.has(d) ? ", ada journal" : ""}`}
            >
              {Number(d.slice(8))}
              {marked.has(d) && <span className={cn("absolute bottom-1 h-1.5 w-1.5 rounded-full", selected === d ? "bg-white" : "bg-brand-500")} />}
            </button>
          ) : (
            <div key={`e${i}`} />
          )
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Form
export type JournalInput = { title: string; content: string; mood: MoodKey | null; tags: string[]; entryDate: string; photos: string[]; isFavorite?: boolean };

export function JournalForm({ initial, id }: { initial?: Partial<JournalInput>; id?: number }) {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState<JournalInput>({
    title: initial?.title ?? "",
    content: initial?.content ?? "",
    mood: initial?.mood ?? null,
    tags: initial?.tags ?? [],
    entryDate: initial?.entryDate ?? todayStr(),
    photos: initial?.photos ?? [],
    isFavorite: initial?.isFavorite ?? false,
  });
  const [tagInput, setTagInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const draftKey = id ? `ags-draft-${id}` : "ags-draft-new";

  // draft otomatis di perangkat (kenyamanan saja)
  useEffect(() => {
    if (id) return;
    try {
      const d = localStorage.getItem(draftKey);
      if (d) setF((p) => ({ ...p, ...JSON.parse(d), photos: p.photos }));
    } catch {
      /* abaikan */
    }
  }, [id, draftKey]);
  useEffect(() => {
    if (id) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ title: f.title, content: f.content, mood: f.mood, tags: f.tags }));
      } catch {
        /* abaikan */
      }
    }, 500);
    return () => clearTimeout(t);
  }, [f, id, draftKey]);

  const addTag = () => {
    const t = tagInput.trim().replace(/,/g, "");
    if (t && !f.tags.includes(t) && f.tags.length < 15) setF({ ...f, tags: [...f.tags, t] });
    setTagInput("");
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, 8 - f.photos.length)) urls.push(await uploadImage(file));
      setF((p) => ({ ...p, photos: [...p.photos, ...urls] }));
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (id) {
        await api(`/api/journals/${id}`, { method: "PUT", body: f });
        toast("Journal diperbarui 🌿");
        router.push(`/journal/${id}`);
      } else {
        const r = await api<{ id: number; streak: { current: number } }>("/api/journals", { body: f });
        try {
          localStorage.removeItem(draftKey);
        } catch {
          /* abaikan */
        }
        toast(r.streak.current > 1 ? `Tersimpan! Streak ${r.streak.current} hari 🔥` : "Journal tersimpan 🌱");
        router.push(`/journal/${r.id}`);
      }
      router.refresh();
    } catch (err) {
      toast((err as Error).message, "error");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="card card-pad space-y-4">
        <Field label="Tanggal">
          <input type="date" className="input" value={f.entryDate} max={todayStr()} onChange={(e) => setF({ ...f, entryDate: e.target.value })} required />
        </Field>
        <Field label="Judul">
          <input className="input font-display text-lg" placeholder="Hari ini tentang…" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required maxLength={200} />
        </Field>
        <div>
          <span className="label">Mood</span>
          <div className="grid grid-cols-5 gap-2">
            {MOODS.map((m) => (
              <button
                type="button"
                key={m.key}
                onClick={() => setF({ ...f, mood: f.mood === m.key ? null : m.key })}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl border py-2 text-[11px] font-semibold transition active:scale-95",
                  f.mood === m.key ? "border-brand-500 bg-brand-600 text-white" : "border-[var(--line)]"
                )}
              >
                <span className="text-2xl">{m.emoji}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <Field label="Cerita hari ini">
          <textarea
            className="input min-h-[220px] resize-y leading-relaxed"
            placeholder="Tulis apa saja yang kamu rasakan, pelajari, atau syukuri hari ini…"
            value={f.content}
            onChange={(e) => setF({ ...f, content: e.target.value })}
            required
          />
        </Field>
      </div>

      <div className="card card-pad space-y-4">
        <div>
          <span className="label">Tags</span>
          <div className="flex flex-wrap gap-2">
            {f.tags.map((t) => (
              <button type="button" key={t} className="chip" onClick={() => setF({ ...f, tags: f.tags.filter((x) => x !== t) })}>
                #{t} <span aria-hidden>✕</span>
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              className="input"
              placeholder="kuliah, keluarga…"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <button type="button" className="btn-soft" onClick={addTag}>Tambah</button>
          </div>
        </div>

        <div>
          <span className="label">Foto</span>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {f.photos.map((p) => (
              <div key={p} className="group relative aspect-square overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setF({ ...f, photos: f.photos.filter((x) => x !== p) })}
                  className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/50 text-xs text-white"
                  aria-label="Hapus foto"
                >
                  ✕
                </button>
              </div>
            ))}
            {f.photos.length < 8 && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-[var(--line)] text-brand-600 transition hover:border-brand-400"
                disabled={uploading}
              >
                <span className="flex flex-col items-center gap-1 text-xs font-semibold">
                  <Icon name="camera" size={24} />
                  {uploading ? "Upload…" : "Tambah"}
                </span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          <p className="mt-1 text-xs muted">JPG/PNG/WEBP, maks 5 MB per foto.</p>
        </div>
      </div>

      <div className="glass sticky bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-30 -mx-1 flex gap-2 rounded-2xl p-1 lg:bottom-4">
        <button type="button" className="btn-ghost flex-1" onClick={() => router.back()}>Batal</button>
        <button className="btn-primary flex-[2] py-3" disabled={busy || uploading}>
          {busy ? "Menyimpan…" : id ? "Simpan perubahan" : "Simpan journal"}
        </button>
      </div>
    </form>
  );
}
