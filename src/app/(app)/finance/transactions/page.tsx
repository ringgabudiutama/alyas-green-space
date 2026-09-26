"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, cn, useApi } from "@/lib/client";
import { ConfirmSheet, EmptyState, ErrorBox, Field, MoneyInput, PageHeader, Segmented, Sheet, Skeleton, useToast } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatDate, formatDayName, todayStr } from "@/lib/dates";
import { rupiah } from "@/lib/format";

type Cat = { id: number; name: string; type: "income" | "expense" | "both" | "saving"; icon: string | null };
type Trx = {
  id: number; type: "income" | "expense"; category_id: number; category: string; icon: string | null; category_type: string;
  amount: number; description: string | null; trx_date: string; saving_goal_id: number | null; saving_title: string | null;
};
type Resp = { items: Trx[]; page: number; pages: number; total: number; sum: { income: number; expense: number } };

function Transactions() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const cats = useApi<{ items: Cat[] }>("/api/categories");
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [type, setType] = useState<"" | "income" | "expense">("");
  const [cat, setCat] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [edit, setEdit] = useState<Trx | "new" | null>(null);
  const [del, setDel] = useState<Trx | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDq(q), 350);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => setPage(1), [dq, type, cat, from, to]);
  useEffect(() => {
    if (params.get("new") === "1") {
      setEdit("new");
      router.replace("/finance/transactions");
    }
  }, [params, router]);

  const url = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: "30" });
    if (dq) p.set("q", dq);
    if (type) p.set("type", type);
    if (cat) p.set("categoryId", cat);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return `/api/transactions?${p}`;
  }, [dq, type, cat, from, to, page]);
  const { data, loading, error, reload } = useApi<Resp>(url);

  const groups = useMemo(() => {
    const m = new Map<string, Trx[]>();
    data?.items.forEach((t) => {
      const d = t.trx_date.slice(0, 10);
      m.set(d, [...(m.get(d) || []), t]);
    });
    return [...m.entries()];
  }, [data]);

  const activeFilters = [type, cat, from, to].filter(Boolean).length;

  return (
    <div>
      <PageHeader title="Transactions" action={<button className="btn-primary" onClick={() => setEdit("new")}><Icon name="plus" size={16} /> Tambah</button>} />

      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 muted" />
          <input className="input pl-10" placeholder="Cari transaksi…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn-soft relative" onClick={() => setFilterOpen(true)}>
          Filter
          {activeFilters > 0 && <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-[10px] text-white">{activeFilters}</span>}
        </button>
      </div>

      {data && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="card p-3.5"><p className="text-xs muted">Income (filter ini)</p><p className="font-bold text-[var(--viz-income)]">{rupiah(data.sum.income)}</p></div>
          <div className="card p-3.5"><p className="text-xs muted">Expense (filter ini)</p><p className="font-bold text-[var(--viz-expense)]">{rupiah(data.sum.expense)}</p></div>
        </div>
      )}

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>}
      {data && data.items.length === 0 && (
        <EmptyState icon="🧾" title="Belum ada transaksi" text="Catat pemasukan dan pengeluaran pertamamu." action={<button className="btn-primary" onClick={() => setEdit("new")}>Tambah transaksi</button>} />
      )}

      <div className="space-y-5">
        {groups.map(([d, items]) => (
          <section key={d}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide muted">{formatDayName(d)}, {formatDate(d)}</h3>
            <ul className="card divide-y divide-[var(--line)] overflow-hidden p-0">
              {items.map((t) => (
                <li key={t.id}>
                  <button onClick={() => setEdit(t)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-mint-50 dark:hover:bg-night-700">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint-100 text-lg dark:bg-night-600">{t.icon || "✨"}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{t.description || t.category}</span>
                      <span className="block truncate text-xs muted">{t.category}{t.saving_title ? ` · ${t.saving_title}` : ""}</span>
                    </span>
                    <span className={cn("shrink-0 text-sm font-bold tabular-nums", t.type === "income" ? "text-[var(--viz-income)]" : "text-[var(--ink)]")}>
                      {t.type === "income" ? "+" : "−"}{rupiah(t.amount)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {data && data.pages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <button className="btn-soft" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹ Sebelumnya</button>
          <span className="text-sm muted">{page} / {data.pages}</span>
          <button className="btn-soft" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Berikutnya ›</button>
        </div>
      )}

      <Sheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter transaksi"
        footer={
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={() => { setType(""); setCat(""); setFrom(""); setTo(""); }}>Reset</button>
            <button className="btn-primary flex-1" onClick={() => setFilterOpen(false)}>Terapkan</button>
          </div>
        }
      >
        <div className="space-y-4">
          <Segmented value={type} onChange={setType} options={[{ value: "", label: "Semua" }, { value: "income", label: "Income" }, { value: "expense", label: "Expense" }]} />
          <Field label="Kategori">
            <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">Semua kategori</option>
              {cats.data?.items.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dari"><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="Sampai"><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          </div>
        </div>
      </Sheet>

      <TransactionForm
        open={edit !== null}
        trx={edit === "new" ? null : edit}
        categories={cats.data?.items || []}
        onClose={() => setEdit(null)}
        onSaved={() => { setEdit(null); reload(); toast("Transaksi tersimpan 💚"); }}
        onDelete={(t) => { setEdit(null); setDel(t); }}
      />
      <ConfirmSheet
        open={!!del}
        onClose={() => setDel(null)}
        title="Hapus transaksi?"
        onConfirm={async () => {
          if (!del) return;
          await api(`/api/transactions/${del.id}`, { method: "DELETE" }).catch((e) => toast(e.message, "error"));
          setDel(null);
          reload();
        }}
      />
    </div>
  );
}

function TransactionForm({ open, trx, categories, onClose, onSaved, onDelete }: {
  open: boolean; trx: Trx | null; categories: Cat[]; onClose: () => void; onSaved: () => void; onDelete: (t: Trx) => void;
}) {
  const toast = useToast();
  const savings = useApi<{ items: { id: number; title: string; emoji: string | null }[] }>(open ? "/api/savings" : null);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [savingGoalId, setSavingGoalId] = useState<number | null>(null);
  const [amount, setAmount] = useState<number | "">("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(todayStr());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType(trx?.type ?? "expense");
    setCategoryId(trx?.category_id ?? null);
    setSavingGoalId(trx?.saving_goal_id ?? null);
    setAmount(trx ? Number(trx.amount) : "");
    setDesc(trx?.description ?? "");
    setDate(trx?.trx_date.slice(0, 10) ?? todayStr());
  }, [open, trx]);

  const available = categories.filter((c) => c.type === type || c.type === "both" || c.type === "saving");
  const selected = categories.find((c) => c.id === categoryId);
  const isSaving = selected?.type === "saving";

  const submit = async () => {
    if (!categoryId) return toast("Pilih kategori dulu", "error");
    if (isSaving && !savingGoalId) return toast("Pilih saving goal", "error");
    setBusy(true);
    try {
      const body = { type, categoryId, amount: Number(amount), description: desc || null, date, savingGoalId: isSaving ? savingGoalId : null };
      await api(trx ? `/api/transactions/${trx.id}` : "/api/transactions", { method: trx ? "PUT" : "POST", body });
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
      title={trx ? "Edit transaksi" : "Transaksi baru"}
      footer={
        <div className="flex gap-2">
          {trx && <button className="btn-danger" onClick={() => onDelete(trx)} aria-label="Hapus"><Icon name="trash" size={16} /></button>}
          <button className="btn-primary flex-1 py-3" disabled={busy || !amount} onClick={submit}>{busy ? "Menyimpan…" : "Simpan"}</button>
        </div>
      }
    >
      <div className="space-y-4">
        <Segmented
          value={type}
          onChange={(v) => { setType(v); setCategoryId(null); }}
          options={[{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }]}
        />
        <Field label="Jumlah"><MoneyInput value={amount} onChange={setAmount} /></Field>
        <div>
          <span className="label">Kategori</span>
          <div className="grid grid-cols-4 gap-2">
            {available.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-[11px] font-semibold transition active:scale-95",
                  categoryId === c.id ? "border-brand-500 bg-brand-600 text-white" : "border-[var(--line)]"
                )}
              >
                <span className="text-xl">{c.icon}</span>
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
        {isSaving && (
          <Field label="Saving goal">
            <select className="input" value={savingGoalId ?? ""} onChange={(e) => setSavingGoalId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Pilih…</option>
              {savings.data?.items.map((s) => <option key={s.id} value={s.id}>{s.emoji} {s.title}</option>)}
            </select>
          </Field>
        )}
        <Field label="Deskripsi"><input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Makan siang, gaji, …" /></Field>
        <Field label="Tanggal"><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      </div>
    </Sheet>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Transactions />
    </Suspense>
  );
}
