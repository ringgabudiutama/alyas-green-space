import { query } from "@/lib/db";
import { ok, withAuth } from "@/lib/api";

export const GET = withAuth(async (_req, user) => {
  const items = await query(
    "SELECT id, name, type, icon FROM categories WHERE user_id IS NULL OR user_id = ? ORDER BY user_id IS NOT NULL, id",
    [user.uid]
  );
  return ok({ items });
});
