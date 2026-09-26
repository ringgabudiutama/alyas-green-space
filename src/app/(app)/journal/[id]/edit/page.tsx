"use client";
import { use } from "react";
import { useApi } from "@/lib/client";
import { JournalForm } from "@/components/journal";
import { ErrorBox, PageHeader, PageSkeleton } from "@/components/ui";
import { splitTags, type MoodKey } from "@/lib/format";

type J = { id: number; title: string; content: string; mood: MoodKey | null; tags: string | null; entry_date: string; is_favorite: number; photos: { url: string }[] };

export default function EditJournal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, loading, reload } = useApi<J>(`/api/journals/${id}`);
  if (loading) return <PageSkeleton />;
  if (error || !data) return <ErrorBox message={error || "Journal tidak ditemukan"} onRetry={reload} />;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Edit Journal" />
      <JournalForm
        id={data.id}
        initial={{
          title: data.title,
          content: data.content,
          mood: data.mood,
          tags: splitTags(data.tags),
          entryDate: data.entry_date.slice(0, 10),
          photos: data.photos.map((p) => p.url),
          isFavorite: !!data.is_favorite,
        }}
      />
    </div>
  );
}
