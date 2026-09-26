"use client";
import { useEffect, useState } from "react";
import { api, cn, useApi } from "@/lib/client";
import { Card, Confetti, ConfirmSheet, EmptyState, ErrorBox, Field, MoneyInput, PageHeader, ProgressBar, Segmented, Sheet, Skeleton, useToast } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatDate, todayStr } from "@/lib/dates";
import { rupiah } from "@/lib/format";

type S = { id: number; title: string; emoji: string | null; target_amount: number; initial_amount: number; current_amount: number; progress: number; deadline: string | null };
type Resp = { items: S[]; totalSaved: number; totalTarget: number };

export default function SavingsPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi<Resp>("/api/savings");
  const [edit, setEdit] = useState<S | "new" | null>(null);
  const [move, setMove] = useState<S | null>(null);
  const [history, setHistory] = useState<S | null>(null);
  const [del, setDel] = useState<S | null>(null);
  const [party, setParty] = useState(false);

  return (
    <div>
      <Confetti show={party} />
      <PageHeader
        title="Saving Goals"
        sub="Target keuangan yang sedang kamu kumpulkan."
        action={<button className="btn-primary" onClick={() => setEdit("new")}><Icon name="plus" size={16} /> Saving goal</button>}
      />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Skeleton className="h-40" />}
      {data && (
        <>
          <div className="mb-5 rounded-3xl bg-gradient-to-br from-brand-600 to-forest-800 p-5 text-white shadow-lift">
            <p className="text-xs font-semibold uppercase tracking-widest text-mint-200">Total tabungan</p>
            <p className="mt-1 font-display text-3xl font-bold">{rupiah(data.totalSaved)}</p>
            <p className="text-sm text-mint-100">dari target {rupiah(data.totalTarget)}</p>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-mint-200 transition-[width] duration-700" style={{ width: `${data.totalTarget ? Math.min(100, (data.totalSaved / data.totalTarget) * 100) : 0}%` }} />
            </div>
          </div>
          {data.items.length === 0 && (
            <EmptyState icon="🐷" title="Belum ada saving goal" text="Contoh: New Laptop, Dana Darurat, Liburan." action={<button className="btn-primary" onClick={() => setEdit("new")}>Buat saving goal</button>} />
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {data.items.map((s) => (
              <Card key={s.id} className="p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mint-100 text-2xl dark:bg-night-600">{s.emoji || "🌱"}</div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-lg font-semibold text-brand-900 dark:text-mint-100">{s.title}</h3>
                    <p className="text-xs muted">{s.deadline ? `Target ${formatDate(s.deadline)}` : "Tanpa deadline"}</p>
                  </div>
                  <div className="font-display text-xl font-bold text-brand-700 dark:text-mint-200">{(Math.round(s.progress * 10) / 10).toLocaleString("id-ID")}%</div>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-xs muted">Target</dt><dd className="font-semibold">{rupiah(s.target_amount)}</dd></div>
                  <div><dt className="text-xs muted">Current</dt><dd className="font-semibold">{rupiah(s.current_amount)}</dd></div>
                </dl>
                <ProgressBar value={s.progress} className="mt-3" label={s.title} />
                {s.progress >= 100 && <p className="mt-2 text-sm font-semibold text-brand-700 dark:text-mint-200">🎉 Target tercapai!</p>}
                <div className="mt-4 grid grid-cols-4 gap-2">
                  <button className="btn-primary col-span-2 px-2" onClick={() => setMove(s)}>+ Setor / Tarik</button>
                  <button className="btn-soft px-2" onClick={() => setHistory(s)} aria-label="Riwayat"><Icon name="file" size={16} /></button>
                  <button className="btn-soft px-2" onClick={() => setEdit(s)} aria-label="Edit"><Icon name="edit" size={16} /></button>
                </div>
                <button className="mt-2 w-full text-xs font-semibold text-red-600/80 hover:text-red-600" onClick={() => setDel(s)}>Hapus saving goal</button>
              </Card>
            ))}
          </div>
        </>
      )}

      <SavingForm open={edit !== null} saving={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); toast("Saving goal tersimpan 🌱"); }} />
      <MoveSheet
        saving={move}
        onClose={() => setMove(null)}
        onDone={(s) => {
          setMove(null);
          reload();
          if (s && s.progress >= 100) {
            setParty(true);
            setTimeout(() => setParty(false), 3000);
            toast("Yay! Target tabungan tercapai 🎉");
          } else toast("Tercatat 🌱");
        }}
      />
      {history && <HistorySheet saving={history} onClose={() => setHistory(null)} />}
      <ConfirmSheet
        open={!!del}
        onClose={() => setDel(null)}
        title="Hapus saving goal?"
        text="Riwayat transaksi setorannya tetap tersimpan di halaman Transactions."
        onConfirm={async () => {
          if (!del) return;
          await api(`/api/savings/${del.id}`, { method: "DELETE" }).catch((e) => toast(e.message, "error"));
          setDel(null);
          reload();
        }}
      />
    </div>
  );
}

