"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar, Logo } from "@/components/brand";
import { LumiBubble } from "@/components/Lumi";
import { api, cn } from "@/lib/client";
import { MOODS, type MoodKey } from "@/lib/format";
import type { LumiMessage } from "@/lib/lumi";

type Me = { user: { full_name: string; photo_url: string | null } };
type MoodGet = { mood: MoodKey | null; greeting: LumiMessage };

function Welcome() {
  const router = useRouter();
  const params = useSearchParams();
  const [me, setMe] = useState<Me["user"] | null>(null);
  const [greeting, setGreeting] = useState<LumiMessage | null>(null);
  const [mood, setMood] = useState<MoodKey | null>(null);
  const [reply, setReply] = useState<LumiMessage | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Me>("/api/auth/me").then((r) => setMe(r.user)).catch(() => {});
    api<MoodGet>("/api/mood")
      .then((r) => {
        setGreeting(r.greeting);
        if (r.mood) setMood(r.mood);
      })
      .catch(() => {});
  }, []);

  const first = me?.full_name.split(" ")[0] || "Alya";

  const pick = async (m: MoodKey) => {
    setMood(m);
    setSaving(true);
    try {
      const r = await api<{ lumi: LumiMessage }>("/api/mood", { body: { mood: m } });
      setReply(r.lumi);
    } catch {
      /* tetap lanjut */
    } finally {
      setSaving(false);
    }
  };

  const enter = () => {
    const next = params.get("next");
    router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden px-5 pb-[calc(env(safe-area-inset-bottom)+5rem)] pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      {/* dekorasi */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-mint-200/60 blur-3xl dark:bg-brand-900/40" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-sage-200/60 blur-3xl dark:bg-forest-800/40" />

      <Logo size={30} className="relative" />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
        <div className="flex flex-col items-center text-center animate-fade-up">
          <div className="relative">
            <Avatar src={me?.photo_url} name={me?.full_name || "Alya"} size={112} ring />
            <span className="absolute -bottom-1 -right-1 grid h-10 w-10 place-items-center rounded-full bg-[var(--card)] text-xl shadow-soft">👋</span>
          </div>
          <h1 className="mt-5 font-display text-3xl font-bold text-brand-900 dark:text-mint-100">Halo, {first}! 👋</h1>
          <p className="mt-1 text-lg soft">Bagaimana harimu hari ini?</p>
        </div>

        {greeting && !reply && (
          <div className="mt-6">
            <LumiBubble expression={greeting.expression} message={greeting.message} size={64} />
          </div>
        )}

        <div className="mt-6 grid grid-cols-5 gap-2">
          {MOODS.map((m, i) => (
            <button
              key={m.key}
              onClick={() => pick(m.key)}
              disabled={saving}
              style={{ animationDelay: `${i * 60}ms` }}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl border px-1 py-3 text-xs font-semibold transition animate-fade-up active:scale-95",
                mood === m.key
                  ? "border-brand-500 bg-brand-600 text-white shadow-lift"
                  : "border-[var(--line)] bg-[var(--card)] hover:-translate-y-1 hover:border-brand-300 hover:shadow-soft"
              )}
              aria-pressed={mood === m.key}
            >
              <span className="text-3xl leading-none">{m.emoji}</span>
              {m.label}
            </button>
          ))}
        </div>

        {reply && (
          <div className="mt-6">
            <LumiBubble expression={reply.expression} message={reply.message} size={72} />
          </div>
        )}

        <button onClick={enter} className={cn("btn-primary mt-8 w-full py-4 text-base", !mood && "opacity-80")}>
          Masuk ke My Space →
        </button>
        {!mood && <p className="mt-2 text-center text-xs muted">Pilih mood dulu ya, atau langsung masuk juga boleh.</p>}
      </div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense>
      <Welcome />
    </Suspense>
  );
}
