"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import { Avatar, Logo } from "./brand";
import { Sheet } from "./ui";
import { useTheme, ThemeSync } from "./theme";
import { api, cn } from "@/lib/client";

// ------------------------------------------------------------------ User context
export type ShellUser = { id: number; full_name: string; email: string; photo_url: string | null; quote: string | null; theme: "light" | "dark" | null };
const UserCtx = createContext<{ user: ShellUser; setUser: (u: Partial<ShellUser>) => void; unread: number; setUnread: (n: number) => void }>(
  null as never
);
export const useShell = () => useContext(UserCtx);

// ------------------------------------------------------------------ Navigation
const NAV = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/journal", label: "Journal", icon: "journal" },
  { href: "/reflection", label: "Reflection", icon: "reflect" },
  { href: "/goals", label: "Goals", icon: "target" },
  { href: "/savings", label: "Saving Goals", icon: "piggy" },
  { href: "/finance", label: "Finance", icon: "wallet" },
  { href: "/habits", label: "Habits", icon: "habit" },
  { href: "/progress", label: "Progress", icon: "chart" },
  { href: "/recap", label: "Month in Review", icon: "calendar" },
  { href: "/recap/yearly", label: "Yearly Recap", icon: "sparkle" },
  { href: "/reports", label: "Export PDF", icon: "file" },
];
const NAV_BOTTOM = [
  { href: "/notifications", label: "Notifications", icon: "bell" },
  { href: "/profile", label: "Profile", icon: "user" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

const TITLES: Record<string, string> = Object.fromEntries([...NAV, ...NAV_BOTTOM].map((n) => [n.href, n.label]));
function titleFor(path: string) {
  if (path.startsWith("/journal/new")) return "New Journal";
  if (path.startsWith("/journal/")) return "Journal";
  if (path.startsWith("/finance/transactions")) return "Transactions";
  return TITLES[path] || "Green Space";
}
const isActive = (path: string, href: string) =>
  href === "/dashboard" ? path === href : href === "/recap" ? path === "/recap" : path === href || path.startsWith(href + "/");

const QUICK = [
  { href: "/journal/new", label: "Tulis Journal", icon: "journal", sub: "Ceritakan harimu" },
  { href: "/finance/transactions?new=1", label: "Catat Transaksi", icon: "wallet", sub: "Income / expense" },
  { href: "/habits", label: "Check-in Habit", icon: "habit", sub: "Centang habit hari ini" },
  { href: "/goals?new=1", label: "Goal Baru", icon: "target", sub: "Tentukan target" },
  { href: "/reflection", label: "Daily Reflection", icon: "reflect", sub: "Renungkan hari ini" },
  { href: "/savings", label: "Setor Tabungan", icon: "piggy", sub: "Saving goals" },
];

export function AppShell({ initialUser, initialUnread, children }: { initialUser: ShellUser; initialUnread: number; children: ReactNode }) {
  const [user, setUserState] = useState(initialUser);
  const [unread, setUnread] = useState(initialUnread);
  const [quickOpen, setQuickOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const path = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const setUser = useCallback((u: Partial<ShellUser>) => setUserState((p) => ({ ...p, ...u })), []);

  // polling badge notifikasi
  useEffect(() => {
    let alive = true;
    const tick = () =>
      api<{ unread: number }>("/api/notifications?limit=1")
        .then((r) => alive && setUnread(r.unread))
        .catch(() => {});
    const t = setInterval(tick, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    setQuickOpen(false);
    setMenuOpen(false);
  }, [path]);

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
    router.refresh();
  };

  const first = user.full_name.split(" ")[0] || "Alya";
  const onDashboard = path === "/dashboard";

  return (
    <UserCtx.Provider value={{ user, setUser, unread, setUnread }}>
      <ThemeSync theme={user.theme} />
      <div className="has-bottom-nav min-h-dvh lg:flex">
        {/* ============ Sidebar (desktop / tablet landscape) ============ */}
        <aside className="sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col border-r border-[var(--line)] bg-[var(--card)] px-4 py-6 lg:flex">
          <Link href="/dashboard" className="px-2">
            <Logo />
          </Link>
          <Link href="/profile" className="mt-6 flex items-center gap-3 rounded-2xl bg-mint-50 p-3 transition hover:bg-mint-100 dark:bg-night-700 dark:hover:bg-night-600">
            <Avatar src={user.photo_url} name={user.full_name} size={44} />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-brand-900 dark:text-mint-100">{user.full_name}</div>
              <div className="truncate text-xs muted">{user.quote || "A little progress, every day."}</div>
            </div>
          </Link>
          <nav className="mt-5 flex-1 space-y-0.5 overflow-y-auto">
            {NAV.map((n) => (
              <NavLink key={n.href} {...n} active={isActive(path, n.href)} />
            ))}
            <div className="my-3 border-t border-[var(--line)]" />
            {NAV_BOTTOM.map((n) => (
              <NavLink key={n.href} {...n} active={isActive(path, n.href)} badge={n.href === "/notifications" ? unread : 0} />
            ))}
          </nav>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="btn-soft flex-1" aria-label="Ganti tema">
              <Icon name={theme === "dark" ? "sun" : "moon"} size={16} /> {theme === "dark" ? "Light" : "Dark"}
            </button>
            <button onClick={logout} className="btn-ghost" aria-label="Logout">
              <Icon name="logout" size={16} />
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* ============ Top app bar ============ */}
          <header className="glass sticky top-0 z-40 border-b border-[var(--line)] pt-[env(safe-area-inset-top)]">
            <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:h-16">
              <Link href="/profile" className="lg:hidden" aria-label="Profil">
                <Avatar src={user.photo_url} name={user.full_name} size={34} />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-base font-semibold text-brand-900 dark:text-mint-100 lg:text-lg">
                  {onDashboard ? `Hi, ${first} 🌿` : titleFor(path)}
                </div>
              </div>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="grid h-10 w-10 place-items-center rounded-full hover:bg-mint-100 dark:hover:bg-night-600 lg:hidden"
                aria-label="Ganti tema"
              >
                <Icon name={theme === "dark" ? "sun" : "moon"} />
              </button>
              <NotificationBell unread={unread} setUnread={setUnread} />
            </div>
          </header>

          <main key={path} className="page-enter mx-auto max-w-6xl px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-5 sm:px-6 lg:pb-16 lg:pt-8">
            {children}
          </main>
        </div>

        {/* ============ Bottom tab bar (HP & tablet) ============ */}
        <nav className="glass fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Navigasi utama">
          <div className="mx-auto grid h-[68px] max-w-lg grid-cols-5 items-center px-2">
            <TabLink href="/dashboard" icon="home" label="Home" active={isActive(path, "/dashboard")} />
            <TabLink href="/journal" icon="journal" label="Journal" active={isActive(path, "/journal")} />
            <div className="flex justify-center">
              <button
                onClick={() => setQuickOpen(true)}
                className="-mt-7 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lift ring-4 ring-[var(--bg)] transition active:scale-95"
                aria-label="Tambah cepat"
              >
                <Icon name="plus" size={26} />
              </button>
            </div>
            <TabLink href="/finance" icon="wallet" label="Finance" active={isActive(path, "/finance")} />
            <button
              onClick={() => setMenuOpen(true)}
              className={cn("flex flex-col items-center gap-0.5 py-1 text-[11px] font-semibold", menuOpen ? "text-brand-700 dark:text-mint-200" : "muted")}
            >
              <Icon name="grid" size={22} />
              Menu
            </button>
          </div>
        </nav>

        {/* Quick add sheet */}
        <Sheet open={quickOpen} onClose={() => setQuickOpen(false)} title="Mau catat apa, Alya?">
          <div className="grid grid-cols-2 gap-3 pb-2">
            {QUICK.map((q) => (
              <Link key={q.href} href={q.href} className="card flex flex-col gap-2 p-4 transition active:scale-[0.98]">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint-100 text-brand-700 dark:bg-night-600 dark:text-mint-200">
                  <Icon name={q.icon} />
                </span>
                <span className="text-sm font-bold">{q.label}</span>
                <span className="-mt-1 text-xs muted">{q.sub}</span>
              </Link>
            ))}
          </div>
        </Sheet>

        {/* Menu sheet (semua halaman) */}
        <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu">
          <Link href="/profile" className="mb-4 flex items-center gap-3 rounded-2xl bg-mint-50 p-3 dark:bg-night-700">
            <Avatar src={user.photo_url} name={user.full_name} size={52} />
            <div className="min-w-0">
              <div className="truncate font-bold text-brand-900 dark:text-mint-100">{user.full_name}</div>
              <div className="truncate text-xs muted">{user.email}</div>
            </div>
          </Link>
          <div className="grid grid-cols-3 gap-2.5 pb-2 sm:grid-cols-4">
            {[...NAV.slice(2), ...NAV_BOTTOM].map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center text-[11px] font-semibold transition active:scale-95",
                  isActive(path, n.href) ? "bg-brand-600 text-white" : "bg-mint-50 text-brand-800 dark:bg-night-700 dark:text-mint-100"
                )}
              >
                <Icon name={n.icon} size={22} />
                {n.label}
                {n.href === "/notifications" && unread > 0 && (
                  <span className="absolute right-2 top-2 grid h-5 min-w-5 place-items-center rounded-full bg-amberSoft-500 px-1 text-[10px] text-white">{unread}</span>
                )}
              </Link>
            ))}
          </div>
          <button onClick={logout} className="btn-danger mt-3 w-full">
            <Icon name="logout" size={16} /> Logout
          </button>
        </Sheet>
      </div>
    </UserCtx.Provider>
  );
}

