"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo, Avatar } from "@/components/brand";
import { Lumi } from "@/components/Lumi";
import { api } from "@/lib/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/login", { body: { email, password } });
      const next = params.get("next");
      // tetap pakai navigasi client agar musik tidak terputus
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? `/welcome?next=${encodeURIComponent(next)}` : "/welcome");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="label">Email</span>
        <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alya@email.com" />
      </label>
      <label className="block">
        <span className="label">Password</span>
        <div className="relative">
          <input
            className="input pr-16"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand-600">
            {show ? "Sembunyi" : "Lihat"}
          </button>
        </div>
      </label>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      <button className="btn-primary w-full py-3.5 text-base" disabled={busy}>
        {busy ? "Masuk…" : "Masuk"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 pb-[calc(env(safe-area-inset-bottom)+4rem)] pt-[calc(env(safe-area-inset-top)+2rem)]">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <Avatar name="Alya" size={96} ring />
            <div className="absolute -bottom-3 -right-8">
              <Lumi expression="happy" size={58} />
            </div>
          </div>
          <Logo withText={false} size={30} className="mb-2" />
          <h1 className="font-display text-3xl font-bold text-brand-900 dark:text-mint-100">Alya&apos;s Green Space</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">Journal · Goals · Finance · Habits · Reflection</p>
          <p className="mt-3 font-display italic soft">&ldquo;A little progress, every day.&rdquo;</p>
        </div>
        <div className="card card-pad">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
