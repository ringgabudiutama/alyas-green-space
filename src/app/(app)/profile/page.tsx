"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, uploadImage, useApi } from "@/lib/client";
import { Card, Field, PageHeader, Skeleton, useToast } from "@/components/ui";
import { Avatar } from "@/components/brand";
import { Icon } from "@/components/Icon";
import { useShell } from "@/components/AppShell";

type U = { full_name: string; email: string; bio: string | null; quote: string | null; photo_url: string | null };

export default function ProfilePage() {
  const toast = useToast();
  const router = useRouter();
  const { setUser } = useShell();
  const { data } = useApi<{ user: U }>("/api/profile");
  const [f, setF] = useState<U | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data) setF(data.user);
  }, [data]);

  if (!f) return <Skeleton className="h-96" />;

  const onPhoto = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setF({ ...f, photo_url: url });
      await api("/api/profile", { method: "PUT", body: { fullName: f.full_name, email: f.email, bio: f.bio, quote: f.quote, photoUrl: url } });
      setUser({ photo_url: url });
      toast("Foto profil diperbarui 📸");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      await api("/api/profile", { method: "PUT", body: { fullName: f.full_name, email: f.email, bio: f.bio, quote: f.quote, photoUrl: f.photo_url } });
      setUser({ full_name: f.full_name, email: f.email, quote: f.quote, photo_url: f.photo_url });
      toast("Profil tersimpan 🌿");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const changePw = async () => {
    try {
      await api("/api/profile/password", { method: "PUT", body: pw });
      setPw({ currentPassword: "", newPassword: "" });
      toast("Password berhasil diganti 🔒");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Profile" />
      <Card className="flex flex-col items-center text-center">
        <div className="relative">
          <Avatar src={f.photo_url} name={f.full_name} size={120} ring />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="absolute bottom-1 right-1 grid h-10 w-10 place-items-center rounded-full bg-brand-600 text-white shadow-lift" aria-label="Ganti foto">
            <Icon name="camera" size={18} />
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
        </div>
        <h2 className="mt-4 font-display text-2xl font-bold">{f.full_name}</h2>
        {f.quote && <p className="mt-1 font-display italic soft">&ldquo;{f.quote}&rdquo;</p>}
        {uploading && <p className="mt-2 text-xs muted">Mengunggah foto…</p>}
      </Card>
      <Card className="space-y-4">
        <Field label="Nama lengkap"><input className="input" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></Field>
        <Field label="Email"><input type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Short bio"><textarea className="input min-h-[80px]" value={f.bio ?? ""} onChange={(e) => setF({ ...f, bio: e.target.value })} /></Field>
        <Field label="Personal quote"><input className="input" value={f.quote ?? ""} onChange={(e) => setF({ ...f, quote: e.target.value })} /></Field>
        <button className="btn-primary w-full py-3" onClick={save} disabled={busy}>{busy ? "Menyimpan…" : "Simpan profil"}</button>
      </Card>
      <Card className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Ganti password</h2>
        <Field label="Password saat ini"><input type="password" className="input" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
        <Field label="Password baru" hint="Min. 8 karakter, ada huruf & angka."><input type="password" className="input" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
        <button className="btn-soft w-full" onClick={changePw} disabled={!pw.currentPassword || !pw.newPassword}>Ganti password</button>
      </Card>
      <Link href="/settings" className="card flex items-center justify-between p-4 font-semibold"><span className="flex items-center gap-3"><Icon name="settings" /> Settings</span><Icon name="back" className="rotate-180" /></Link>
    </div>
  );
}
