"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, useApi } from "@/lib/client";
import { Card, PageHeader, Segmented, Skeleton, Toggle, useToast } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useTheme } from "@/components/theme";

type S = { notify_journal: number; notify_goal: number; notify_habit: number; notify_finance: number };

export default function SettingsPage() {
  const toast = useToast();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { data, setData } = useApi<{ settings: S }>("/api/settings");

  const set = async (key: keyof S, apiKey: string, v: boolean) => {
    if (!data) return;
    setData({ settings: { ...data.settings, [key]: v ? 1 : 0 } });
    await api("/api/settings", { method: "PUT", body: { [apiKey]: v } }).catch((e) => toast(e.message, "error"));
  };
  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Settings" />
      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">Appearance</h2>
        <Segmented value={theme} onChange={setTheme} options={[{ value: "light", label: "☀️ Light Mode" }, { value: "dark", label: "🌙 Dark Mode" }]} />
      </Card>
      <Card>
        <h2 className="font-display text-lg font-semibold">Notification</h2>
        {!data ? <Skeleton className="mt-3 h-40" /> : (
          <div className="divide-y divide-[var(--line)]">
            <Toggle checked={!!data.settings.notify_journal} onChange={(v) => set("notify_journal", "notifyJournal", v)} label="Journal reminder" sub="Diingatkan jam 18.00 kalau belum menulis" />
            <Toggle checked={!!data.settings.notify_goal} onChange={(v) => set("notify_goal", "notifyGoal", v)} label="Goal reminder" sub="Progress 80% & deadline" />
            <Toggle checked={!!data.settings.notify_habit} onChange={(v) => set("notify_habit", "notifyHabit", v)} label="Habit reminder" sub="Diingatkan jam 19.00 untuk habit yang belum" />
            <Toggle checked={!!data.settings.notify_finance} onChange={(v) => set("notify_finance", "notifyFinance", v)} label="Financial reminder" sub="Ringkasan bulanan & budget" />
          </div>
        )}
      </Card>
      <Card className="space-y-2">
        <h2 className="mb-1 font-display text-lg font-semibold">Account</h2>
        <Link href="/profile" className="btn-soft w-full justify-start"><Icon name="user" size={16} /> Edit profile & change password</Link>
        <button onClick={logout} className="btn-danger w-full justify-start"><Icon name="logout" size={16} /> Logout</button>
      </Card>
      <Card className="space-y-2">
        <h2 className="mb-1 font-display text-lg font-semibold">Data</h2>
        <Link href="/reports" className="btn-soft w-full justify-start"><Icon name="file" size={16} /> Export PDF</Link>
        <a href="/api/export" className="btn-soft w-full justify-start"><Icon name="download" size={16} /> Export personal data (JSON)</a>
      </Card>
      <p className="pb-4 text-center text-xs muted">Alya&apos;s Green Space · Ciptaan Ringga 🌿</p>
    </div>
  );
}
