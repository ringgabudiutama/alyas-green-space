import { execute } from "@/lib/db";
import { idFrom, notFound, ok, withAuth } from "@/lib/api";
import { unreadCount } from "@/lib/notifications";

// PATCH → toggle read/unread
export const PATCH = withAuth(async (req, user, ctx) => {
  const id = await idFrom(ctx);
  const body = (await req.json().catch(() => ({}))) as { isRead?: boolean };
  const r = await execute("UPDATE notifications SET is_read = ? WHERE id = ? AND user_id = ?", [body.isRead === false ? 0 : 1, id, user.uid]);
  if (!r.affectedRows) notFound("Notifikasi");
  return ok({ unread: await unreadCount(user.uid) });
});

export const DELETE = withAuth(async (_req, user, ctx) => {
  const id = await idFrom(ctx);
  const r = await execute("DELETE FROM notifications WHERE id = ? AND user_id = ?", [id, user.uid]);
  if (!r.affectedRows) notFound("Notifikasi");
  return ok({ unread: await unreadCount(user.uid) });
});
