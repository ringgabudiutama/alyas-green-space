"use client";
import Link from "next/link";
import { useState } from "react";
import { api, cn, useApi } from "@/lib/client";
import { EmptyState, ErrorBox, PageHeader, Segmented, Skeleton, useToast } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useShell } from "@/components/AppShell";

type N = { id: number; type: string; title: string; message: string; link: string | null; is_read: number; created_at: string };

export default function NotificationsPage() {
  const toast = useToast();
  const { setUnread } = useShell();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { data, loading, error, reload, setData } = useApi<{ items: N[]; unread: number }>(`/api/notifications?limit=100${filter === "unread" ? "&filter=unread" : ""}`);

  const markRead = async (n: N, isRead = true) => {
    const r = await api<{ unread: number }>(`/api/notifications/${n.id}`, { method: "PATCH", body: { isRead } });
    setUnread(r.unread);
    if (data) setData({ ...data, unread: r.unread, items: data.items.map((x) => (x.id === n.id ? { ...x, is_read: isRead ? 1 : 0 } : x)) });
  };
  const remove = async (n: N) => {
    const r = await api<{ unread: number }>(`/api/notifications/${n.id}`, { method: "DELETE" });
    setUnread(r.unread);
    reload();
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Notifications"
        sub={data ? `${data.unread} belum dibaca` : undefined}
        action={
          <button className="btn-soft" onClick={async () => { await api("/api/notifications", { method: "PATCH" }); setUnread(0); reload(); toast("Semua ditandai dibaca", "info"); }}>
            <Icon name="check" size={16} /> Baca semua
          </button>
        }
      />
      <div className="mb-4"><Segmented value={filter} onChange={setFilter} options={[{ value: "all", label: "Semua" }, { value: "unread", label: "Belum dibaca" }]} /></div>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>}
      {data?.items.length === 0 && <EmptyState icon="🔔" title="Tidak ada notifikasi" text="Lumi akan mengabari streak, progress goal, dan pengingat di sini." />}
      <ul className="space-y-2">
        {data?.items.map((n) => (
          <li key={n.id} className={cn("card flex gap-3 p-4 animate-fade-up", !n.is_read && "border-brand-300 bg-mint-50 dark:bg-night-700")}>
            <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", n.is_read ? "bg-transparent" : "bg-amberSoft-500")} />
            <Link href={n.link || "#"} onClick={() => !n.is_read && markRead(n)} className="min-w-0 flex-1">
              <div className="font-semibold">{n.title}</div>
              <div className="text-sm soft">{n.message}</div>
              <div className="mt-1 text-xs muted">{n.created_at.slice(0, 16).replace("T", " ")}</div>
            </Link>
            <div className="flex shrink-0 flex-col gap-1">
              <button className="grid h-8 w-8 place-items-center rounded-full hover:bg-mint-100 dark:hover:bg-night-600" onClick={() => markRead(n, !n.is_read)} aria-label={n.is_read ? "Tandai belum dibaca" : "Tandai dibaca"}>
                <Icon name={n.is_read ? "bell" : "check"} size={15} />
              </button>
              <button className="grid h-8 w-8 place-items-center rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => remove(n)} aria-label="Hapus">
                <Icon name="trash" size={15} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