function SavingForm({ open, saving, onClose, onSaved }: { open: boolean; saving: S | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ title: "", emoji: "💻", targetAmount: "" as number | "", initialAmount: 0 as number | "", deadline: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setF(
      saving
        ? { title: saving.title, emoji: saving.emoji || "", targetAmount: saving.target_amount, initialAmount: saving.initial_amount, deadline: saving.deadline?.slice(0, 10) || "" }
        : { title: "", emoji: "💻", targetAmount: "", initialAmount: 0, deadline: "" }
    );
  }, [open, saving]);
  const submit = async () => {
    setBusy(true);
    try {
      const body = { title: f.title, emoji: f.emoji || null, targetAmount: Number(f.targetAmount || 0), initialAmount: Number(f.initialAmount || 0), deadline: f.deadline || null };
      await api(saving ? `/api/savings/${saving.id}` : "/api/savings", { method: saving ? "PUT" : "POST", body });
      onSaved();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title={saving ? "Edit saving goal" : "Saving goal baru"} footer={<button className="btn-primary w-full py-3" disabled={busy || !f.title || !f.targetAmount} onClick={submit}>{busy ? "Menyimpan…" : "Simpan"}</button>}>
      <div className="space-y-4">
        <div className="grid grid-cols-[80px_1fr] gap-3">
          <Field label="Emoji"><input className="input text-center text-xl" value={f.emoji} onChange={(e) => setF({ ...f, emoji: e.target.value.slice(0, 8) })} /></Field>
          <Field label="Nama"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="New Laptop" /></Field>
        </div>
        <Field label="Target"><MoneyInput value={f.targetAmount} onChange={(v) => setF({ ...f, targetAmount: v })} placeholder="12.000.000" /></Field>
        <Field label="Saldo awal" hint="Uang yang sudah terkumpul sebelum dicatat di sini."><MoneyInput value={f.initialAmount} onChange={(v) => setF({ ...f, initialAmount: v })} /></Field>
        <Field label="Deadline (opsional)"><input type="date" className="input" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></Field>
      </div>
    </Sheet>
  );
}

function MoveSheet({ saving, onClose, onDone }: { saving: S | null; onClose: () => void; onDone: (s?: S) => void }) {
  const toast = useToast();
  const [dir, setDir] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState<number | "">("");
  const [date, setDate] = useState(todayStr());
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setAmount("");
    setDesc("");
    setDir("deposit");
    setDate(todayStr());
  }, [saving]);
  if (!saving) return null;
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api<{ saving?: S }>(`/api/savings/${saving.id}/move`, { body: { amount: Number(amount), direction: dir, date, description: desc || null } });
      onDone(r.saving);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open onClose={onClose} title={`${saving.emoji || "🌱"} ${saving.title}`} footer={<button className="btn-primary w-full py-3" disabled={busy || !amount} onClick={submit}>{busy ? "Menyimpan…" : dir === "deposit" ? "Setor" : "Tarik"}</button>}>
      <div className="space-y-4">
        <Segmented value={dir} onChange={setDir} options={[{ value: "deposit", label: "Setor" }, { value: "withdraw", label: "Tarik" }]} />
        <Field label="Jumlah"><MoneyInput value={amount} onChange={setAmount} /></Field>
        <div className="flex flex-wrap gap-2">
          {[50000, 100000, 250000, 500000].map((n) => (
            <button key={n} type="button" className={cn("chip py-2", amount === n && "!bg-brand-600 !text-white")} onClick={() => setAmount(n)}>{rupiah(n)}</button>
          ))}
        </div>
        <Field label="Tanggal"><input type="date" className="input" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Catatan"><input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="opsional" /></Field>
        <p className="text-xs muted">Tercatat otomatis sebagai transaksi kategori Saving, sehingga saldo di Finance ikut menyesuaikan.</p>
      </div>
    </Sheet>
  );
}

function HistorySheet({ saving, onClose }: { saving: S; onClose: () => void }) {
  const { data } = useApi<S & { history: { id: number; type: string; amount: number; description: string | null; trx_date: string }[] }>(`/api/savings/${saving.id}`);
  return (
    <Sheet open onClose={onClose} title={`Riwayat · ${saving.title}`}>
      {!data ? (
        <Skeleton className="h-40" />
      ) : data.history.length === 0 ? (
        <p className="py-6 text-center text-sm muted">Belum ada setoran.</p>
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {data.history.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-medium">{h.description || (h.type === "expense" ? "Setoran" : "Penarikan")}</span>
                <span className="text-xs muted">{formatDate(h.trx_date)}</span>
              </span>
              <span className={cn("shrink-0 font-semibold tabular-nums", h.type === "expense" ? "text-brand-700 dark:text-mint-200" : "text-amberSoft-600")}>
                {h.type === "expense" ? "+" : "−"}{rupiah(h.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