function NavLink({ href, label, icon, active, badge = 0 }: { href: string; label: string; icon: string; active: boolean; badge?: number }) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        active ? "bg-brand-600 text-white shadow-soft" : "text-[var(--ink-soft)] hover:bg-mint-100 hover:text-brand-800 dark:hover:bg-night-600 dark:hover:text-mint-100"
      )}
    >
      <Icon name={icon} size={18} className="transition group-hover:scale-110" />
      <span className="flex-1">{label}</span>
      {badge > 0 && <span className="rounded-full bg-amberSoft-500 px-2 py-0.5 text-[10px] font-bold text-white">{badge}</span>}
    </Link>
  );
}

function TabLink({ href, icon, label, active }: { href: string; icon: string; label: string; active: boolean }) {
  return (
    <Link href={href} className={cn("flex flex-col items-center gap-0.5 py-1 text-[11px] font-semibold transition", active ? "text-brand-700 dark:text-mint-200" : "muted")}>
      <span className={cn("grid h-8 w-12 place-items-center rounded-full transition", active && "bg-mint-100 dark:bg-night-600")}>
        <Icon name={icon} size={22} />
      </span>
      {label}
    </Link>
  );
}

// ------------------------------------------------------------------ Bell
type Notif = { id: number; type: string; title: string; message: string; link: string | null; is_read: number; created_at: string };

