import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { unreadCount } from "@/lib/notifications";
import { AppShell, type ShellUser } from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await queryOne<ShellUser>(
    `SELECT u.id, u.full_name, u.email, u.photo_url, u.quote, s.theme
     FROM users u LEFT JOIN user_settings s ON s.user_id = u.id WHERE u.id = ?`,
    [session.uid]
  );
  if (!user) redirect("/login");
  const unread = await unreadCount(session.uid);
  return (
    <AppShell initialUser={user} initialUnread={unread}>
      {children}
    </AppShell>
  );
}
