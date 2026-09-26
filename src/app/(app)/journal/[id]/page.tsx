"use client";
import Link from "next/link";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { api, useApi } from "@/lib/client";
import { Card, ConfirmSheet, ErrorBox, PageSkeleton, useToast } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatDate, formatDayName } from "@/lib/dates";
import { moodOf, splitTags } from "@/lib/format";

type J = {
  id: number; title: string; content: string; mood: string | null; tags: string | null; entry_date: string; is_favorite: number;
  photos: { id: number; url: string }[];
  reflection: { happy_moment: string | null; lesson: string | null; improvement: string | null; rating: number | null } | null;
};

export default function JournalDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const { data, error, loading, reload, setData } = useApi<J>(`/api/journals/${id}`);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);

  if (loading) return <PageSkeleton />;
  if (error || !data) return <ErrorBox message={error || "Journal tidak ditemukan"} onRetry={reload} />;
  const mood = moodOf(data.mood);

  const del = async () => {
    setBusy(true);
    try {
      await api(`/api/journals/${id}`, { method: "DELETE" });
      toast("Journal dihapus", "info");
      router.replace("/journal");
    } catch (e) {
      toast((e as Error).message, "error");
      setBusy(false);
    }
  };
  const fav = async () => {
    const r = await api<{ isFavorite: boolean }>(`/api/journals/${id}/favorite`, { method: "POST" });
    setData({ ...data, is_favorite: r.isFavorite ? 1 : 0 });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/journal" className="btn-ghost -ml-3">
          <Icon name="back" size={18} /> Journal
        </Link>
        <div className="flex gap-1">
          <button onClick={fav} className="grid h-10 w-10 place-items-center rounded-full hover:bg-mint-100 dark:hover:bg-night-600" aria-label="Favorit">
            <Icon name="star" filled={!!data.is_favorite} className={data.is_favorite ? "text-amberSoft-500" : ""} />
          </button>
          <Link href={`/journal/${id}/edit`} className="grid h-10 w-10 place-items-center rounded-full hover:bg-mint-100 dark:hover:bg-night-600" aria-label="Edit">
            <Icon name="edit" />
          </Link>
          <button onClick={() => setConfirm(true)} className="grid h-10 w-10 place-items-center rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" aria-label="Hapus">
            <Icon name="trash" />
          </button>
        </div>
      </div>

      <article className="card overflow-hidden">
        {data.photos.length > 0 && (
          <div className={data.photos.length === 1 ? "" : "grid grid-cols-2 gap-0.5"}>
            {data.photos.map((p) => (
              <button key={p.id} onClick={() => setZoom(p.url)} className="block w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className={data.photos.length === 1 ? "max-h-96 w-full object-cover" : "aspect-square w-full object-cover"} />
              </button>
            ))}
          </div>
        )}
        <div className="card-pad">
          <div className="flex flex-wrap items-center gap-2 text-sm muted">
            <span>{formatDayName(data.entry_date)}, {formatDate(data.entry_date)}</span>
            {mood && <span className="chip">{mood.emoji} {mood.label}</span>}
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold text-brand-900 dark:text-mint-100">{data.title}</h1>
          <div className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed">{data.content}</div>
          {splitTags(data.tags).length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {splitTags(data.tags).map((t) => (
                <span key={t} className="chip">#{t}</span>
              ))}
            </div>
          )}
        </div>
      </article>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Daily Reflection</h2>
          <Link href={`/reflection?date=${data.entry_date.slice(0, 10)}`} className="text-sm font-semibold text-brand-600">
            {data.reflection ? "Edit" : "Isi refleksi →"}
          </Link>
        </div>
        {data.reflection ? (
          <dl className="space-y-3 text-sm">
            <div><dt className="label">What made you happy</dt><dd>{data.reflection.happy_moment || "-"}</dd></div>
            <div><dt className="label">What you learned</dt><dd>{data.reflection.lesson || "-"}</dd></div>
            <div><dt className="label">Improve tomorrow</dt><dd>{data.reflection.improvement || "-"}</dd></div>
            <div><dt className="label">Rating</dt><dd>{data.reflection.rating ? "⭐".repeat(data.reflection.rating) : "-"}</dd></div>
          </dl>
        ) : (
          <p className="text-sm muted">Belum ada refleksi untuk hari ini.</p>
        )}
      </Card>

      <ConfirmSheet open={confirm} onClose={() => setConfirm(false)} onConfirm={del} busy={busy} title="Hapus journal ini?" text="Journal beserta fotonya akan dihapus permanen." />

      {zoom && (
        <button className="fixed inset-0 z-[70] grid place-items-center bg-black/85 p-4" onClick={() => setZoom(null)} aria-label="Tutup foto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="" className="max-h-full max-w-full rounded-xl" />
        </button>
      )}
    </div>
  );
}
