"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, cn, useApi } from "@/lib/client";
import { Confetti, ConfirmSheet, EmptyState, ErrorBox, Field, PageHeader, ProgressBar, Segmented, Sheet, Skeleton, useToast } from "@/components/ui";
import { LumiBubble } from "@/components/Lumi";
import { Icon } from "@/components/Icon";
import { formatDate } from "@/lib/dates";
import { GOAL_CATEGORIES, PRIORITIES, goalCategoryLabel } from "@/lib/format";

type Goal = {
  id: number; title: string; description: string | null; category: string; target_value: number; current_value: number; unit: string | null;
  progress_mode: "value" | "milestones"; deadline: string | null; priority: "low" | "medium" | "high"; status: string; computed_status: "in_progress" | "completed" | "overdue";
  progress: number; milestones_total: number; milestones_done: number;
};
type Milestone = { id: number; title: string; is_done: number };
type List = { items: Goal[]; counts: Record<string, number> };

const STATUS_STYLE: Record<string, string> = {
  in_progress: "bg-mint-100 text-brand-800 dark:bg-night-600 dark:text-mint-200",
  completed: "bg-brand-600 text-white",
  overdue: "bg-amberSoft-500/15 text-amberSoft-600 dark:text-amber-300",
};
const STATUS_LABEL: Record<string, string> = { in_progress: "In Progress", completed: "Completed", overdue: "Overdue" };