function NotificationBell({ unread, setUnread }: { unread: number; setUnread: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[] | null>(null);
  const [ring, setRing] = useState(false);
  const prev = useRef(unread);
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (unread > prev.current) {
      setRing(true);
      setTimeout(() => setRing(false), 900);
    }
    prev.current = unread;
  }, [unread]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const toggle = async () => {
    if (window.matchMedia("(max-width: 1023px)").matches) return router.push("/notifications");
    const next = !open;
    setOpen(next);
    if (next) {
      const r = await api<{ items: Notif[]; unread: number }>("/api/notifications?limit=6").catch(() => null);
      if (r) {
        setItems(r.items);
        setUnread(r.unread);
      }
    }
  };

  const markAll = async () => {
    await api("/api/notifications", { method: "PATCH" });
    setUnread(0);
    setItems((it) => it?.map((n) => ({ ...n, is_read: 1 })) ?? null);
  };

  return (
    <div className="relative" ref={box}>
      <button onClick={toggle} className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-mint-100 dark:hover:bg-night-600" aria-label={`Notifikasi, ${unread} belum dibaca`}>
        <Icon name="bell" className={cn(ring && "animate-ring")} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-amberSoft-500 px-1 text-[10px] font-bold text-white animate-pop">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="card absolute right-0 top-12 z-50 w-[360px] overflow-hidden p-0 animate-pop">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
            <span className="font-display font-semibold">Notifications</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs font-semibold text-brand-600 hover:underline">
                Tandai semua dibaca
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!items && <div className="p-4 text-sm muted">Memuat…</div>}
            {items?.length === 0 && <div className="p-6 text-center text-sm muted">Belum ada notifikasi 🌱</div>}
            {items?.map((n) => (
              <Link
                key={n.id}
                href={n.link || "/notifications"}
                onClick={() => {
                  setOpen(false);
                  if (!n.is_read) api(`/api/notifications/${n.id}`, { method: "PATCH", body: { isRead: true } }).then((r) => setUnread((r as { unread: number }).unread)).catch(() => {});
                }}
                className={cn("block border-b border-[var(--line)] px-4 py-3 text-sm transition hover:bg-mint-50 dark:hover:bg-night-700", !n.is_read && "bg-mint-50/70 dark:bg-night-700/60")}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {!n.is_read && <span className="h-2 w-2 rounded-full bg-amberSoft-500" />}
                  {n.title}
                </div>
                <div className="mt-0.5 soft">{n.message}</div>
              </Link>
            ))}
          </div>
          <Link href="/notifications" onClick={() => setOpen(false)} className="block py-3 text-center text-xs font-semibold text-brand-600 hover:bg-mint-50 dark:hover:bg-night-700">
            Lihat semua
          </Link>
        </div>
      )}
    </div>
  );
}
