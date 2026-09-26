import { execute, query } from "@/lib/db";
import { ok, withAuth } from "@/lib/api";
import { runDailyChecks, unreadCount } from "@/lib/notifications";

// GET /api/notifications?filter=unread&limit=
export const GET = withAuth(async (req, user) => {
  await runDailyChecks(user.uid).catch((e) => console.error("dailyChecks", e));
  const unreadOnly = req.nextUrl.searchParams.get("filter") === "unread";
  const limit = Math.min(100, Number(req.nextUrl.searchParams.get("limit")) || 30);
  const items = await query(
    `SELECT id, type, title, message, link, is_read, created_at FROM notifications
     WHERE user_id = ? ${unreadOnly ? "AND is_read = 0" : ""} ORDER BY created_at DESC, id DESC LIMIT ?`,
    [user.uid, limit]
  );
  return ok({ items, unread: await unreadCount(user.uid) });
});

// PATCH → tandai semua sudah dibaca
export const PATCH = withAuth(async (_req, user) => {
  await execute("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0", [user.uid]);
  return ok({ unread: 0 });
});

// DELETE → hapus semua yang sudah dibaca
export const DELETE = withAuth(async (_req, user) => {
  await execute("DELETE FROM notifications WHERE user_id = ? AND is_read = 1", [user.uid]);
  return ok({ unread: await unreadCount(user.uid) });
});
