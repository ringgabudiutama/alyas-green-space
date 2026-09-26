"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, cn, useApi } from "@/lib/client";
import { Card, EmptyState, ErrorBox, PageHeader, Segmented, Skeleton, useToast } from "@/components/ui";
import { JournalCalendar } from "@/components/journal";
import { Icon } from "@/components/Icon";
import { formatDate } from "@/lib/dates";
import { MOODS, moodOf, splitTags } from "@/lib/format";

type J = { id: number; title: string; content: string; mood: string | null; tags: string | null; entry_date: string; is_favorite: number; photos: string[] };
type Resp = { items: J[]; hasMore: boolean; page: number; streak: { current: number; longest: number }; total: number; tags: string[] };

export default function JournalPage() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [mood, setMood] = useState("");
  const [tag, setTag] = useState("");
  const [fav, setFav] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<J[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const url = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: "12" });
    if (debounced) p.set("q", debounced);
    if (mood) p.set("mood", mood);
    if (tag) p.set("tag", tag);
    if (fav) p.set("favorite", "1");
    if (date) p.set("date", date);
    return `/api/journals?${p}`;
  }, [debounced, mood, tag, fav, date, page]);

  const { data, loading, error, reload } = useApi<Resp>(url);

  useEffect(() => setPage(1), [debounced, mood, tag, fav, date]);
  useEffect(() => {
    if (!data) return;
    setItems((prev) => (data.page === 1 ? data.items : [...prev, ...data.items.filter((n) => !prev.some((p) => p.id === n.id))]));
  }, [data]);

  const toggleFav = async (id: number) => {
    try {
      const r = await api<{ isFavorite: boolean }>(`/api/journals/${id}/favorite`, { method: "POST" });
      setItems((it) => it.map((j) => (j.id === id ? { ...j, is_favorite: r.isFavorite ? 1 : 0 } : j)));
      toast(r.isFavorite ? "Ditambahkan ke favorit ⭐" : "Dihapus dari favorit", "info");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const streak = data?.streak.current ?? 0;

  return (
    <div>
      <PageHeader
        title="My Journal"
        sub={data ? `${data.total} hari tercatat` : undefined}
        action={
          <Link href="/journal/new" className="btn-primary hidden sm:inline-flex">
            <Icon name="plus" size={16} /> Tulis journal
          </Link>
        }
      />

      {/* Streak */}
      <div className="mb-5 flex items-center gap-4 rounded-3xl bg-gradient-to-r from-amberSoft-500/15 via-mint-100 to-mint-50 p-4 dark:from-amberSoft-500/20 dark:via-night-700 dark:to-night-800 sm:p-5">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--card)] text-3xl shadow-soft">🔥</div>
        <div>
          <div className="font-display text-2xl font-bold text-brand-900 dark:text-mint-100">{streak} Days</div>
          <p className="text-sm soft">
            {streak > 0 ? `You've been showing up for yourself for ${streak} day${streak > 1 ? "s" : ""}.` : "Start a new streak today — one entry is enough. 🌱"}
          </p>
        </div>
      </div>

      {/* Search & filter */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 muted" />
          <input className="input pl-10" placeholder="Cari judul, isi, atau tag…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented value={view} onChange={setView} options={[{ value: "list", label: "Cards" }, { value: "calendar", label: "Calendar" }]} />
          <button onClick={() => setFav(!fav)} className={cn("chip py-2", fav && "!bg-amberSoft-500 !text-white")}>⭐ Favorit</button>
          <select className="input w-auto py-2 text-sm" value={mood} onChange={(e) => setMood(e.target.value)} aria-label="Filter mood">
            <option value="">Semua mood</option>
            {MOODS.map((m) => (
              <option key={m.key} value={m.key}>{m.emoji} {m.label}</option>
            ))}
          </select>
          {!!data?.tags.length && (
            <select className="input w-auto py-2 text-sm" value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Filter tag">
              <option value="">Semua tag</option>
              {data.tags.map((t) => (
                <option key={t} value={t}>#{t}</option>
              ))}
            </select>
          )}
          {date && (
            <button className="chip py-2" onClick={() => setDate(null)}>
              📅 {formatDate(date)} ✕
            </button>
          )}
        </div>
      </div>

      <div className={cn("grid gap-5", view === "calendar" && "lg:grid-cols-[340px_1fr]")}>
        {view === "calendar" && (
          <Card className="h-fit lg:sticky lg:top-24">
            <JournalCalendar selected={date} onSelect={setDate} />
            <p className="mt-3 text-xs muted">Tanggal bertitik hijau punya journal. Ketuk untuk melihatnya.</p>
          </Card>
        )}

        <div>
          {error && <ErrorBox message={error} onRetry={reload} />}
          {loading && items.length === 0 && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-44" />
              ))}
            </div>
          )}
          {!loading && items.length === 0 && !error && (
            <EmptyState
              icon="📝"
              title={date ? "Tidak ada journal di tanggal ini" : "Belum ada journal"}
              text="I haven't heard from you yet, Alya. Want to tell me about your day?"
              action={<Link href="/journal/new" className="btn-primary">Tulis journal</Link>}
            />
          )}
          <div className={cn("grid gap-3", view === "calendar" ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3")}>
            {items.map((j) => (
              <article key={j.id} className="card group relative overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
                <Link href={`/journal/${j.id}`} className="block">
                  {j.photos[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={j.photos[0]} alt="" className="h-36 w-full object-cover" loading="lazy" />
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-xs muted">
                      <span>{formatDate(j.entry_date)}</span>
                      {j.mood && <span title={moodOf(j.mood)?.label}>{moodOf(j.mood)?.emoji}</span>}
                    </div>
                    <h3 className="mt-1 line-clamp-1 pr-8 font-display text-lg font-semibold text-brand-900 dark:text-mint-100">{j.title}</h3>
                    <p className="mt-1 line-clamp-3 text-sm soft">{j.content}</p>
                    {splitTags(j.tags).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {splitTags(j.tags).slice(0, 4).map((t) => (
                          <span key={t} className="chip">#{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() => toggleFav(j.id)}
                  className={cn("absolute right-3 grid h-9 w-9 place-items-center rounded-full glass transition hover:scale-110", j.photos[0] ? "top-3" : "top-3")}
                  aria-label={j.is_favorite ? "Hapus dari favorit" : "Jadikan favorit"}
                >
                  <Icon name="star" size={18} filled={!!j.is_favorite} className={j.is_favorite ? "text-amberSoft-500" : "muted"} />
                </button>
              </article>
            ))}
          </div>
          {data?.hasMore && (
            <div className="mt-5 text-center">
              <button className="btn-soft" onClick={() => setPage((p) => p + 1)} disabled={loading}>
                {loading ? "Memuat…" : "Muat lebih banyak"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