function Goals() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"all" | "in_progress" | "completed" | "overdue">("all");
  const [cat, setCat] = useState("");
  const q = new URLSearchParams();
  if (tab !== "all") q.set("status", tab);
  if (cat) q.set("category", cat);
  const { data, loading, error, reload } = useApi<List>(`/api/goals?${q}`);
  const [editing, setEditing] = useState<Goal | "new" | null>(null);
  const [detail, setDetail] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState<string | null>(null);

  useEffect(() => {
    if (params.get("new") === "1") {
      setEditing("new");
      router.replace("/goals");
    }
  }, [params, router]);

  const onResult = (r: { justCompleted?: boolean; goal?: Goal }) => {
    if (r.justCompleted && r.goal) {
      setCelebrate(r.goal.title);
      setTimeout(() => setCelebrate(null), 4500);
    }
    reload();
  };

  return (
    <div>
      <Confetti show={!!celebrate} />
      <PageHeader
        title="My Goals"
        sub="Pelan-pelan, yang penting terus melangkah."
        action={
          <button className="btn-primary" onClick={() => setEditing("new")}>
            <Icon name="plus" size={16} /> Goal baru
          </button>
        }
      />
      {celebrate && (
        <div className="mb-5 animate-pop">
          <LumiBubble expression="celebrating" message={`You did it, Alya! 🎉 "${celebrate}" — another goal completed.`} size={76} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "all", label: `All ${data ? `(${data.counts.all})` : ""}` },
            { value: "in_progress", label: `In Progress ${data ? `(${data.counts.in_progress})` : ""}` },
            { value: "completed", label: `Completed ${data ? `(${data.counts.completed})` : ""}` },
            { value: "overdue", label: `Overdue ${data ? `(${data.counts.overdue})` : ""}` },
          ]}
        />
        <select className="input w-auto py-2 text-sm" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Kategori">
          <option value="">Semua kategori</option>
          {GOAL_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      )}
      {data && data.items.length === 0 && (
        <EmptyState icon="🎯" title="Belum ada goal di sini" text="Mulai dari satu target kecil yang ingin kamu capai." action={<button className="btn-primary" onClick={() => setEditing("new")}>Buat goal</button>} />
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {data?.items.map((g) => (
          <button key={g.id} onClick={() => setDetail(g.id)} className="card p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.99]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                  <span className="chip">{goalCategoryLabel(g.category)}</span>
                  <span className={cn("rounded-full px-2.5 py-1", STATUS_STYLE[g.computed_status])}>{STATUS_LABEL[g.computed_status]}</span>
                  {g.priority === "high" && <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700 dark:bg-red-950/40 dark:text-red-300">High</span>}
                </div>
                <h3 className="mt-2 line-clamp-2 font-display text-lg font-semibold text-brand-900 dark:text-mint-100">{g.title}</h3>
              </div>
              <div className="shrink-0 font-display text-2xl font-bold text-brand-700 dark:text-mint-200">{Math.round(g.progress)}%</div>
            </div>
            <ProgressBar value={g.progress} className="mt-3" label={g.title} />
            <div className="mt-2 flex items-center justify-between text-xs muted">
              <span>
                {g.progress_mode === "milestones" ? `${g.milestones_done}/${g.milestones_total} milestones` : `${g.current_value} / ${g.target_value} ${g.unit || ""}`}
              </span>
              <span>{g.deadline ? `Deadline ${formatDate(g.deadline)}` : "Tanpa deadline"}</span>
            </div>
            {g.computed_status !== "completed" && g.progress >= 80 && (
              <p className="mt-3 rounded-xl bg-mint-50 px-3 py-2 text-xs font-medium text-brand-800 dark:bg-night-700 dark:text-mint-200">
                🤖 Lumi: You&apos;re almost there, Alya! Tinggal sedikit lagi. 🌱
              </p>
            )}
          </button>
        ))}
      </div>

      <GoalForm
        open={editing !== null}
        goal={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={(r) => {
          setEditing(null);
          onResult(r);
          toast("Goal tersimpan 🎯");
        }}
      />
      {detail !== null && (
        <GoalDetail
          id={detail}
          onClose={() => setDetail(null)}
          onEdit={(g) => {
            setDetail(null);
            setEditing(g);
          }}
          onChanged={onResult}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Form
function GoalForm({ open, goal, onClose, onSaved }: { open: boolean; goal: Goal | null; onClose: () => void; onSaved: (r: { justCompleted?: boolean; goal?: Goal }) => void }) {
  const toast = useToast();
  const blank = { title: "", description: "", category: "personal", targetValue: 100, currentValue: 0, unit: "%", progressMode: "value" as "value" | "milestones", deadline: "", priority: "medium", milestones: [] as string[] };
  const [f, setF] = useState(blank);
  const [ms, setMs] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF(
      goal
        ? {
            title: goal.title, description: goal.description || "", category: goal.category, targetValue: Number(goal.target_value), currentValue: Number(goal.current_value),
            unit: goal.unit || "", progressMode: goal.progress_mode, deadline: goal.deadline?.slice(0, 10) || "", priority: goal.priority, milestones: [],
          }
        : blank
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, goal]);

  const submit = async () => {
    setBusy(true);
    try {
      const body = { ...f, deadline: f.deadline || null, milestones: goal ? undefined : f.milestones };
      const r = goal ? await api<{ justCompleted?: boolean; goal?: Goal }>(`/api/goals/${goal.id}`, { method: "PUT", body }) : await api("/api/goals", { body });
      onSaved(r as { justCompleted?: boolean; goal?: Goal });
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
      title={goal ? "Edit goal" : "Goal baru"}
      footer={<button className="btn-primary w-full py-3" onClick={submit} disabled={busy || !f.title.trim()}>{busy ? "Menyimpan…" : "Simpan"}</button>}
    >
      <div className="space-y-4">
        <Field label="Judul"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Learn English" /></Field>
        <Field label="Deskripsi"><textarea className="input min-h-[70px]" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kategori">
            <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
              {GOAL_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Prioritas">
            <select className="input" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
              {PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Deadline"><input type="date" className="input" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></Field>
        <div>
          <span className="label">Cara menghitung progress</span>
          <Segmented
            value={f.progressMode}
            onChange={(v) => setF({ ...f, progressMode: v })}
            options={[{ value: "value", label: "Angka target" }, { value: "milestones", label: "Checklist milestone" }]}
          />
        </div>
        {f.progressMode === "value" && (
          <div className="grid grid-cols-3 gap-3">
            <Field label="Target"><input type="number" min={0} step="any" className="input" value={f.targetValue} onChange={(e) => setF({ ...f, targetValue: Number(e.target.value) })} /></Field>
            <Field label="Saat ini"><input type="number" min={0} step="any" className="input" value={f.currentValue} onChange={(e) => setF({ ...f, currentValue: Number(e.target.value) })} /></Field>
            <Field label="Satuan"><input className="input" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} placeholder="%, buku" /></Field>
          </div>
        )}
        {!goal && (
          <div>
            <span className="label">Milestones (opsional)</span>
            <ul className="mb-2 space-y-1.5">
              {f.milestones.map((m, i) => (
                <li key={i} className="flex items-center justify-between rounded-xl bg-mint-50 px-3 py-2 text-sm dark:bg-night-700">
                  {m}
                  <button type="button" onClick={() => setF({ ...f, milestones: f.milestones.filter((_, k) => k !== i) })} aria-label="Hapus">✕</button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input
                className="input"
                value={ms}
                onChange={(e) => setMs(e.target.value)}
                placeholder="Langkah kecil…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && ms.trim()) {
                    e.preventDefault();
                    setF({ ...f, milestones: [...f.milestones, ms.trim()] });
                    setMs("");
                  }
                }}
              />
              <button type="button" className="btn-soft" onClick={() => { if (ms.trim()) { setF({ ...f, milestones: [...f.milestones, ms.trim()] }); setMs(""); } }}>
                Tambah
              </button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}

// ------------------------------------------------------------------ Detail
function GoalDetail({ id, onClose, onEdit, onChanged }: { id: number; onClose: () => void; onEdit: (g: Goal) => void; onChanged: (r: { justCompleted?: boolean; goal?: Goal }) => void }) {
  const toast = useToast();
  const { data, reload } = useApi<Goal & { milestones: Milestone[] }>(`/api/goals/${id}`);
  const [newMs, setNewMs] = useState("");
  const [current, setCurrent] = useState<number | "">("");
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (data) setCurrent(Number(data.current_value));
  }, [data]);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      const r = (await fn()) as { justCompleted?: boolean; goal?: Goal };
      onChanged(r || {});
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <Sheet open onClose={onClose} title={data?.title || "Goal"}>
      {!data ? (
        <Skeleton className="h-56" />
      ) : (
        <div className="space-y-5 pb-2">
          {data.description && <p className="text-sm soft">{data.description}</p>}
          <div className="rounded-2xl bg-mint-50 p-4 dark:bg-night-700">
            <div className="flex items-end justify-between">
              <span className="text-sm font-semibold">Progress</span>
              <span className="font-display text-3xl font-bold text-brand-700 dark:text-mint-200">{Math.round(data.progress)}%</span>
            </div>
            <ProgressBar value={data.progress} className="mt-2 h-3" />
            <div className="mt-2 text-xs muted">
              {goalCategoryLabel(data.category)} · Priority {data.priority} · {data.deadline ? `Deadline ${formatDate(data.deadline)}` : "Tanpa deadline"}
              {data.computed_status === "overdue" && " · ⏰ lewat deadline"}
            </div>
          </div>

          {data.progress_mode === "value" && data.status !== "completed" && (
            <div>
              <span className="label">Update progress ({data.unit || "nilai"})</span>
              <div className="flex gap-2">
                <input type="number" className="input" value={current} min={0} step="any" onChange={(e) => setCurrent(e.target.value === "" ? "" : Number(e.target.value))} />
                <button
                  className="btn-primary"
                  onClick={() => run(() => api(`/api/goals/${id}`, { method: "PUT", body: { currentValue: Number(current || 0) } }))}
                >
                  Simpan
                </button>
              </div>
              <p className="mt-1 text-xs muted">Target: {data.target_value} {data.unit}</p>
            </div>
          )}

          <div>
            <span className="label">Checklist / milestones</span>
            <ul className="space-y-1.5">
              {data.milestones.map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-xl border border-[var(--line)] px-3 py-2.5">
                  <button
                    onClick={() => run(() => api(`/api/milestones/${m.id}`, { method: "PATCH", body: { isDone: !m.is_done } }))}
                    className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition", m.is_done ? "border-brand-600 bg-brand-600 text-white" : "border-[var(--line)]")}
                    aria-label={m.is_done ? "Tandai belum" : "Tandai selesai"}
                  >
                    {!!m.is_done && <Icon name="check" size={14} />}
                  </button>
                  <span className={cn("flex-1 text-sm", m.is_done && "line-through muted")}>{m.title}</span>
                  <button onClick={() => run(() => api(`/api/milestones/${m.id}`, { method: "DELETE" }))} className="muted hover:text-red-600" aria-label="Hapus">
                    <Icon name="trash" size={16} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <input className="input" value={newMs} onChange={(e) => setNewMs(e.target.value)} placeholder="Tambah milestone…" />
              <button
                className="btn-soft"
                onClick={() => newMs.trim() && run(async () => { const r = await api(`/api/goals/${id}/milestones`, { body: { title: newMs.trim() } }); setNewMs(""); return r; })}
              >
                +
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {data.status !== "completed" ? (
              <button className="btn-primary col-span-2" onClick={() => run(() => api(`/api/goals/${id}`, { method: "PUT", body: { status: "completed" } }))}>
                🎉 Tandai selesai
              </button>
            ) : (
              <button className="btn-soft col-span-2" onClick={() => run(() => api(`/api/goals/${id}`, { method: "PUT", body: { status: "in_progress" } }))}>
                Buka kembali goal
              </button>
            )}
            <button className="btn-soft" onClick={() => onEdit(data)}><Icon name="edit" size={16} /> Edit</button>
            <button className="btn-danger" onClick={() => setConfirm(true)}><Icon name="trash" size={16} /> Hapus</button>
          </div>
          <ConfirmSheet
            open={confirm}
            onClose={() => setConfirm(false)}
            title="Hapus goal ini?"
            onConfirm={async () => {
              await api(`/api/goals/${id}`, { method: "DELETE" }).catch((e) => toast(e.message, "error"));
              setConfirm(false);
              onClose();
              onChanged({});
            }}
          />
        </div>
      )}
    </Sheet>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Goals />
    </Suspense>
  );
}
