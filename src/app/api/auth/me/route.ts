import { queryOne } from "@/lib/db";
import { ok, withAuth, notFound } from "@/lib/api";
import { unreadCount } from "@/lib/notifications";

export const GET = withAuth(async (_req, user) => {
  const u = await queryOne<Record<string, unknown>>(
    `SELECT u.id, u.full_name, u.email, u.bio, u.quote, u.photo_url, s.theme
     FROM users u LEFT JOIN user_settings s ON s.user_id = u.id WHERE u.id = ?`,
    [user.uid]
  );
  if (!u) notFound("User");
  return ok({ user: u, unread: await unreadCount(user.uid) });
});
